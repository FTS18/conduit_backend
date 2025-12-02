import slugify from 'slugify';
import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import profileMapper from '../profile/profile.utils';
import articleMapper from './article.mapper';
import { Tag } from '../tag/tag.model';
import {
  getCachedQuery,
  setCachedQuery,
  invalidateCacheByPattern,
} from '../../services/query-cache.service';

const buildFindAllQuery = (query: any, id: number | undefined) => {
  const queries: any = [];

  if ('author' in query) {
    queries.push({
      author: {
        username: {
          equals: query.author,
        },
      },
    });
  } else {
    // Show all articles in global feed
    queries.push({});
  }

  if ('tag' in query) {
    queries.push({
      tagList: {
        some: {
          name: query.tag,
        },
      },
    });
  }

  if ('favorited' in query) {
    queries.push({
      favoritedBy: {
        some: {
          username: {
            equals: query.favorited,
          },
        },
      },
    });
  }

  if ('search' in query && query.search) {
    const searchTerm = (query.search as string).trim();

    // Use PostgreSQL full-text search for better performance
    if (searchTerm.length > 2) {
      queries.push({
        OR: [
          {
            title: { search: searchTerm },
          },
          {
            description: { search: searchTerm },
          },
          {
            body: { search: searchTerm },
          },
          {
            author: { username: { contains: searchTerm, mode: 'insensitive' } },
          },
        ],
      });
    }
  }

  if ('fromDate' in query || 'toDate' in query) {
    const dateFilter: any = {};
    if (query.fromDate) {
      dateFilter.gte = new Date(query.fromDate);
    }
    if (query.toDate) {
      dateFilter.lte = new Date(query.toDate);
    }
    queries.push({
      createdAt: dateFilter,
    });
  }

  return queries;
};

export const getArticles = async (query: any, id?: number) => {
  // Check cache for full list requests (first page, no filters)
  const isCacheable =
    !query.author &&
    !query.tag &&
    !query.favorited &&
    !query.search &&
    !query.fromDate &&
    !query.toDate;
  const offset = Number(query.offset) || 0;
  const limit = Math.min(Number(query.limit) || 10, 100);

  if (isCacheable && offset === 0 && limit === 10) {
    const cacheKey = `articles:list:page1:user${id || 'anon'}`;
    const cached = getCachedQuery(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const andQueries = buildFindAllQuery(query, id);

  // Parallel database calls for count and articles
  const [articlesCount, articles] = await Promise.all([
    prisma.article.count({
      where: {
        AND: andQueries,
      },
    }),
    prisma.article.findMany({
      where: { AND: andQueries },
      skip: offset,
      take: limit,
      orderBy: [
        { createdAt: 'desc' }, // Sort by date at DB level for efficiency
      ],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        tagList: {
          select: {
            name: true,
          },
        },
        author: {
          select: {
            username: true,
            bio: true,
            image: true,
            followedBy: id
              ? {
                  where: { id: id },
                  select: { id: true },
                }
              : undefined,
          },
        },
        favoritedBy: id
          ? {
              where: { id: id },
              select: { id: true },
            }
          : undefined,
        bookmarks: id
          ? {
              where: { userId: id },
              select: { id: true },
            }
          : undefined,
        _count: {
          select: {
            favoritedBy: true,
            bookmarks: true,
            comments: true,
          },
        },
      },
    }),
  ]);

  const result = {
    articles: articles
      .filter((article: any) => article && article.slug)
      .map((article: any) => {
        try {
          return articleMapper(article, id);
        } catch (err) {
          console.error('Error mapping article:', {
            slug: article?.slug,
            error: err,
          });
          return null;
        }
      })
      .filter((article: any) => article !== null),
    articlesCount,
  };

  // TODO: Re-enable caching after fixing invalidation for follow/upvote/downvote operations
  // Currently disabled because cache doesn't invalidate on user actions
  // if (isCacheable && offset === 0 && limit === 10) {
  //   const cacheKey = `articles:list:page1:user${id || 'anon'}`;
  //   setCachedQuery(cacheKey, result, 5 * 60 * 1000);
  // }

  return result;
};

export const getFeed = async (offset: number, limit: number, id: number) => {
  const articlesCount = await prisma.article.count({
    where: {
      author: {
        followedBy: { some: { id: id } },
      },
    },
  });

  const articles = await prisma.article.findMany({
    where: {
      author: {
        followedBy: { some: { id: id } },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip: offset || 0,
    take: limit || 10,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      tagList: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: id
            ? {
                where: { id: id },
                select: { id: true },
              }
            : undefined,
        },
      },
      favoritedBy: id
        ? {
            where: { id: id },
            select: { id: true },
          }
        : undefined,
      bookmarks: id
        ? {
            where: { userId: id },
            select: { id: true },
          }
        : undefined,
      _count: {
        select: {
          favoritedBy: true,
          bookmarks: true,
          comments: true,
        },
      },
    },
  });

  // Filter out any undefined articles and map them
  const validArticles = articles
    .filter((a) => a && a.slug)
    .map((article: any) => articleMapper(article, id));

  return {
    articles: validArticles,
    articlesCount,
  };
};

