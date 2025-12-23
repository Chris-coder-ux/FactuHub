export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
    
    // Initialize certificate pinning for external APIs
    const { initializeCertificatePins } = await import('./lib/security/certificate-pinning');
    initializeCertificatePins();
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
