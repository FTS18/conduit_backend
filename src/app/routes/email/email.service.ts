/**
 * Backend Email Service Handler with SMTP Failover
 * Tries multiple SMTP accounts - if one fails, automatically uses the next
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client (requires service key)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } }
);

// SMTP Configuration - Multiple Accounts for Failover
const smtpAccounts = [
  {
    name: 'Account 1: pecfest25@gmail.com',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: 'pecfest25@gmail.com',
    pass: 'jibe bqim pikx jnun',
    from: 'pecfest25@gmail.com'
  },
  {
    name: 'Account 2: pecfest2025@gmail.com',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: 'pecfest2025@gmail.com',
    pass: 'eanz jeia nwhs frjr',
    from: 'pecfest2025@gmail.com'
  },
  {
    name: 'Account 3: pecfestofficial@gmail.com',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: 'pecfestofficial@gmail.com',
    pass: 'nuvj hbxf fvry qiyf',
    from: 'pecfestofficial@gmail.com'
  },
  {
    name: 'Account 4: teampecfest@gmail.com',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: 'teampecfest@gmail.com',
    pass: 'etwz baha rauq gviz',
    from: 'teampecfest@gmail.com'
  },
  {
    name: 'Account 5: officialpecfest@gmail.com',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: 'officialpecfest@gmail.com',
    pass: 'eevv tqgr dziz pthf',
    from: 'officialpecfest@gmail.com'
  }
];

// Track which accounts have failed recently (retry after cooldown)
const failedAccounts = new Map<number, { failedAt: number; retryAfter: number }>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minute cooldown before retrying failed account

// Email templates
const emailTemplates = {
  passwordReset: (resetLink: string, userName: string) => ({
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 30px; border-radius: 8px; color: white; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password. Click the button below to create a new password. 
            This link will expire in 1 hour.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background: #0066cc; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #999; font-size: 13px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px;">
            If you didn't request a password reset, please ignore this email. Your account remains secure.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>© 2025 Conduit. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  confirmEmail: (verificationLink: string, userName: string) => ({
    subject: 'Confirm Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 30px; border-radius: 8px; color: white; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">Verify Your Email</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Welcome to Conduit! Please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="display: inline-block; background: #0066cc; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Verify Email
            </a>
          </div>
          
          <p style="color: #999; font-size: 13px; margin-top: 20px;">
            This link will expire in 24 hours.
          </p>
        </div>
      </div>
    `
  }),

  welcomeEmail: (userName: string) => ({
    subject: 'Welcome to Conduit!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 30px; border-radius: 8px; color: white; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">Welcome to Conduit!</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Your account has been successfully created!
          </p>
          
          <h3 style="color: #333;">Getting Started:</h3>
          <ul style="color: #555; font-size: 14px;">
            <li>Complete Your Profile</li>
            <li>Find Articles to Read</li>
            <li>Connect with Writers</li>
            <li>Share Your Thoughts</li>
          </ul>
        </div>
      </div>
    `
  })
};

// Supabase Email Service
export const sendPasswordResetEmail = async (email: string, userName: string, resetToken: string) => {
  try {
    // For Supabase: Password reset is handled by Supabase Auth directly
    // This endpoint just triggers the built-in reset email flow
    // The actual email is sent by Supabase's email service

    console.log('[EMAIL_SERVICE] Password reset initiated for', email);
    
    // If using custom email service (SendGrid), send here
    if (process.env.EMAIL_SERVICE === 'sendgrid') {
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const template = emailTemplates.passwordReset(resetLink, userName);
      return await sendViaSendGrid(email, template);
    }

    // Supabase handles sending the email natively
    console.log('[EMAIL_SERVICE] Password reset email sent to', email);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL_SERVICE] Failed to send password reset:', error);
    throw error;
  }
};

export const sendConfirmationEmail = async (email: string, userName: string) => {
  try {
    const verificationLink = `${process.env.FRONTEND_URL}/confirm-email`;
    const template = emailTemplates.confirmEmail(verificationLink, userName);

    // Use Supabase email or SendGrid
    if (process.env.EMAIL_SERVICE === 'sendgrid') {
      return await sendViaSendGrid(email, template);
    }

    // Default: use Supabase
    console.log('[EMAIL_SERVICE] Confirmation email queued for', email);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL_SERVICE] Failed to send confirmation:', error);
    throw error;
  }
};

export const sendWelcomeEmail = async (email: string, userName: string) => {
  try {
    const template = emailTemplates.welcomeEmail(userName);

    if (process.env.EMAIL_SERVICE === 'sendgrid') {
      return await sendViaSendGrid(email, template);
    }

    console.log('[EMAIL_SERVICE] Welcome email queued for', email);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL_SERVICE] Failed to send welcome:', error);
    throw error;
  }
};

// SendGrid integration
const sendViaSendGrid = async (to: string, template: any) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SendGrid API key not configured');
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: template.subject
        }],
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@conduit.io',
          name: 'Conduit'
        },
        content: [{
          type: 'text/html',
          value: template.html
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.statusText}`);
    }

    console.log('[SENDGRID] Email sent to', to);
    return { success: true };
  } catch (error) {
    console.error('[SENDGRID] Send failed:', error);
    throw error;
  }
};

// Nodemailer fallback for self-hosted (optional - install nodemailer separately if needed)
export const sendViaNodemailer = async (email: string, template: any) => {
  if (!process.env.SMTP_HOST) {
    console.warn('[EMAIL] SMTP not configured, email not sent');
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    // Note: Requires npm install nodemailer
    // Dynamically import to avoid breaking builds if not installed
    const nodemailer = require('nodemailer');

    // Try each account in order, skip recently failed ones
    for (let i = 0; i < smtpAccounts.length; i++) {
      const account = smtpAccounts[i];
      
      // Skip if recently failed
      const failureInfo = failedAccounts.get(i);
      if (failureInfo && Date.now() - failureInfo.failedAt < failureInfo.retryAfter) {
        console.log(`[SMTP] Skipping ${account.name} - in cooldown period`);
        continue;
      }
      
      try {
        const transporter = nodemailer.createTransport({
          host: account.host,
          port: account.port,
          secure: account.secure,
          auth: {
            user: account.user,
            pass: account.pass
          }
        });

        const result = await transporter.sendMail({
          from: `"Conduit" <${account.from}>`,
          to: email,
          subject: template.subject,
          html: template.html,
          text: template.text
        });

        // Success! Clear any previous failure state
        failedAccounts.delete(i);
        console.log(`[SMTP] Email sent via ${account.name} (Message ID: ${result.messageId})`);
        
        return { success: true, account: account.name };
      } catch (accountError) {
        console.error(`[SMTP] Failed with ${account.name}:`, accountError.message);
        
        // Mark account as failed with exponential backoff
        const failCount = failedAccounts.get(i)?.retryAfter || COOLDOWN_MS;
        failedAccounts.set(i, {
          failedAt: Date.now(),
          retryAfter: Math.min(failCount * 2, 60 * 60 * 1000) // Max 1 hour cooldown
        });
        
        // Try next account
        continue;
      }
    }
    
    // All accounts failed
    throw new Error('All SMTP accounts failed to send email');
  } catch (error) {
    console.error('[NODEMAILER] All accounts failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Get SMTP account status for monitoring
export const getSMTPStatus = () => {
  return smtpAccounts.map((account, index) => {
    const failure = failedAccounts.get(index);
    const isInCooldown = failure && Date.now() - failure.failedAt < failure.retryAfter;
    
    return {
      account: account.name,
      email: account.user,
      status: isInCooldown ? 'cooldown' : 'active',
      nextRetry: isInCooldown ? new Date(failure.failedAt + failure.retryAfter) : null
    };
  });
};
