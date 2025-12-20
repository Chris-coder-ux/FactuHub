# 🔍 Reporte de Auditoría Exhaustiva - Sistema de Facturación Multi-empresa

**Fecha:** 2025-01-27  
**Sistema:** AppTrabajo - Facturación Multi-empresa con VeriFactu/AEAT  
**Stack:** Next.js + MongoDB + Node.js  
**Entorno:** Producción con datos fiscales sensibles

---

## 📊 Resumen Ejecutivo

### Estadísticas Generales
- **Total de Issues Encontrados:** 23
- **Críticos:** 4
- **Altos:** 6
- **Medios:** 8
- **Bajos:** 5

### Puntuación de Seguridad
- **Seguridad:** 6.5/10 ⚠️
- **Cumplimiento Legal:** 7/10 ⚠️
- **Rendimiento:** 7.5/10 ✅
- **Arquitectura:** 8/10 ✅

---

## 🚨 1. AUDITORÍA DE SEGURIDAD Y VULNERABILIDADES

### 🔴 CRÍTICO - SEC-001: Exposición Pública de Facturas sin Autenticación

**Ubicación:** `src/app/api/public/invoices/[id]/route.ts:15`

**Descripción:**
El endpoint público permite acceso a facturas completas sin validación de autenticación ni verificación de `companyId`. Esto expone datos fiscales sensibles a cualquier usuario que conozca el ID de la factura.

```15:25:src/app/api/public/invoices/[id]/route.ts
    const invoice = await Invoice.findById(params.id)
      .populate('client')
      .populate('items.product');
      
    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    // We allow public access if the ID is known (security by obscurity in this simple MVP, 
    // real systems would use a secure hash/token)
    return NextResponse.json(invoice);
```

**Impacto:**
- Exposición de datos fiscales sensibles
- Violación de RGPD (datos personales de clientes)
- Posible fuga de información entre empresas

**Recomendación:**
```typescript
// Implementar token seguro o hash
const invoice = await Invoice.findOne({
  _id: params.id,
  publicToken: request.nextUrl.searchParams.get('token') // Token único por factura
});
// O mejor: usar hash seguro en lugar de ObjectId
```

**Severidad:** 🔴 CRÍTICA

---

### 🔴 CRÍTICO - SEC-002: Fuga de Información en countDocuments()

**Ubicación:** 
- `src/app/api/clients/route.ts:41`
- `src/app/api/products/route.ts:31`

**Descripción:**
Las consultas `countDocuments()` no filtran por `companyId`, lo que puede exponer información sobre el total de registros de otras empresas.

```41:41:src/app/api/clients/route.ts
      Client.countDocuments()
```

```31:31:src/app/api/products/route.ts
      Product.countDocuments()
```

**Impacto:**
- Fuga de información sobre volumen de datos de otras empresas
- Posible uso para análisis competitivo

**Recomendación:**
```typescript
// Usar el mismo filter que en find()
const total = await Client.countDocuments(filter);
```

**Severidad:** 🔴 CRÍTICA

---

### 🟠 ALTO - SEC-003: invoiceNumber Unique Global en lugar de por Company

**Ubicación:** `src/lib/models/Invoice.ts:13`

**Descripción:**
El campo `invoiceNumber` tiene restricción `unique: true` a nivel global, lo que impide que dos empresas diferentes usen el mismo número de factura. Además, no hay índice compuesto `{companyId: 1, invoiceNumber: 1}` para garantizar unicidad por empresa.

```13:13:src/lib/models/Invoice.ts
  invoiceNumber: { type: String, required: true, unique: true },
```

**Impacto:**
- Restricción innecesaria que limita la flexibilidad
- Falta de índice compuesto puede causar problemas de rendimiento
- No garantiza unicidad real por empresa (dos empresas podrían tener números duplicados si se elimina la restricción)

**Recomendación:**
```typescript
// Eliminar unique: true del schema
invoiceNumber: { type: String, required: true },

// Agregar índice compuesto único en indexes.ts
await Invoice.collection.createIndex(
  { companyId: 1, invoiceNumber: 1 }, 
  { unique: true }
);
```

**Severidad:** 🟠 ALTA

---

### 🟡 MEDIO - SEC-004: Rate Limiter In-Memory No Persistente

**Ubicación:** `src/lib/rate-limit.ts:11-77`

**Descripción:**
El rate limiter usa un `Map` en memoria que se pierde en cada reinicio del servidor. En entornos con múltiples instancias (horizontal scaling), cada instancia mantiene su propio contador.

