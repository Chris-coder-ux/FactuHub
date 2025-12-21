/**
 * Email Service
 * Centralized service for sending emails with configuration from Settings
 */

import sgMail from '@sendgrid/mail';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import Settings from '@/lib/models/Settings';
import EmailLog from '@/lib/models/EmailLog';
import mongoose from 'mongoose';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
    disposition?: string;
  }>;
  companyId: string;
  userId?: string;
  type: 'invoice' | 'overdue' | 'payment' | 'team_invite' | 'fiscal_reminder' | 'other';
  metadata?: Record<string, any>;
}

class EmailService {
  private initialized = false;

  private async initialize() {
    if (this.initialized) return;
    
    if (env.SENDGRID_API_KEY) {
      sgMail.setApiKey(env.SENDGRID_API_KEY);
      this.initialized = true;
    } else {
      logger.warn('SENDGRID_API_KEY is not configured. Email sending will not work.');
    }
  }

  /**
   * Get email configuration from Settings
   */
  private async getEmailConfig(companyId: string) {
    const settings = await Settings.findOne({ companyId: new mongoose.Types.ObjectId(companyId) }).lean();
    
    return {
      from: settings?.emailFromAddress || process.env.SENDGRID_FROM_EMAIL || 'noreply@facturahub.com',
      fromName: settings?.emailFromName || settings?.companyName || 'FacturaHub',
      notificationsEnabled: settings?.emailNotificationsEnabled !== false, // Default true
      invoiceEnabled: settings?.emailInvoiceEnabled !== false,
      overdueEnabled: settings?.emailOverdueEnabled !== false,
      paymentEnabled: settings?.emailPaymentEnabled !== false,
      teamInvitesEnabled: settings?.emailTeamInvitesEnabled !== false,
      fiscalRemindersEnabled: settings?.emailFiscalRemindersEnabled !== false,
    };
  }

  /**
   * Check if email type is enabled
   */
  private async isEmailTypeEnabled(companyId: string, type: SendEmailOptions['type']): Promise<boolean> {
    const config = await this.getEmailConfig(companyId);
    
    if (!config.notificationsEnabled) return false;
    
    switch (type) {
      case 'invoice':
        return config.invoiceEnabled;
      case 'overdue':
        return config.overdueEnabled;
      case 'payment':
        return config.paymentEnabled;
      case 'team_invite':
        return config.teamInvitesEnabled;
      case 'fiscal_reminder':
        return config.fiscalRemindersEnabled;
      default:
        return true;
    }
  }

  /**
   * Send email with logging
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    await this.initialize();

    if (!this.initialized) {
      const error = 'SendGrid not configured';
      await this.logEmail({
        ...options,
        status: 'failed',
        errorMessage: error,
      });
      return { success: false, error };
    }

    // Check if email type is enabled
    const isEnabled = await this.isEmailTypeEnabled(options.companyId, options.type);
    if (!isEnabled) {
      logger.info(`Email type ${options.type} is disabled for company ${options.companyId}`);
      return { success: false, error: 'Email type is disabled in settings' };
    }

    const config = await this.getEmailConfig(options.companyId);
    
    // Create email log entry
    const emailLog = await EmailLog.create({
      companyId: new mongoose.Types.ObjectId(options.companyId),
      userId: options.userId ? new mongoose.Types.ObjectId(options.userId) : undefined,
      type: options.type,
      to: options.to,
      from: config.from,
      fromName: config.fromName,
      subject: options.subject,
      status: 'pending',
      metadata: options.metadata || {},
    });

    try {
      const msg = {
        to: options.to,
        from: {
          email: config.from,
          name: config.fromName,
        },
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.type || 'application/octet-stream',
          disposition: att.disposition || 'attachment',
        })),
      };

      const [response] = await sgMail.send(msg);

      // Update email log
      await EmailLog.findByIdAndUpdate(emailLog._id, {
        status: 'sent',
        sentAt: new Date(),
      });

      logger.info('Email sent successfully', {
        emailLogId: emailLog._id,
        to: options.to,
        type: options.type,
        messageId: response.headers['x-message-id'],
      });

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error: any) {
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Unknown error';
      
      // Update email log
      await EmailLog.findByIdAndUpdate(emailLog._id, {
        status: 'failed',
        errorMessage,
      });

      logger.error('Failed to send email', {
        emailLogId: emailLog._id,
        to: options.to,
        type: options.type,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Log email without sending (for testing or disabled emails)
   */
  private async logEmail(options: SendEmailOptions & { status: 'sent' | 'failed'; errorMessage?: string }) {
    const config = await this.getEmailConfig(options.companyId);
    
    await EmailLog.create({
      companyId: new mongoose.Types.ObjectId(options.companyId),
      userId: options.userId ? new mongoose.Types.ObjectId(options.userId) : undefined,
      type: options.type,
      to: options.to,
      from: config.from,
      fromName: config.fromName,
      subject: options.subject,
      status: options.status,
      errorMessage: options.errorMessage,
      metadata: options.metadata || {},
      sentAt: options.status === 'sent' ? new Date() : undefined,
    });
  }

  /**
   * Get email logs for a company
   */
  async getEmailLogs(companyId: string, filters?: {
    type?: string;
    status?: string;
    limit?: number;
    page?: number;
  }) {
    const query: any = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    const limit = filters?.limit || 50;
    const page = filters?.page || 1;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      EmailLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const emailService = new EmailService();

