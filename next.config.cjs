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
    }
    
    // Suprimir warnings conocidos de Sentry/OpenTelemetry
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/require-in-the-middle/,
        message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
    ];
    
    return config;
  },
  
  // Headers de compresión (si se usa servidor propio)
  compress: true,
  
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
