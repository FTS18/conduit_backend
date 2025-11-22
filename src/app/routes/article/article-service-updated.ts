import slugify from 'slugify';
import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import profileMapper from '../profile/profile.utils';
import articleMapper from './article.mapper';
import { Tag } from '../tag/tag.model';

const buildFindAllQuery = (query: any, id: number | undefined) => {
  const queries: any = [];
  const orAuthorQuery = [];
  const andAuthorQuery = [];

  orAuthorQuery.push({
    demo: {
      equals: true,
    },
  });

  if (id) {
    orAuthorQuery.push({
      id: {
        equals: id,
      },
    });
  }

  if ('author' in query) {
    andAuthorQuery.push({
      username: {
        equals: query.author,
      },
    });
  }

  const authorQuery = {
    author: {
      OR: orAuthorQuery,
      AND: andAuthorQuery,
    },
  };

  queries.push(authorQuery);

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

  return queries;
};

export const getCommentsByArticle = async (slug: string, id?: number) => {
  const queries = [];

  queries.push({
    author: {
      demo: true,
    },
  });

  if (id) {
    queries.push({
      author: {
        id,
      },
    });
  }

  const comments = await prisma.article.findUnique({
    where: {
      slug,
    },
    include: {
      comments: {
        where: {
          OR: queries,
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          body: true,
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
      },
    },
  });

  const result = comments?.comments.map((comment: any) => ({
    ...comment,
    author: {
      username: comment.author.username,
      bio: comment.author.bio,
      image: comment.author.image,
      following: comment.author.followedBy.some((follow: any) => follow.id === id),
    },
    upvotes: comment.votes.filter((v: any) => v.value === 1).length,
    downvotes: comment.votes.filter((v: any) => v.value === -1).length,
    userVote: comment.votes.find((v: any) => v.userId === id)?.value || 0,
  }));

  return result;
};
