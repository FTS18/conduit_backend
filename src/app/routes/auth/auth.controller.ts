import { NextFunction, Request, Response, Router } from 'express';
import auth from './auth';
import { createUser, getCurrentUser, login, updateUser, supabaseLogin, deleteUser, verifyPassword } from './auth.service';

const router = Router();

/**
 * Create an user
 * @auth none
 * @route {POST} /users
 * @bodyparam user User
 * @returns user User
 */
router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await createUser({ ...req.body.user, demo: false });
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * Login
 * @auth none
 * @route {POST} /users/login
 * @bodyparam user User
 * @returns user User
 */
router.post('/users/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await login(req.body.user);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * Supabase Login
 * @auth none
 * @route {POST} /users/login/supabase
 * @bodyparam user User
 * @returns user User
 */
router.post('/users/login/supabase', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await supabaseLogin(req.body.user);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * Get current user
 * @auth required
 * @route {GET} /user
 * @returns user User
 */
router.get('/user', auth.required, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getCurrentUser(req.auth?.user?.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user
 * @auth required
 * @route {PUT} /user
 * @bodyparam user User
 * @returns user User
 */
router.put('/user', auth.required, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await updateUser(req.body.user, req.auth?.user?.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify password
 * @auth required
 * @route {POST} /user/verify-password
 * @bodyparam password string
 * @returns success boolean
 */
router.post('/user/verify-password', auth.required, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await verifyPassword(req.auth?.user?.id, req.body.password);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete user and all data
 * @auth required
 * @route {DELETE} /user
 * @returns success message
 */
router.delete('/user', auth.required, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteUser(req.auth?.user?.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
