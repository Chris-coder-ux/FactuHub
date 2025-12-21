# 🔍 Configuración de Sentry para Monitoring

## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env.local`:

```bash
# Sentry Configuration
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token  # Solo necesario para upload de source maps
```

## Configuración

1. **Crear cuenta en Sentry**: https://sentry.io/signup/
2. **Crear un proyecto** para Next.js
3. **Obtener DSN** desde Settings > Projects > Client Keys (DSN)
4. **Configurar variables de entorno** en `.env.local`
5. **Obtener Auth Token** (Settings > Account > Auth Tokens) para source maps

## Características Implementadas

### ✅ Error Tracking
- Errores capturados automáticamente desde:
  - `logger.error()` - Errores de aplicación
  - `ErrorBoundary` - Errores de React
  - `error.tsx` - Errores de Next.js
- Sanitización automática de datos sensibles
- Contexto completo (usuario, IP, user-agent)

### ✅ Performance Monitoring
- Métricas de API endpoints (duración, status code)
- Métricas de cache (hits/misses, duración)
- Métricas de base de datos (queries, duración)
- Métricas de negocio personalizadas

### ✅ Session Replay
- Replay de sesiones con errores
- Máscara automática de datos sensibles
- Sample rate configurable

### ✅ Source Maps
- Upload automático en build
- Debugging mejorado en producción

## Uso del Servicio de Métricas

```typescript
import { MetricsService } from '@/lib/services/metrics-service';

// Track API performance
MetricsService.trackApiPerformance('/api/invoices', 150, 200, 'GET');

// Track database query
MetricsService.trackDbQuery('invoices', 'find', 45, true);

// Track cache operation
MetricsService.trackCache('products:123', true, 5);

// Track business metric
MetricsService.trackBusinessMetric('invoice.created', 1, {
  companyId: '123',
  status: 'paid',
});

// Increment counter
MetricsService.incrementCounter('api.requests', 1, {
  endpoint: '/api/invoices',
});

// Set gauge
MetricsService.setGauge('active.users', 150, {
  companyId: '123',
});
```

## Verificación

1. Ejecuta la aplicación en desarrollo
2. Genera un error intencional
3. Verifica en Sentry Dashboard que el error aparece
4. Revisa las métricas en Performance > Metrics

## Notas

- Sentry solo se activa si `SENTRY_DSN` está configurado
- En desarrollo, todos los errores se capturan (tracesSampleRate: 1.0)
- En producción, se muestrea al 10% para reducir overhead
- Los datos sensibles se sanitizan automáticamente antes de enviar

