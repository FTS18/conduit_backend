import { Router } from 'express';
import { bookmarkArticle, unbookmarkArticle, getBookmarks } from './bookmark.controller';
import auth from '../auth/auth';

const router = Router();

router.post('/articles/:slug/bookmark', auth.required, bookmarkArticle);
router.delete('/articles/:slug/bookmark', auth.required, unbookmarkArticle);
router.get('/bookmarks', auth.required, getBookmarks);

export default router;