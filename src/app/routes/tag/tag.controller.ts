import { NextFunction, Request, Response, Router } from 'express';
import auth from '../auth/auth';
import getTags from './tag.service';
import {
  getCachedQuery,
  setCachedQuery,
} from '../../services/query-cache.service';

const router = Router();

/**
 * Get top 10 popular tags
 * @auth optional
 * @route {GET} /api/tags
 * @returns tags list of tag names
 * @cache 30 minutes (tags change infrequently)
 */
router.get(
  '/tags',
  auth.optional,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check cache first (tags rarely change, safe to cache long)
      const cacheKey = 'tags:popular';
      const cached = getCachedQuery(cacheKey);

      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json({ tags: cached });
      }

      const tags = await getTags(req.auth?.user?.id);

      // Cache for 30 minutes
      setCachedQuery(cacheKey, tags, 30 * 60 * 1000);
      res.set('X-Cache', 'MISS');
      res.json({ tags });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
