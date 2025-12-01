/**
 * Email API Routes
 * Place this in backend/src/app/routes/email/email.controller.ts
 */

import { Router, Request, Response } from 'express';
import {
  sendPasswordResetEmail,
  sendConfirmationEmail,
  sendWelcomeEmail,
  getSMTPStatus
} from './email.service';

const router = Router();

/**
 * POST /api/email/send-password-reset
 * Send password reset email
 */
router.post('/send-password-reset', async (req: Request, res: Response) => {
  try {
    const { email, userName, resetToken } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await sendPasswordResetEmail(email, userName || 'User', resetToken);

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('[EMAIL_CONTROLLER] Password reset error:', error);
    res.status(500).json({
      error: 'Failed to send password reset email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/email/send-confirmation
 * Send email confirmation
 */
router.post('/send-confirmation', async (req: Request, res: Response) => {
  try {
    const { email, userName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await sendConfirmationEmail(email, userName || 'User');

    res.json({ success: true, message: 'Confirmation email sent' });
  } catch (error) {
    console.error('[EMAIL_CONTROLLER] Confirmation error:', error);
    res.status(500).json({
      error: 'Failed to send confirmation email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/email/send-welcome
 * Send welcome email
 */
router.post('/send-welcome', async (req: Request, res: Response) => {
  try {
    const { email, userName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await sendWelcomeEmail(email, userName || 'User');

    res.json({ success: true, message: 'Welcome email sent' });
  } catch (error) {
    console.error('[EMAIL_CONTROLLER] Welcome email error:', error);
    res.status(500).json({
      error: 'Failed to send welcome email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/email/status
 * Check SMTP account status and failover state
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = getSMTPStatus();
    const activeAccounts = status.filter(s => s.status === 'active').length;
    
    res.json({
      service: 'SMTP with failover',
      totalAccounts: status.length,
      activeAccounts,
      accounts: status
    });
  } catch (error) {
    console.error('[EMAIL_CONTROLLER] Status error:', error);
    res.status(500).json({ error: 'Failed to get email status' });
  }
});

export default router;
