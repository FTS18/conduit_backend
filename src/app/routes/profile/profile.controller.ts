import { NextFunction, Request, Response, Router } from 'express';
import auth from '../auth/auth';
import prisma from '../../../prisma/prisma-client';
import { followUser, getProfile, unfollowUser, getFollowers, getFollowing } from './profile.service';

const router = Router();

router.get(
  '/profiles',
  auth.optional,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const searchTerm = req.query.search as string;
      const users = await prisma.user.findMany({
        where: searchTerm ? {
          OR: [
            { username: { contains: searchTerm } },
            { bio: { contains: searchTerm } },
          ],
        } : undefined,
        select: {
          id: true,
          username: true,
          image: true,
          bio: true,
        },
        take: 100,
      });
      res.json({ users });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/profiles/:username/followers',
  auth.optional,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const followers = await getFollowers(req.params.username, req.auth?.user?.id);
      res.json({ followers });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/profiles/:username/following',
  auth.optional,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const following = await getFollowing(req.params.username, req.auth?.user?.id);
      res.json({ following });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/profiles/:username',
  auth.optional,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await getProfile(req.params.username, req.auth?.user?.id);
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/profiles/:username/follow',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await followUser(req.params?.username, req.auth?.user?.id);
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/profiles/:username/follow',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await unfollowUser(req.params.username, req.auth?.user?.id);
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
