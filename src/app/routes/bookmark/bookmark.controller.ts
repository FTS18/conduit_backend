import { Request, Response } from 'express';
import { toggleBookmark, getUserBookmarks } from './bookmark.service';
import { getArticle } from '../article/article.service';

interface AuthRequest extends Request {
  user?: { id: number };
}

export const bookmarkArticle = async (req: any, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const slug = req.params.slug;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    await toggleBookmark(userId, slug, true);
    const article = await getArticle(slug, userId);
    res.json({ article });
  } catch (error) {
    console.error('Bookmark error:', error);
    res.status(400).json({ error: 'Failed to bookmark article' });
  }
};

export const unbookmarkArticle = async (req: any, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const slug = req.params.slug;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    await toggleBookmark(userId, slug, false);
    const article = await getArticle(slug, userId);
    res.json({ article });
  } catch (error) {
    console.error('Unbookmark error:', error);
    res.status(400).json({ error: 'Failed to remove bookmark' });
  }
};

export const getBookmarks = async (req: any, res: Response) => {
  try {
    const userId = req.auth?.user?.id;
    const bookmarks = await getUserBookmarks(userId);
    
    const articles = bookmarks.map(bookmark => ({
      ...bookmark.article,
      favorited: bookmark.article.favoritedBy.some((user: any) => user.id === userId),
      favoritesCount: bookmark.article.favoritedBy.length,
      bookmarked: true,
      tagList: bookmark.article.tagList.map((tag: any) => tag.name),
      author: {
        username: bookmark.article.author.username,
        bio: bookmark.article.author.bio,
        image: bookmark.article.author.image,
        following: bookmark.article.author.followedBy ? bookmark.article.author.followedBy.some((follow: any) => follow.id === userId) : false
      }
    }));
    
    res.json({ articles, articlesCount: articles.length });
  } catch (error) {
    console.error('Bookmark error:', error);
    res.status(400).json({ error: 'Failed to get bookmarks' });
  }
};