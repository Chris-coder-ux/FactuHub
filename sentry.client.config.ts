import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Enable metrics (experimental)
  _experiments: {
    enableMetrics: true,
  },
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  replaysOnErrorSampleRate: 1.0,
  
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,
  
  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
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
});

