/* eslint-disable */
/* eslint-env node */
/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Enable PostCSS processing
  
  // Enable instrumentation for Sentry
  experimental: {
    instrumentationHook: true,
  },
  
  // Optimizaciones de compilación
  swcMinify: true, // Usar SWC para minificación (más rápido que Terser)
  
  // Optimizaciones de bundle
  compiler: {
    // Eliminar console.logs en producción
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Mantener console.error y console.warn
    } : false,
  },
  
  // Optimizaciones experimentales
  experimental: {
    instrumentationHook: true, // Enable Sentry instrumentation
    // Optimizar imports de paquetes grandes
    optimizePackageImports: [
      'lucide-react', // Iconos - solo importar los usados
      'recharts', // Gráficos - tree-shaking mejorado
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
    ],
    // Optimizar CSS (deshabilitado temporalmente por problemas en build)
    // optimizeCss: true,
  },
  
  // Configuración de webpack para mejor tree-shaking
  webpack: (config, { isServer }) => {
    // Optimizaciones adicionales
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true, // Habilitar tree-shaking
        // sideEffects: false removido - CSS tiene side effects y causa errores en build
      };
      
      // Límites de bundle size para prevenir degradación de performance
      config.performance = {
        hints: 'warning', // Mostrar warnings cuando se excedan los límites
        maxAssetSize: 512000, // 512KB - tamaño máximo de un asset individual
        maxEntrypointSize: 512000, // 512KB - tamaño máximo del entrypoint (JS inicial)
      };
    }
    
    // Suprimir warnings conocidos de Sentry/OpenTelemetry
    // Nota: Estos warnings son inofensivos y vienen de la instrumentación dinámica
    const originalWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings = [
      ...originalWarnings,
      // Warning de require-in-the-middle (usado por Sentry para instrumentación)
      // Este warning es inofensivo - Sentry necesita acceso dinámico a módulos
      {
        module: /node_modules\/require-in-the-middle/,
      },
      {
        message: /Critical dependency.*require function is used in a way/,
      },
      // Otros warnings comunes de módulos de instrumentación
      {
        module: /node_modules\/@sentry/,
      },
      {
        module: /node_modules\/@opentelemetry/,
      },
    ];
    
    // También suprimir en el logger de webpack
    if (config.infrastructureLogging) {
      config.infrastructureLogging.level = 'error';
    } else {
      config.infrastructureLogging = { level: 'error' };
    }
    
    return config;
  },
  
  // Headers de compresión (si se usa servidor propio)
  compress: true,
  
  // Headers de seguridad
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Note: CSP with nonces is handled dynamically in middleware.ts
    // This is a fallback CSP for static assets and initial page load
    const fallbackCSP = isProduction
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'", // Nonces added dynamically by middleware
          "style-src 'self' 'unsafe-inline'", // Nonces added dynamically by middleware
          "img-src 'self' data: https: blob:",
          "font-src 'self' data:",
          "connect-src 'self' https://*.sentry.io https://*.cloudinary.com wss://*.sentry.io",
          "frame-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests",
        ].join('; ')
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval necesario para Next.js HMR en desarrollo
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data:",
          "connect-src 'self' https://*.sentry.io https://*.cloudinary.com wss://*.sentry.io ws://localhost:*",
          "frame-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; ');
    
    return [
      {
        // Aplicar a todas las rutas
        source: '/(.*)',
        headers: [
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevenir MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control de referrer
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permisos de API del navegador
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // HSTS solo en producción (HTTPS)
          ...(isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
          // Content Security Policy (fallback - nonces added dynamically in middleware)
          {
            key: 'Content-Security-Policy',
            value: fallbackCSP,
          },
        ],
      },
    ];
  },
  
  // Optimizaciones de imágenes (ya habilitado por defecto en Next.js 14)
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    // CDN configuration
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    // Image optimization settings
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable image optimization
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

// Sentry configuration
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps in production
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableClientWebpackPlugin: !process.env.SENTRY_DSN,
  disableServerWebpackPlugin: !process.env.SENTRY_DSN,
};

module.exports = withSentryConfig(
  withBundleAnalyzer(nextConfig),
  sentryWebpackPluginOptions
);
