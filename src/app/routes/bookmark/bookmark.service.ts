import prisma from '../../../prisma/prisma-client';
import articleMapper from '../article/article.mapper';

export const toggleBookmark = async (userId: number, slug: string, bookmark: boolean) => {
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article) throw new Error('Article not found');

  const existingBookmark = await prisma.bookmark.findUnique({
    where: { userId_articleId: { userId, articleId: article.id } }
  });

  if (bookmark && !existingBookmark) {
    await prisma.bookmark.create({
      data: { userId, articleId: article.id }
    });
  } else if (!bookmark && existingBookmark) {
    await prisma.bookmark.delete({
      where: { userId_articleId: { userId, articleId: article.id } }
    });
  }
};

export const getUserBookmarks = async (userId: number) => {
  if (!userId) return [];
  
  return await prisma.bookmark.findMany({
    where: { userId },
    include: {
      article: {
        include: {
          author: {
            include: {
              followedBy: true
            }
          },
          tagList: true,
          favoritedBy: true,
          bookmarks: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const isBookmarked = async (userId: number, articleId: number) => {
  const bookmark = await prisma.bookmark.findUnique({
    where: {
      userId_articleId: { userId, articleId }
    }
  });
  return !!bookmark;
};