/**
 * Centralized logger utility to handle application logs
 * and prevent sensitive information exposure.
 * Integrated with Sentry for error tracking.
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly sentryEnabled = !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  private formatMessage(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      ...(meta && { meta: this.sanitize(meta) }),
    };
  }

  private sanitize(data: any): any {
    if (!data) return data;
    
    // List of keys to redact
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'];
    
    const sanitized = structuredClone(data);
    
    const redact = (obj: any) => {
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          redact(obj[key]);
        }
      }
    };

    redact(sanitized);
    return sanitized;
  }

  info(message: string, meta?: any) {
    const log = this.formatMessage('info', message, meta);
    console.log(JSON.stringify(log));
  }

  warn(message: string, meta?: any) {
    const log = this.formatMessage('warn', message, meta);
    console.warn(JSON.stringify(log));

    // Send warnings to Sentry in production
    if (this.sentryEnabled && this.isProduction) {
      Sentry.captureMessage(message, {
        level: 'warning',
        tags: {
          component: 'logger',
        },
        extra: {
          meta: this.sanitize(meta),
        },
      });
    }
  }

  error(message: string, error?: any, meta?: any) {
    const log = this.formatMessage('error', message, {
      ...meta,
      ...(error instanceof Error ? {
        errorMessage: error.message,
        stack: this.isProduction ? undefined : error.stack
      } : { error }),
    });
    console.error(JSON.stringify(log));

    // Send to Sentry if enabled
    if (this.sentryEnabled) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          level: 'error',
          tags: {
            component: 'logger',
          },
          extra: {
            message,
            meta: this.sanitize(meta),
          },
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          tags: {
            component: 'logger',
          },
          extra: {
            error,
            meta: this.sanitize(meta),
          },
        });
      }
    }
  }

  debug(message: string, meta?: any) {
    if (!this.isProduction) {
      const log = this.formatMessage('debug', message, meta);
      console.debug(JSON.stringify(log));
    }
  }
}

export const logger = new Logger();