export const createArticle = async (article: any, id: number) => {
  const { title, description, body, tagList } = article;
  const tags = Array.isArray(tagList) ? tagList : [];

  if (!title) {
    throw new HttpException(422, { errors: { title: ["can't be blank"] } });
  }

  if (!description) {
    throw new HttpException(422, {
      errors: { description: ["can't be blank"] },
    });
  }

  if (!body) {
    throw new HttpException(422, { errors: { body: ["can't be blank"] } });
  }

  const slug = `${slugify(title)}-${id}`;

  const existingTitle = await prisma.article.findUnique({
    where: {
      slug,
    },
    select: {
      slug: true,
    },
  });

  if (existingTitle) {
    throw new HttpException(422, { errors: { title: ['must be unique'] } });
  }

  const createdArticle = await prisma.article.create({
    data: {
      title,
      description,
      body,
      slug,
      tagList: {
        connectOrCreate: tags.map((tag: string) => ({
          create: { name: tag },
          where: { name: tag },
        })),
      },
      author: {
        connect: {
          id: id,
        },
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      tagList: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: {
            where: { id: id },
            select: { id: true },
          },
        },
      },
      favoritedBy: {
        where: { id: id },
        select: { id: true },
      },
      bookmarks: {
        where: { userId: id },
        select: { id: true },
      },
      _count: {
        select: {
          favoritedBy: true,
          bookmarks: true,
          comments: true,
        },
      },
    },
  });

  // Invalidate article list cache when new article is created
  invalidateCacheByPattern('^articles:list');
  invalidateCacheByPattern('^tags:');

  return articleMapper(createdArticle, id);
};

export const getArticle = async (slug: string, id?: number) => {
  const article = await prisma.article.findUnique({
    where: {
      slug,
    },
    include: {
      tagList: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
      favoritedBy: true,
      bookmarks: id
        ? {
            where: { userId: id },
            select: { id: true },
          }
        : undefined,
      _count: {
        select: {
          favoritedBy: true,
        },
      },
    },
  });

  if (!article) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  return articleMapper(article, id);
};

const disconnectArticlesTags = async (slug: string) => {
  await prisma.article.update({
    where: {
      slug,
    },
    data: {
      tagList: {
        set: [],
      },
    },
  });
};

