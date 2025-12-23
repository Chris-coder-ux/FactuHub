# 📊 Materialized Views para Analytics

## 📋 Tabla de Contenidos

1. [¿Qué son Materialized Views?](#qué-son-materialized-views)
2. [Beneficios](#beneficios)
3. [Configuración](#configuración)
4. [Cómo Funciona](#cómo-funciona)
5. [Invalidación de Vistas](#invalidación-de-vistas)
6. [Mantenimiento](#mantenimiento)
7. [Monitoreo](#monitoreo)

---

## 🎯 ¿Qué son Materialized Views?

Las Materialized Views son resultados pre-calculados de queries complejas que se almacenan en la base de datos para mejorar el rendimiento. En lugar de ejecutar aggregation pipelines costosos cada vez que se solicita analytics, se calculan una vez y se reutilizan.

**MongoDB no tiene materialized views nativas**, por lo que implementamos una solución usando:
- Colecciones separadas para almacenar resultados pre-calculados
- TTL indexes para limpieza automática de datos antiguos
- Cron jobs para refrescar vistas periódicamente

---

## ✅ Beneficios

1. **Performance Mejorado**: 
   - Queries de analytics pasan de 2-5 segundos a <100ms
   - Reducción de carga en la base de datos primaria
   - Mejor experiencia de usuario en dashboards

2. **Escalabilidad**:
   - Soporta más usuarios consultando analytics simultáneamente
   - Reduce el impacto de queries pesadas en producción

3. **Flexibilidad**:
   - Se puede habilitar/deshabilitar fácilmente
   - Fallback automático a cálculo en tiempo real si la vista no está disponible

---

## ⚙️ Configuración

### Habilitar Materialized Views

Agrega la siguiente variable de entorno:

```bash
# .env.local o .env
ENABLE_ANALYTICS_MATERIALIZED_VIEWS=true
```

### Variables de Entorno Relacionadas

```bash
# Tiempo máximo de antigüedad de vistas (en segundos)
# Default: 3600 (1 hora)
ANALYTICS_VIEW_MAX_AGE=3600

# CRON_SECRET para el cron job de refresco
CRON_SECRET=your-secret-key-here
```

---

## 🔄 Cómo Funciona

### 1. Estructura de Datos

Las vistas materializadas se almacenan en la colección `analyticsmaterializedviews` con la siguiente estructura:

```typescript
{
  companyId: ObjectId,
  viewType: 'client_profitability' | 'product_profitability' | 'trends',
  period: 'daily' | 'monthly' | 'all_time',
  periodKey: string, // e.g., '2024-01-15_2024-01-31' o 'all'
  data: any, // Los resultados pre-calculados
  lastUpdated: Date,
  expiresAt?: Date, // Para TTL cleanup
}
```

### 2. Flujo de Consulta

Cuando se solicita analytics (`GET /api/analytics`):

1. **Intenta obtener de vista materializada**:
   - Busca vista con `companyId`, `viewType`, `period`, `periodKey`
   - Verifica que `lastUpdated` sea reciente (< 1 hora por defecto)
   - Si existe y está fresca, retorna inmediatamente

2. **Si no existe o está desactualizada**:
   - Calcula en tiempo real usando aggregation pipelines
   - Guarda resultado en vista materializada (async, no bloquea respuesta)
   - Retorna resultado calculado

3. **Fallback**:
   - Si materialized views están deshabilitadas, siempre calcula en tiempo real
   - Si hay error al obtener vista, calcula en tiempo real

### 3. Tipos de Vistas

#### Client Profitability
- **Qué calcula**: Rentabilidad por cliente (revenue, cost, profit, margin)
- **Cuándo se usa**: Dashboard de analytics, reportes de clientes
- **Frecuencia de actualización**: Cada hora (cron job) o cuando se marca invoice como 'paid'

#### Product Profitability
- **Qué calcula**: Rentabilidad por producto (revenue, quantity, margin)
- **Cuándo se usa**: Dashboard de analytics, reportes de productos
- **Frecuencia de actualización**: Cada hora (cron job) o cuando se marca invoice como 'paid'

#### Trends
- **Qué calcula**: Tendencias mensuales (revenue, expenses, profit por mes)
- **Cuándo se usa**: Gráficos de tendencias, comparaciones año sobre año
- **Frecuencia de actualización**: Cada hora (cron job) o cuando cambian invoices/expenses

---

## 🔄 Invalidación de Vistas

Las vistas se invalidan automáticamente cuando:

### 1. Cambios en Invoices

- ✅ Cuando se crea una invoice con status 'paid'
- ✅ Cuando se actualiza una invoice a status 'paid'
- ⚠️ **Nota**: Invalidación asíncrona (no bloquea la operación)

### 2. Cambios en Expenses

- ⚠️ **Pendiente**: Invalidación cuando se aprueba/paga un expense
- 💡 **Solución temporal**: El cron job refresca todas las vistas cada hora

### 3. Cron Job Automático

El cron job `/api/cron/refresh-analytics-views` se ejecuta cada hora y:
- Genera vistas "all_time" para todas las empresas
- Genera vistas mensuales para el mes actual y anterior
- Limpia vistas expiradas automáticamente (TTL index)

### 4. Invalidación Manual

```typescript
import { AnalyticsMaterializedViewsService } from '@/lib/services/analytics-materialized-views';

// Invalidar todas las vistas de una empresa
await AnalyticsMaterializedViewsService.invalidateViews(companyId);

// Invalidar solo tipos específicos
await AnalyticsMaterializedViewsService.invalidateViews(companyId, [
  'client_profitability',
  'product_profitability',
]);
```

---

## 🔧 Mantenimiento

### Crear Índices

Los índices se crean automáticamente al ejecutar `createIndexes()`:

```typescript
import { createIndexes } from '@/lib/indexes';
await createIndexes();
```

Índices creados:
- `{ companyId: 1, viewType: 1, period: 1, periodKey: 1 }` (unique)
- `{ companyId: 1, viewType: 1, lastUpdated: -1 }`
- `{ expiresAt: 1 }` (TTL index)

### Limpieza Automática

- **TTL Index**: Elimina vistas con `expiresAt` pasado automáticamente
- **Cron Job**: Refresca vistas periódicamente
- **Limpieza manual**: No necesaria, pero puedes ejecutar:

```javascript
// En mongosh
db.analyticsmaterializedviews.deleteMany({
  expiresAt: { $lt: new Date() }
});
```

### Monitoreo de Espacio

```javascript
// Ver tamaño de la colección
db.analyticsmaterializedviews.stats()

// Ver cantidad de vistas por empresa
db.analyticsmaterializedviews.aggregate([
  { $group: { _id: '$companyId', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

---

## 📊 Monitoreo

### Métricas Clave

1. **Cache Hit Rate**:
   - Monitorear logs para ver cuántas veces se usa cache vs cálculo en tiempo real
   - Objetivo: >80% cache hits

2. **Tiempo de Respuesta**:
   - Con cache: <100ms
   - Sin cache: 2-5 segundos

3. **Espacio de Almacenamiento**:
   - Monitorear tamaño de `analyticsmaterializedviews`
   - TTL index limpia automáticamente

### Logs

Los logs incluyen información sobre:
- Cache hits/misses
- Errores al guardar vistas
- Errores al invalidar vistas

```typescript
// Ejemplo de log
logger.debug('Materialized view cache hit', {
  companyId: '...',
  viewType: 'client_profitability',
  period: 'all_time',
});
```

---

## 🚀 Mejores Prácticas

1. **Habilitar en Producción**:
   - Solo habilitar cuando tengas suficiente tráfico de analytics
   - Monitorear impacto en almacenamiento

2. **Ajustar Max Age**:
   - Para datos más frescos: reducir `ANALYTICS_VIEW_MAX_AGE` (ej: 1800 = 30 min)
   - Para mejor performance: aumentar (ej: 7200 = 2 horas)

3. **Invalidación Selectiva**:
   - Invalidar solo vistas afectadas por cambios
   - No invalidar todas las vistas si solo cambió un invoice

4. **Monitoreo Continuo**:
   - Revisar logs periódicamente
   - Verificar que el cron job se ejecute correctamente
   - Monitorear tamaño de colección

---

## 🔗 Archivos Relacionados

- `src/lib/models/AnalyticsMaterializedView.ts` - Modelo de datos
- `src/lib/services/analytics-materialized-views.ts` - Servicio de gestión
- `src/app/api/analytics/route.ts` - Endpoint que usa las vistas
- `src/app/api/cron/refresh-analytics-views/route.ts` - Cron job de refresco
- `src/lib/indexes.ts` - Creación de índices

---

## 📝 Resumen

**Materialized Views** mejoran significativamente el rendimiento de analytics al pre-calcular resultados complejos. La implementación:

- ✅ Se integra transparentemente con el código existente
- ✅ Tiene fallback automático si está deshabilitada
- ✅ Se mantiene automáticamente con cron jobs y TTL indexes
- ✅ Es configurable y monitoreable

**Recomendación**: Habilitar en producción cuando tengas >100 consultas de analytics por día.

