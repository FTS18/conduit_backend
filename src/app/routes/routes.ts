import { Router } from 'express';
import tagsController from './tag/tag.controller';
import articlesController from './article/article.controller';
import authController from './auth/auth.controller';
import profileController from './profile/profile.controller';
import bookmarkRoutes from './bookmark/bookmark.routes';
import notificationController from './notification/notification.controller';

const api = Router()
  .use(tagsController)
  .use(articlesController)
  .use(profileController)
  .use(authController)
  .use(bookmarkRoutes)
  .use(notificationController);

export default Router().use('/api', api);
