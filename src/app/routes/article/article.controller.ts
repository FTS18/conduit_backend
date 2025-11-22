import { NextFunction, Request, Response, Router } from 'express';
import auth from '../auth/auth';
import prisma from '../../../prisma/prisma-client';
import {
  addComment,
  createArticle,
  deleteArticle,
  deleteComment,
  favoriteArticle,
  getArticle,
  getArticles,
  getCommentsByArticle,
  getFeed,
  unfavoriteArticle,
  updateArticle,
} from './article.service';

const router = Router();

router.get('/articles', auth.optional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getArticles(req.query, req.auth?.user?.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get(
  '/articles/feed',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getFeed(
        Number(req.query.offset),
        Number(req.query.limit),
        req.auth?.user?.id,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post('/articles', auth.required, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await createArticle(req.body.article, req.auth?.user?.id);
    res.status(201).json({ article });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/articles/:slug',
  auth.optional,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const article = await getArticle(req.params.slug, req.auth?.user?.id);
      res.json({ article });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/articles/:slug',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const article = await updateArticle(req.body.article, req.params.slug, req.auth?.user?.id);
      res.json({ article });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/articles/:slug',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteArticle(req.params.slug, req.auth?.user!.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/articles/:slug/comments',
  auth.optional,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comments = await getCommentsByArticle(req.params.slug, req.auth?.user?.id);
      res.json({ comments });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/articles/:slug/comments',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comment = await addComment(req.body.comment.body, req.params.slug, req.auth?.user?.id, req.body.comment.parentCommentId);
      res.json({ comment });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/articles/:slug/comments/:id',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteComment(Number(req.params.id), req.auth?.user?.id);
      res.status(200).json({});
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/articles/:slug/favorite',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const article = await favoriteArticle(req.params.slug, req.auth?.user?.id);
      res.json({ article });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/articles/:slug/favorite',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const article = await unfavoriteArticle(req.params.slug, req.auth?.user?.id);
      res.json({ article });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/comments/:id/vote',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.user?.id;
      const commentId = Number(req.params.id);
      const value = req.body.value;

      const existingVote = await prisma.commentVote.findUnique({
        where: { commentId_userId: { commentId, userId } }
      });

      let result = null;
      if (existingVote) {
        if (existingVote.value === value) {
          await prisma.commentVote.delete({
            where: { commentId_userId: { commentId, userId } }
          });
        } else {
          result = await prisma.commentVote.update({
            where: { commentId_userId: { commentId, userId } },
            data: { value }
          });
        }
      } else {
        result = await prisma.commentVote.create({
          data: { userId, commentId, value }
        });
      }

      res.json({ vote: result });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
