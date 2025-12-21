/**
 * Environment Variables Validation
 *
 * This file validates all required environment variables at startup
 * to prevent runtime errors and improve security.
 */

class EnvironmentError extends Error {
  constructor(message: string) {
    super(`Environment Error: ${message}`);
    this.name = 'EnvironmentError';
    Error.captureStackTrace(this, this.constructor);
  }
}

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];

  // Skip validation during build
  const isBuildTime = process.env.NEXT_PHASE?.includes('build') || 
                      process.env.NEXT_PHASE === 'phase-export';

  if (!value && required && process.env.NODE_ENV !== 'test' && !isBuildTime) {
    throw new EnvironmentError(
      `Missing required environment variable: ${key}`
    );
  }

  return value || '';
}

function validateMongoDBUri(uri: string): void {
  if (!uri) return;
  
  // Basic MongoDB URI validation
  const mongoUriPattern = /^mongodb(\+srv)?:\/\//;
  if (!mongoUriPattern.test(uri)) {
    throw new EnvironmentError(
      'MONGODB_URI must be a valid MongoDB connection string'
    );
  }
}

function validateUrl(key: string, url: string): void {
  if (!url) return;
  
  try {
    new URL(url);
  } catch {
    throw new EnvironmentError(
      `${key} must be a valid URL. Received: ${url}`
    );
  }
}

function validateSecret(secret: string): void {
  if (!secret) return;
  
  if (secret.length < 32) {
    throw new EnvironmentError(
      'NEXTAUTH_SECRET must be at least 32 characters long'
    );
  }
  
  if (secret === 'supersecretkey') {
    throw new EnvironmentError(
      'NEXTAUTH_SECRET must not use the default value'
    );
  }
}

function validateEnvVars() {
  // Skip validation during build
  const isBuildTime = process.env.NEXT_PHASE?.includes('build') || 
                      process.env.NEXT_PHASE === 'phase-export';
  
  if (process.env.NODE_ENV === 'test' || isBuildTime) {
    return;
  }

  const errors: string[] = [];

  // Validate required variables
  const requiredVars = ['MONGODB_URI', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'] as const;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      errors.push(`Missing required variable: ${varName}`);
    }
  }

  // Validate formats
  try {
    validateMongoDBUri(process.env.MONGODB_URI || '');
    validateUrl('NEXTAUTH_URL', process.env.NEXTAUTH_URL || '');
    validateSecret(process.env.NEXTAUTH_SECRET || '');
  } catch (error) {
    if (error instanceof EnvironmentError) {
      errors.push(error.message);
    } else {
      errors.push('Unexpected validation error');
    }
  }

  // Validate optional variables if present
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY must start with "sk_"');
  }

  if (process.env.STRIPE_PUBLISHABLE_KEY && !process.env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    errors.push('STRIPE_PUBLISHABLE_KEY must start with "pk_"');
  }

  if (errors.length > 0) {
    const errorMessage = [
      'Environment validation failed:',
      ...errors.map(e => `  • ${e}`),
      '',
      'Please check your .env.local file and ensure all required variables are set correctly.'
    ].join('\n');

    console.error(`\n❌ ${errorMessage}\n`);
    
    // In production, don't crash on optional variable issues
    const hasCriticalErrors = errors.some(e => 
      e.includes('MONGODB_URI') || 
      e.includes('NEXTAUTH_SECRET') || 
      e.includes('NEXTAUTH_URL')
    );
    
    if (hasCriticalErrors || process.env.NODE_ENV !== 'production') {
      throw new EnvironmentError(errorMessage);
    }
  }
}

// Export a function to validate instead of auto-validating
export function validateEnvironment() {
  validateEnvVars();
}

// Environment configuration
export const env = {
  // Database
  MONGODB_URI: getEnvVar('MONGODB_URI'),
  
  // Auth
  NEXTAUTH_SECRET: getEnvVar('NEXTAUTH_SECRET'),
  NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL'),
  
  // Stripe
  STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY', false),
  STRIPE_PUBLISHABLE_KEY: getEnvVar('STRIPE_PUBLISHABLE_KEY', false),
  STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET', false),
  
  // Email
  SENDGRID_API_KEY: getEnvVar('SENDGRID_API_KEY', false),
  EMAIL_FROM: getEnvVar('EMAIL_FROM', false) || 'noreply@example.com',
  
  // Cron
  CRON_SECRET: getEnvVar('CRON_SECRET', false),
  
  // Sentry
  SENTRY_DSN: getEnvVar('SENTRY_DSN', false),
  NEXT_PUBLIC_SENTRY_DSN: getEnvVar('NEXT_PUBLIC_SENTRY_DSN', false),
  SENTRY_ORG: getEnvVar('SENTRY_ORG', false),
  SENTRY_PROJECT: getEnvVar('SENTRY_PROJECT', false),
  SENTRY_AUTH_TOKEN: getEnvVar('SENTRY_AUTH_TOKEN', false),
  
  // App
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
  
  // Feature flags
  ENABLE_STRIPE: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
  ENABLE_EMAIL: !!process.env.SENDGRID_API_KEY,
  ENABLE_SENTRY: !!process.env.SENTRY_DSN,
} as const;

// Runtime validation
if (process.env.NODE_ENV !== 'test') {
  const isBuildTime = process.env.NEXT_PHASE?.includes('build') || 
                      process.env.NEXT_PHASE === 'phase-export';
  
  if (!isBuildTime) {
    validateEnvVars();
  }
}

// Helper functions
export function isStripeConfigured(): boolean {
  return env.ENABLE_STRIPE;
}

export function isSendGridConfigured(): boolean {
  return env.ENABLE_EMAIL;
}

export function getPublicEnv() {
  return {
    NEXTAUTH_URL: env.NEXTAUTH_URL,
    NODE_ENV: env.NODE_ENV,
    IS_PRODUCTION: env.IS_PRODUCTION,
    IS_DEVELOPMENT: env.IS_DEVELOPMENT,
    STRIPE_PUBLISHABLE_KEY: env.STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: env.NEXT_PUBLIC_SENTRY_DSN,
  };
}

// Export error class for use in other files
export { EnvironmentError };