export const updateArticle = async (article: any, slug: string, id: number) => {
  let newSlug = null;

  const existingArticle = await prisma.article.findFirst({
    where: {
      slug,
    },
    select: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!existingArticle) {
    throw new HttpException(404, {});
  }

  if (existingArticle.author.id !== id) {
    throw new HttpException(403, {
      message: 'You are not authorized to update this article',
    });
  }

  if (article.title) {
    newSlug = `${slugify(article.title)}-${id}`;

    if (newSlug !== slug) {
      const existingTitle = await prisma.article.findFirst({
        where: {
          slug: newSlug,
        },
        select: {
          slug: true,
        },
      });

      if (existingTitle) {
        throw new HttpException(422, { errors: { title: ['must be unique'] } });
      }
    }
  }

  const tagList =
    Array.isArray(article.tagList) && article.tagList?.length
      ? article.tagList.map((tag: string) => ({
          create: { name: tag },
          where: { name: tag },
        }))
      : [];

  await disconnectArticlesTags(slug);

  const updatedArticle = await prisma.article.update({
    where: {
      slug,
    },
    data: {
      ...(article.title ? { title: article.title } : {}),
      ...(article.body ? { body: article.body } : {}),
      ...(article.description ? { description: article.description } : {}),
      ...(newSlug ? { slug: newSlug } : {}),
      updatedAt: new Date(),
      tagList: {
        connectOrCreate: tagList,
      },
    },
    include: {
      tagList: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
      favoritedBy: true,
      bookmarks: true,
      _count: {
        select: {
          favoritedBy: true,
        },
      },
    },
  });

  return articleMapper(updatedArticle, id);
};

export const deleteArticle = async (slug: string, id: number) => {
  const existingArticle = await prisma.article.findFirst({
    where: {
      slug,
    },
    select: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!existingArticle) {
    throw new HttpException(404, {});
  }

  if (existingArticle.author.id !== id) {
    throw new HttpException(403, {
      message: 'You are not authorized to delete this article',
    });
  }
  await prisma.article.delete({
    where: {
      slug,
    },
  });
};

// Batch load all comments for an article with replies in 2 queries instead of N queries
const getCommentsWithRepliesBatch = async (
  articleId: number,
  userId?: number
) => {
  // Query 1: Get all comments for the article
  const allComments = await prisma.comment.findMany({
    where: { articleId },
    include: {
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
      votes: true,
    },
  });

  // Organize comments by whether they're top-level or replies
  const commentMap = new Map();
  const topLevelComments: any[] = [];

  allComments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
    if (!comment.parentCommentId) {
      topLevelComments.push(comment.id);
    }
  });

  // Build reply tree in memory (O(n) instead of N queries)
  allComments.forEach((comment) => {
    if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
      commentMap
        .get(comment.parentCommentId)
        .replies.push(commentMap.get(comment.id));
    }
  });

  // Return only top-level comments with replies nested
  return topLevelComments.map((id) => commentMap.get(id));
};

const formatComment = (comment: any, userId?: number): any => ({
  id: comment.id,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  body: comment.body,
  author: {
    username: comment.author.username,
    bio: comment.author.bio,
    image: comment.author.image,
    following: comment.author.followedBy.some(
      (follow: any) => follow.id === userId
    ),
  },
  upvotes: comment.votes?.filter((v: any) => v.value === 1).length || 0,
  downvotes: comment.votes?.filter((v: any) => v.value === -1).length || 0,
  userVote: comment.votes?.find((v: any) => v.userId === userId)?.value || 0,
  replies: comment.replies
    ? comment.replies.map((r: any) => formatComment(r, userId))
    : [],
});

// Recursive function to fetch nested replies with votes
const fetchCommentsRecursive = async (
  parentCommentId: number | null = null
): Promise<any[]> => {
  const comments = await prisma.comment.findMany({
    where: {
      parentCommentId: parentCommentId,
    },
    include: {
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
      votes: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Recursively fetch replies for each comment
  return Promise.all(
    comments.map(async (comment) => ({
      ...comment,
      replies: await fetchCommentsRecursive(comment.id),
    }))
  );
};

export const getCommentsByArticle = async (slug: string, id?: number) => {
  const article = await prisma.article.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
    },
  });

  if (!article) {
    return [];
  }

  // Use batch loading instead of recursive queries
  const comments = await getCommentsWithRepliesBatch(article.id, id);

  const result = comments.map((comment: any) => formatComment(comment, id));
  return result;
};

const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
};