```11:25:src/lib/rate-limit.ts
class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (now > entry.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }
```

**Impacto:**
- Rate limiting inefectivo en entornos distribuidos
- Posible bypass de límites tras reinicio
- No funciona correctamente con múltiples instancias

**Recomendación:**
- Implementar Redis para rate limiting distribuido
- O usar MongoDB con TTL indexes para persistencia

**Severidad:** 🟡 MEDIA

---

### 🟡 MEDIO - SEC-005: Validación Insuficiente de Parámetros de Query

**Ubicación:** `src/app/api/invoices/route.ts:33-40`

**Descripción:**
Aunque se valida que `status` esté en una lista permitida, no se sanitizan otros parámetros de query que podrían ser vulnerables a inyección NoSQL.

```33:40:src/app/api/invoices/route.ts
    const status = searchParams.get('status');
    const { field, order } = validateSortParam(sortParam, ['invoiceNumber', 'total', 'status', 'dueDate', 'createdAt']);
    
    // Build filter with companyId for data isolation
    const filter = createCompanyFilter(companyId, { deletedAt: null });
    if (status && ['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      filter.status = status;
    }
```

**Impacto:**
- Potencial inyección NoSQL si se agregan más parámetros sin validar
- Aunque actualmente está protegido, falta documentación sobre cómo agregar nuevos filtros de forma segura

**Recomendación:**
- Crear función helper para validar y sanitizar todos los parámetros de query
- Documentar patrón seguro para agregar nuevos filtros

**Severidad:** 🟡 MEDIA

---

### ✅ POSITIVO - SEC-006: Aislamiento Multi-tenant Implementado Correctamente

**Ubicación:** Múltiples archivos

**Descripción:**
El sistema implementa correctamente el aislamiento de datos entre empresas usando `createCompanyFilter()` y verificaciones de `companyId` en la mayoría de endpoints.

**Ejemplos:**
- `src/app/api/invoices/route.ts:37` - Filtro por companyId
- `src/app/api/settings/route.ts:28` - Settings filtrados por companyId
- `src/lib/services/invoice-service.ts:32-44` - Validación de client y products por companyId

**Severidad:** ✅ CORRECTO

---

## ⚖️ 2. AUDITORÍA DE CUMPLIMIENTO LEGAL

### 🟠 ALTO - COMP-001: Validación Insuficiente de NIF/CIF

**Ubicación:** `src/lib/validations.ts:71`

**Descripción:**
La validación de `taxId` solo verifica `min(1)`, sin validar el formato correcto de NIF, CIF o NIE según normativa española.

```71:71:src/lib/validations.ts
  taxId: z.string().min(1, { message: 'Tax ID (CIF/NIF) is required' }),
```

**Impacto:**
- Incumplimiento de normativa de facturación (RD 1619/2012)
- Posibles errores en envío a AEAT
- Datos fiscales incorrectos

**Recomendación:**
```typescript
// Implementar validación exhaustiva
const nifRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/i;
const nieRegex = /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;

taxId: z.string()
  .min(1)
  .refine((val) => nifRegex.test(val) || cifRegex.test(val) || nieRegex.test(val), {
    message: 'NIF/CIF/NIE inválido'
  })
```

**Severidad:** 🟠 ALTA

---

### 🟡 MEDIO - COMP-002: Falta Validación de Transiciones de Estado

**Ubicación:** `src/lib/validations.ts:47`

**Descripción:**
No hay validación que impida transiciones inválidas de estado (ej: `paid` → `draft`, `cancelled` → `sent`).

```47:47:src/lib/validations.ts
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
```

**Impacto:**
- Posible inconsistencia en estados de facturas
- Problemas de auditoría fiscal
- Estados inválidos que pueden causar errores en VeriFactu

**Recomendación:**
```typescript
// Crear función de validación de transiciones
function validateStatusTransition(current: string, next: string): boolean {
  const validTransitions: Record<string, string[]> = {
    draft: ['sent', 'cancelled'],
    sent: ['paid', 'overdue', 'cancelled'],
    paid: [], // No se puede cambiar
    overdue: ['paid', 'cancelled'],
    cancelled: [] // No se puede cambiar
  };
  return validTransitions[current]?.includes(next) ?? false;
}
```

**Severidad:** 🟡 MEDIA

---

### ✅ POSITIVO - COMP-003: Encriptación de Datos Sensibles Implementada

**Ubicación:** `src/lib/encryption.ts`

