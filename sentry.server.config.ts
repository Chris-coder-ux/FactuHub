import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Enable metrics (experimental)
  _experiments: {
    enableMetrics: true,
  },
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  // Filter out sensitive data
  beforeSend(event, hint) {
    // Remove sensitive information
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request.data) {
        const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
        const sanitize = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return obj;
          const sanitized = { ...obj };
          for (const key in sanitized) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
              sanitized[key] = '[REDACTED]';
            } else if (typeof sanitized[key] === 'object') {
              sanitized[key] = sanitize(sanitized[key]);
            }
          }
          return sanitized;
        };
        event.request.data = sanitize(event.request.data);
      }
    }
    return event;
  },
  
  // Set environment
  environment: process.env.NODE_ENV || 'development',
});

