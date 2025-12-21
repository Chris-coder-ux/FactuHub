/**
 * Environment Variables Validation
 *
 * This file validates all required environment variables at startup
 * to prevent runtime errors and improve security.
 */

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];

  if (!value && required) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please add it to your .env.local file.`
    );
  }

  return value || "";
}

function validateEnvVars() {
  const errors: string[] = [];

  // Required variables
  const requiredVars = ["MONGODB_URI", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required variable: ${varName}`);
    }
  }

  // Validate NEXTAUTH_SECRET strength
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && secret.length < 32) {
    errors.push(
      "NEXTAUTH_SECRET is too weak. It should be at least 32 characters long.\n" +
        "Generate a strong secret with: openssl rand -base64 32"
    );
  }

  if (secret === "supersecretkey") {
    errors.push(
      "NEXTAUTH_SECRET is using the default value. This is a CRITICAL security risk!\n" +
        "Generate a strong secret with: openssl rand -base64 32"
    );
  }

  if (errors.length > 0) {
    throw new Error(
      "❌ Environment validation failed:\n\n" +
        errors.map((e) => `  • ${e}`).join("\n") +
        "\n\nPlease fix these issues before starting the application."
    );
  }
}

// Validate on module load
if (process.env.NODE_ENV !== "test") {
  validateEnvVars();
}

// Export validated environment variables
export const env = {
  // Database
  MONGODB_URI: getEnvVar("MONGODB_URI"),

  // Auth
  NEXTAUTH_SECRET: getEnvVar("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: getEnvVar("NEXTAUTH_URL"),

  // Stripe (optional in development)
  STRIPE_SECRET_KEY: getEnvVar("STRIPE_SECRET_KEY", false),
  STRIPE_PUBLISHABLE_KEY: getEnvVar("STRIPE_PUBLISHABLE_KEY", false),
  STRIPE_WEBHOOK_SECRET: getEnvVar("STRIPE_WEBHOOK_SECRET", false),

  // SendGrid (optional in development)
  SENDGRID_API_KEY: getEnvVar("SENDGRID_API_KEY", false),

  // Cron (for production)
  CRON_SECRET: getEnvVar("CRON_SECRET", false),

  // Sentry (optional)
  SENTRY_DSN: getEnvVar("SENTRY_DSN", false),
  NEXT_PUBLIC_SENTRY_DSN: getEnvVar("NEXT_PUBLIC_SENTRY_DSN", false),
  SENTRY_ORG: getEnvVar("SENTRY_ORG", false),
  SENTRY_PROJECT: getEnvVar("SENTRY_PROJECT", false),
  SENTRY_AUTH_TOKEN: getEnvVar("SENTRY_AUTH_TOKEN", false),

  // Environment
  NODE_ENV: process.env.NODE_ENV || "development",
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
} as const;

// Helper to check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

// Helper to check if SendGrid is configured
export function isSendGridConfigured(): boolean {
  return !!env.SENDGRID_API_KEY;
}
