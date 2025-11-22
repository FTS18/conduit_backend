import { NextFunction, Request, Response, Router } from 'express';
import auth from '../auth/auth';
import { getNotifications, markNotificationAsRead, getUnreadCount } from './notification.service';

const router = Router();

router.get(
  '/notifications',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await getNotifications(req.auth?.user?.id);
      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/notifications/unread-count',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await getUnreadCount(req.auth?.user?.id);
      res.json({ unreadCount: count });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/notifications/:id/read',
  auth.required,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await markNotificationAsRead(Number(req.params.id), req.auth?.user?.id);
      res.json({ notification });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