export const addComment = async (
  body: string,
  slug: string,
  id: number,
  parentCommentId?: number
) => {
  if (!body) {
    throw new HttpException(422, { errors: { body: ["can't be blank"] } });
  }

  const article = await prisma.article.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  const comment = await prisma.comment.create({
    data: {
      body,
      article: {
        connect: {
          id: article?.id,
        },
      },
      author: {
        connect: {
          id: id,
        },
      },
      ...(parentCommentId && {
        parentComment: {
          connect: {
            id: parentCommentId,
          },
        },
      }),
    },
    include: {
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
      votes: true,
    },
  });

  const mentions = extractMentions(body);
  if (mentions.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: {
        username: {
          in: mentions,
        },
      },
      select: {
        id: true,
        username: true,
      },
    });

    for (const user of mentionedUsers) {
      await prisma.notification.create({
        data: {
          type: 'mention',
          message: `@${comment.author.username} mentioned you in a comment`,
          user: {
            connect: {
              id: user.id,
            },
          },
          fromUser: {
            connect: {
              id: id,
            },
          },
          comment: {
            connect: {
              id: comment.id,
            },
          },
        },
      });
    }
  }

  if (article && article.authorId !== id) {
    await prisma.notification.create({
      data: {
        type: 'comment',
        message: 'commented on your article',
        user: {
          connect: {
            id: article.authorId,
          },
        },
        fromUser: {
          connect: {
            id,
          },
        },
        comment: {
          connect: {
            id: comment.id,
          },
        },
      },
    });
  }

  if (parentCommentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentCommentId },
      select: { authorId: true },
    });

    if (
      parentComment &&
      parentComment.authorId !== id &&
      parentComment.authorId !== article?.authorId
    ) {
      await prisma.notification.create({
        data: {
          type: 'comment',
          message: 'replied to your comment',
          user: {
            connect: {
              id: parentComment.authorId,
            },
          },
          fromUser: {
            connect: {
              id,
            },
          },
          comment: {
            connect: {
              id: comment.id,
            },
          },
        },
      });
    }
  }

  return {
    id: comment.id,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    body: comment.body,
    author: {
      username: comment.author.username,
      bio: comment.author.bio,
      image: comment.author.image,
      following: comment.author.followedBy.some(
        (follow: any) => follow.id === id
      ),
    },
    upvotes: comment.votes.filter((v: any) => v.value === 1).length,
    downvotes: comment.votes.filter((v: any) => v.value === -1).length,
    userVote: comment.votes.find((v: any) => v.userId === id)?.value || 0,
    replies: [],
  };
};

export const deleteComment = async (id: number, userId: number) => {
  const comment = await prisma.comment.findFirst({
    where: {
      id,
      author: {
        id: userId,
      },
    },
    select: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException(404, {});
  }

  if (comment.author.id !== userId) {
    throw new HttpException(403, {
      message: 'You are not authorized to delete this comment',
    });
  }

  await prisma.comment.delete({
    where: {
      id,
    },
  });
};

export const favoriteArticle = async (slugPayload: string, id: number) => {
  const { _count, ...article } = await prisma.article.update({
    where: {
      slug: slugPayload,
    },
    data: {
      favoritedBy: {
        connect: {
          id: id,
        },
      },
    },
    include: {
      tagList: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
          id: true,
        },
      },
      favoritedBy: true,
      bookmarks: true,
      _count: {
        select: {
          favoritedBy: true,
        },
      },
    },
  });

  const result = {
    ...article,
    author: profileMapper(article.author, id),
    tagList: article?.tagList.map((tag: Tag) => tag.name),
    favorited: article.favoritedBy.some(
      (favorited: any) => favorited.id === id
    ),
    favoritesCount: _count?.favoritedBy,
    bookmarked: article.bookmarks
      ? article.bookmarks.some((bookmark: any) => bookmark.userId === id)
      : false,
  };

  if (article.author.id !== id) {
    await prisma.notification.create({
      data: {
        type: 'favorite',
        message: 'favorited your article',
        user: {
          connect: {
            id: article.author.id,
          },
        },
        fromUser: {
          connect: {
            id,
          },
        },
        comment: undefined,
      },
    });
  }

  return result;
};

export const unfavoriteArticle = async (slugPayload: string, id: number) => {
  const { _count, ...article } = await prisma.article.update({
    where: {
      slug: slugPayload,
    },
    data: {
      favoritedBy: {
        disconnect: {
          id: id,
        },
      },
    },
    include: {
      tagList: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
      favoritedBy: true,
      bookmarks: true,
      _count: {
        select: {
          favoritedBy: true,
        },
      },
    },
  });

  const result = {
    ...article,
    author: profileMapper(article.author, id),
    tagList: article?.tagList.map((tag: Tag) => tag.name),
    favorited: article.favoritedBy.some(
      (favorited: any) => favorited.id === id
    ),
    favoritesCount: _count?.favoritedBy,
    bookmarked: article.bookmarks
      ? article.bookmarks.some((bookmark: any) => bookmark.userId === id)
      : false,
  };

  return result;
};
