/**
 * Centralized logger utility to handle application logs
 * and prevent sensitive information exposure.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private readonly isProduction = process.env.NODE_ENV === 'production';

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
  }

  debug(message: string, meta?: any) {
    if (!this.isProduction) {
      const log = this.formatMessage('debug', message, meta);
      console.debug(JSON.stringify(log));
    }
  }
}

export const logger = new Logger();