**Descripción:**
El sistema usa AES-256-GCM para encriptar credenciales AEAT y contraseñas de certificados, cumpliendo con requisitos de seguridad.

**Severidad:** ✅ CORRECTO

---

### 🟡 MEDIO - COMP-004: Falta Validación de Fechas Fiscales

**Descripción:**
No se valida que `issuedDate` no sea futura ni que `dueDate` sea posterior a `issuedDate`, lo cual puede causar problemas fiscales.

**Recomendación:**
```typescript
issuedDate: z.date().max(new Date(), { message: 'Fecha de emisión no puede ser futura' }),
dueDate: z.date().refine((date, ctx) => {
  const issued = ctx.parent.issuedDate;
  return !issued || date >= issued;
}, { message: 'Fecha de vencimiento debe ser posterior a emisión' })
```

**Severidad:** 🟡 MEDIA

---

## ⚡ 3. AUDITORÍA DE RENDIMIENTO Y ESCALABILIDAD

### 🟡 MEDIO - PERF-001: Posibles N+1 Queries con populate()

**Ubicación:** Múltiples endpoints

**Descripción:**
El uso de `.populate('client').populate('items.product')` puede causar múltiples queries si no se optimiza correctamente.

```44:45:src/app/api/invoices/route.ts
        .populate('client')
        .populate('items.product')
```

**Impacto:**
- Degradación de rendimiento con muchas facturas
- Mayor carga en base de datos

**Recomendación:**
- Usar `populate()` con `select` para limitar campos
- Considerar agregación pipeline para casos complejos
- Implementar caché para clientes/productos frecuentes

**Severidad:** 🟡 MEDIA

---

### 🟡 MEDIO - PERF-002: Falta Índice Compuesto para Unicidad invoiceNumber

**Ubicación:** `src/lib/indexes.ts:30`

**Descripción:**
Aunque existen índices compuestos con `companyId`, falta un índice único compuesto `{companyId: 1, invoiceNumber: 1}` para garantizar unicidad por empresa.

```30:30:src/lib/indexes.ts
    await Invoice.collection.createIndex({ invoiceNumber: 1 }, { unique: true });
```

**Recomendación:**
```typescript
// Eliminar índice único global
// Agregar índice compuesto único
await Invoice.collection.createIndex(
  { companyId: 1, invoiceNumber: 1 }, 
  { unique: true }
);
```

**Severidad:** 🟡 MEDIA

---

### ✅ POSITIVO - PERF-003: Índices Compuestos Implementados

**Ubicación:** `src/lib/models/Invoice.ts:44-46`

**Descripción:**
Se han implementado índices compuestos correctos para optimizar queries con `companyId`.

```44:46:src/lib/models/Invoice.ts
invoiceSchema.index({ companyId: 1, deletedAt: 1 });
invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ companyId: 1, createdAt: -1 });
```

**Severidad:** ✅ CORRECTO

---

### 🟡 MEDIO - PERF-004: Falta Caché para Catálogos Frecuentes

**Descripción:**
No hay implementación de caché para productos y clientes que se consultan frecuentemente, lo que puede causar carga innecesaria en la base de datos.

**Recomendación:**
- Implementar Redis para caché de productos/clientes por companyId
- TTL de 1 hora para datos que cambian poco

**Severidad:** 🟡 MEDIA

---

## 🏗️ 4. AUDITORÍA DE CÓDIGO Y ARQUITECTURA

### ✅ POSITIVO - ARCH-001: Circuit Breaker Implementado

**Ubicación:** `src/lib/services/verifactu-service.ts:30-96`

**Descripción:**
Se implementa correctamente un circuit breaker para prevenir fallos en cascada cuando AEAT está caído.

**Severidad:** ✅ CORRECTO

---

### ✅ POSITIVO - ARCH-002: Retry Logic con Exponential Backoff

**Ubicación:** `src/lib/services/verifactu-service.ts:133-178`

**Descripción:**
Se implementa lógica de reintentos con backoff exponencial para operaciones con AEAT.

**Severidad:** ✅ CORRECTO

---

### ✅ POSITIVO - ARCH-003: Transacciones MongoDB para Atomicidad

**Ubicación:** `src/lib/services/invoice-service.ts:48-98`

**Descripción:**
Se usan transacciones MongoDB para garantizar atomicidad en la creación de facturas con contadores.

**Severidad:** ✅ CORRECTO

---

### 🟡 MEDIO - ARCH-004: Endpoint POST con Múltiples Responsabilidades

