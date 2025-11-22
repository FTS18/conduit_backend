import { NextFunction, Request, Response, Router } from 'express';
import auth from '../auth/auth';
import prisma from '../../../prisma/prisma-client';
import { followUser, getProfile, unfollowUser } from './profile.service';

const router = Router();

/**
 * Get all users
 * @auth optional
 * @route {GET} /profiles
 * @returns users
 */
router.get(
  '/profiles',
  auth.optional,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
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

/**
 * Get profile
 * @auth optional
 * @route {GET} /profiles/:username
 * @param username string
 * @returns profile
 */
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

/**
 * Follow user
 * @auth required
 * @route {POST} /profiles/:username/follow
 * @param username string
 * @returns profile
 */
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

/**
 * Unfollow user
 * @auth required
 * @route {DELETE} /profiles/:username/follow
 * @param username string
 * @returns profiles
 */
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