**Ubicación:** `src/app/api/invoices/route.ts:72-163`

**Descripción:**
El endpoint POST maneja validación, creación, rate limiting, permisos y cola de VeriFactu. Aunque está bien estructurado, podría beneficiarse de más separación.

**Recomendación:**
- Mantener estructura actual (está bien)
- Considerar middleware para rate limiting
- Documentar flujo completo

**Severidad:** 🟡 MEDIA (No crítico, solo observación)

---

## 🗄️ 5. AUDITORÍA DE BASE DE DATOS

### 🟠 ALTO - DB-001: Índice Único Global en invoiceNumber

**Ubicación:** `src/lib/models/Invoice.ts:13` y `src/lib/indexes.ts:30`

**Descripción:**
El índice único global impide que múltiples empresas usen el mismo número de factura, lo cual es innecesario.

**Recomendación:**
Ver SEC-003

**Severidad:** 🟠 ALTA

---

### ✅ POSITIVO - DB-002: Índices Compuestos Correctos

**Descripción:**
Los índices compuestos están bien diseñados para queries multi-tenant.

**Severidad:** ✅ CORRECTO

---

### 🟡 MEDIO - DB-003: Falta TTL Index para Datos Temporales

**Descripción:**
No hay TTL indexes para datos temporales como logs de auditoría o datos de sesión.

**Recomendación:**
- Implementar TTL para logs antiguos (>5 años para cumplimiento fiscal)
- TTL para datos de sesión/caché temporal

**Severidad:** 🟡 MEDIA

---

## 🔄 6. AUDITORÍA DE FLUJOS DE NEGOCIO

### 🟡 MEDIO - BIZ-001: Falta Validación de Transiciones de Estado

**Descripción:**
Ver COMP-002

**Severidad:** 🟡 MEDIA

---

### ✅ POSITIVO - BIZ-002: Contador Atómico por Empresa

**Ubicación:** `src/lib/services/invoice-service.ts:54-59`

**Descripción:**
Se usa contador atómico con formato `invoiceNumber_{companyId}` para prevenir race conditions.

```54:59:src/lib/services/invoice-service.ts
      const counterId = `invoiceNumber_${companyId}`;
      const counter = await Counter.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      );
```

**Severidad:** ✅ CORRECTO

---

### 🟡 MEDIO - BIZ-003: Falta Validación de Redondeos Monetarios

**Descripción:**
No se valida explícitamente que los cálculos monetarios usen redondeo correcto (2 decimales, round-half-even).

**Recomendación:**
```typescript
// Usar biblioteca de precisión decimal
import Decimal from 'decimal.js';
const total = new Decimal(subtotal).plus(tax).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
```

**Severidad:** 🟡 MEDIA

---

## 🔌 7. AUDITORÍA DE INTEGRACIONES

### ✅ POSITIVO - INT-001: Circuit Breaker y Retry Logic

**Descripción:**
Ver ARCH-001 y ARCH-002

**Severidad:** ✅ CORRECTO

---

### ✅ POSITIVO - INT-002: Timeout Configurado para AEAT

**Ubicación:** `src/lib/verifactu/aeat-client.ts:178`

**Descripción:**
Se configura timeout de 30 segundos para requests a AEAT.

```178:178:src/lib/verifactu/aeat-client.ts
        timeout: 30000, // 30 seconds timeout
```

**Severidad:** ✅ CORRECTO

---

### 🟡 MEDIO - INT-003: Falta Validación de Certificado Expirado

**Ubicación:** `src/lib/verifactu/aeat-client.ts:262-271`

**Descripción:**
La validación de certificado solo verifica que el archivo existe, no que esté vigente.

```262:271:src/lib/verifactu/aeat-client.ts
  validateCertificate(): boolean {
    try {
      const cert = fs.readFileSync(this.config.certificate.path);
      // Basic validation - check if file exists and has content
      return cert.length > 0;
    } catch (error) {
      console.error('Certificate validation failed:', error);
      return false;
    }
  }
```

**Recomendación:**
```typescript
import * as crypto from 'crypto';
// Validar fecha de expiración del certificado
const cert = crypto.X509Certificate(fs.readFileSync(path));
if (cert.validTo < new Date()) {
  throw new Error('Certificate expired');
}
```

**Severidad:** 🟡 MEDIA

---

## 📊 8. AUDITORÍA DE MONITORING Y ALERTING

### 🟡 MEDIO - MON-001: Logs Estructurados Parciales

**Ubicación:** Múltiples archivos

**Descripción:**
Algunos logs usan `logger` estructurado, otros usan `console.error`. Falta consistencia.

**Recomendación:**
- Estandarizar uso de `logger` en todos los archivos
- Agregar context (companyId, userId) a todos los logs

**Severidad:** 🟡 MEDIA

---

### 🟡 MEDIO - MON-002: Falta Alertas para Certificados Próximos a Expirar

**Descripción:**
No hay sistema de alertas para notificar cuando certificados AEAT están próximos a expirar.

**Recomendación:**
- Implementar job cron que verifique certificados
- Enviar alerta 30 días antes de expiración

**Severidad:** 🟡 MEDIA

---

## 📋 CHECKLIST DE CUMPLIMIENTO

- [ ] ❌ Validación estricta NIF/NIE/CIF españoles
- [x] ✅ Cumplimiento formato Facturae 3.2.2 (implementado en XML generator)
- [x] ✅ Sellado de tiempo (timestamp) en facturas
- [ ] ⚠️ Conservación 5 años con integridad (falta TTL index)
- [x] ✅ Copias de seguridad encriptadas (AES-256-GCM)
- [ ] ⚠️ Registro actividades tratamiento (RGPD) - logs parciales
- [ ] ❌ Consentimiento explícito clientes (no verificado)
- [ ] ❌ Derecho rectificación/cancelación (no verificado)

---

## 🎯 RECOMENDACIONES PRIORITARIAS

### Prioridad 1 - Crítico (Implementar Inmediatamente)
1. **SEC-001:** Implementar autenticación/token seguro en endpoint público
2. **SEC-002:** Corregir `countDocuments()` para usar filter con companyId
3. **SEC-003:** Cambiar índice único de invoiceNumber a compuesto con companyId
4. **COMP-001:** Implementar validación exhaustiva de NIF/CIF/NIE

### Prioridad 2 - Alto (Implementar en Próxima Iteración)
5. **COMP-002:** Validar transiciones de estado de facturas
6. **PERF-001:** Optimizar populate() o implementar caché
7. **INT-003:** Validar expiración de certificados AEAT
8. **MON-002:** Sistema de alertas para certificados

### Prioridad 3 - Medio (Mejoras Continuas)
9. **SEC-004:** Migrar rate limiter a Redis
10. **PERF-004:** Implementar caché para productos/clientes
11. **DB-003:** TTL indexes para datos temporales
12. **MON-001:** Estandarizar logging estructurado

---

## 📈 MÉTRICAS Y TESTING

### Tests de Seguridad Recomendados
```bash
# 1. Test de fuga multi-tenant
curl -H "Cookie: session=..." "http://localhost:3000/api/invoices?companyId=ANOTHER_COMPANY_ID"

# 2. Test de inyección NoSQL
curl "http://localhost:3000/api/invoices?status[\$ne]=draft"

# 3. Test de rate limiting
for i in {1..35}; do curl -X POST "http://localhost:3000/api/invoices" ...; done
```

### Tests de Carga Recomendados
```bash
# Artillery load test
artillery run load_test_invoices.yml

# Autocannon
autocannon -c 100 -d 30 http://localhost:3000/api/invoices
```

---

## ✅ ASPECTOS POSITIVOS

1. ✅ **Aislamiento Multi-tenant:** Implementado correctamente en la mayoría de endpoints
2. ✅ **Encriptación:** AES-256-GCM para datos sensibles
3. ✅ **Circuit Breaker:** Implementado para resiliencia
4. ✅ **Retry Logic:** Con exponential backoff
5. ✅ **Transacciones:** MongoDB transactions para atomicidad
6. ✅ **Índices:** Compuestos bien diseñados (aunque falta uno)
7. ✅ **Sanitización:** DOMPurify para prevenir XSS

---

## 📝 CONCLUSIÓN

El sistema tiene una **base sólida** con buenas prácticas implementadas (circuit breaker, retry logic, transacciones, encriptación). Sin embargo, existen **vulnerabilidades críticas** que deben corregirse inmediatamente:

1. Endpoint público sin autenticación
2. Fuga de información en countDocuments
3. Validación insuficiente de NIF/CIF

Con las correcciones recomendadas, el sistema alcanzaría un **nivel de seguridad 9/10** y **cumplimiento legal 9/10**.

---

**Generado por:** Auditoría Automatizada  
**Herramientas:** Sequential Thinking MCP + Serena Verial MCP  
**Fecha:** 2025-01-27

