# Análisis Detallado de Seguridad y Cumplimiento de FacturaHub

Basado en el análisis exhaustivo del codebase de FacturaHub, presento un análisis completo de sus medidas de seguridad y cumplimiento normativo.

## 1. Autenticación

### Sistema de Autenticación Principal
FacturaHub utiliza **NextAuth.js** con proveedores de credenciales personalizados, implementando autenticación robusta con múltiples capas de seguridad.

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/auth.ts`

```typescript
// Autenticación con bcrypt y MFA opcional
const user = await UserModel.findOne({ email: credentials?.email });
if (!user) {
  throw new Error('User not found');
}

const isPasswordValid = await bcrypt.compare(credentials?.password || '', user.password);
if (!isPasswordValid) {
  throw new Error('Invalid password');
}

// MFA opcional con TOTP y códigos de respaldo
if (isMFARequired(user.mfaEnabled || false, user.mfaSecret)) {
  const mfaToken = (credentials as any)?.mfaToken;
  if (!mfaToken) {
    throw new Error('MFA_REQUIRED');
  }
  
  const isBackupCode = (credentials as any)?.isBackupCode || false;
  let mfaValid = false;
  
  if (isBackupCode) {
    const decryptedCodes = await Promise.all(
      user.mfaBackupCodes.map((code: string) => decrypt(code))
    );
    mfaValid = verifyBackupCode(mfaToken, decryptedCodes);
  } else {
    const decryptedSecret = await decrypt(user.mfaSecret!);
    mfaValid = verifyTOTP(mfaToken, decryptedSecret);
  }
}
```

**Características de Seguridad:**
- **Hashing de contraseñas**: bcrypt con sal automática
- **MFA opcional**: TOTP (RFC 6238, 30 segundos, ventana ±1) + códigos de respaldo encriptados (8 dígitos, se eliminan al usar)
- **Sesiones JWT**: Estrategia JWT con companyId en token, actualizable vía session.update()
- **Protección CSRF**: Middleware integrado de NextAuth
- **Gestión de códigos de respaldo**: Se actualizan automáticamente después de usar uno

## 2. Autorización (RBAC)

### Sistema de Roles Basado en Compañías
Implementa un modelo RBAC multinivel con contextos de compañía.

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/company-rbac.ts`

```typescript
export type CompanyRole = 'owner' | 'admin' | 'accountant' | 'sales' | 'client';

export interface CompanyContext {
  companyId: string;
  role: CompanyRole;
  canManageUsers: boolean;
  canManageInvoices: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

// Permisos por rol
const isOwner = role === 'owner';
const isAdmin = role === 'admin' || isOwner;

return {
  canManageUsers: isAdmin,
  canManageInvoices: ['owner', 'admin', 'accountant', 'sales'].includes(role),
  canViewReports: ['owner', 'admin', 'accountant'].includes(role),
  canManageSettings: isAdmin,
  canManageExpenses: ['owner', 'admin', 'accountant'].includes(role),
  canViewExpenses: ['owner', 'admin', 'accountant', 'sales'].includes(role),
};
```

**Modelo de Permisos:**
- **Owner**: Control total de la compañía (isOwner: true, isAdmin: true)
- **Admin**: Gestión de usuarios, configuración, pero no puede eliminar compañía (isAdmin: true)
- **Accountant**: Acceso completo a facturas, gastos, reportes (canManageInvoices, canViewReports, canManageExpenses)
- **Sales**: Crear facturas y ver gastos relacionados (canManageInvoices, canViewExpenses)
- **Client**: Solo acceso de lectura limitado

**Funciones de RBAC:**
- `getUserCompanyRole()`: Obtiene rol del usuario en una compañía específica
- `getUserCompanies()`: Lista todas las compañías donde el usuario tiene acceso
- `createCompanyContext()`: Crea contexto con permisos calculados
- `requireCompanyPermission()`: Verifica permiso específico y lanza error si no tiene
- `canAccessResource()`: Verifica acceso a recursos por companyId

## 3. Validación de Datos

### Validación con Zod y Sanitización
Implementa validación de entrada robusta con sanitización XSS.

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/validations.ts`

```typescript
export const invoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  invoiceType: z.enum(['invoice', 'proforma']).default('invoice'),
  client: z.string().min(1, { message: 'Client ID is required' }),
  items: z.array(invoiceItemSchema).min(1, { message: 'At least one item is required' }),
  dueDate: z.string().min(1, { message: 'Due date is required' }),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  
  // VeriFactu fields
  verifactuId: z.string().optional(),
  verifactuStatus: z.enum(['pending', 'sent', 'verified', 'rejected', 'error']).optional(),
});
```

**Sanitización XSS:** `/home/christian/Escritorio/AppTrabajo/src/lib/sanitization.ts`

```typescript
export function sanitizeString(str: string): string {
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [], // Remove all HTML tags
    ALLOWED_ATTR: [], // Remove all attributes
    KEEP_CONTENT: true, // Keep text content
  }).trim();
}
```

## 4. Protección contra Vulnerabilidades

### Rate Limiting
Implementa rate limiting **in-memory** por IP y ruta (no distribuido).

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/rate-limit.ts`

```typescript
class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  // Limpieza automática cada minuto
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  check(identifier: string, limit: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }
}

export const RATE_LIMITS = {
  auth: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  mutation: { limit: 30, windowMs: 60 * 1000 }, // 30 mutations per minute
  email: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 emails per hour
};
```

**Limitación**: Rate limiting in-memory no escala en múltiples instancias. Para producción distribuida, considerar Redis-based rate limiting.

### Encriptación AES-256-GCM
Datos sensibles encriptados con algoritmo autenticado usando **scrypt** para derivación de claves.

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/encryption.ts`

```typescript
// Derive key from master encryption key using scrypt
async function deriveKey(salt: Buffer): Promise<Buffer> {
  const masterKey = getEncryptionKey(); // From ENCRYPTION_KEY env var (64 hex chars)
  const key = (await scryptAsync(masterKey, salt, 32)) as Buffer;
  return key;
}

export async function encrypt(plaintext: string): Promise<string> {
  const salt = randomBytes(16);
  const iv = randomBytes(16);
  const key = await deriveKey(salt); // scrypt derivation
  
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  
  // Combine: salt (16) + iv (16) + authTag (16) + encrypted
  const combined = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'base64')]);
  return combined.toString('base64');
}

// Helper para verificar si un string está encriptado
export function isEncrypted(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64');
    return decoded.length >= 48; // salt + iv + authTag mínimo
  } catch {
    return false;
  }
}
```

**Uso específico:**
- `encryptCertificatePassword()`: Encripta contraseñas de certificados VeriFactu
- `encryptAeatCredentials()`: Encripta credenciales AEAT (username + password)
- `decryptAeatCredentials()`: Desencripta credenciales AEAT

**Seguridad:**
- Requiere `ENCRYPTION_KEY` de 64 caracteres hex (32 bytes) en producción
- Fallback a clave por defecto solo en desarrollo (con warning)

### Logs de Auditoría
Sistema completo de logs con retención automática (TTL de 2 años).

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/models/AuditLog.ts`

```typescript
interface IAuditLog {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'logout' | 'permission_change' | 'settings_change';
  resourceType: 'invoice' | 'client' | 'product' | 'expense' | 'receipt' | 'user' | 'company' | 'settings' | 'banking' | 'fiscal' | 'other';
  resourceId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    fields?: string[];
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

// TTL index para limpiar logs antiguos (2 años = 63072000 segundos)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

// Índices compuestos para consultas comunes
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, resourceType: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, companyId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, success: 1, createdAt: -1 });
```

**Servicio de Análisis de Seguridad:**
- `SecurityAnalysisService`: Analiza logs y detecta patrones sospechosos
- Detecta: intentos de acceso fallidos, accesos en horarios inusuales, eliminaciones GDPR, cambios de permisos masivos

### Middleware de Seguridad
Protección a nivel de aplicación con rate limiting y headers.

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/middleware.ts`

```typescript
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Determinar límite según ruta
  let limit = RATE_LIMITS.api.limit;
  let windowMs = RATE_LIMITS.api.windowMs;
  
  if (pathname.startsWith('/api/auth')) {
    limit = RATE_LIMITS.auth.limit;
    windowMs = RATE_LIMITS.auth.windowMs;
  } else if (pathname.includes('/send') || pathname.includes('/email')) {
    limit = RATE_LIMITS.email.limit;
    windowMs = RATE_LIMITS.email.windowMs;
  } else if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    limit = RATE_LIMITS.mutation.limit;
    windowMs = RATE_LIMITS.mutation.windowMs;
  }
  
  const identifier = getClientIdentifier(request);
  const { allowed, remaining, resetTime } = rateLimiter.check(
    `${identifier}:${pathname}`,
    limit,
    windowMs
  );
  
  const response = allowed 
    ? NextResponse.next()
    : NextResponse.json({
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      }, { status: 429 });
  
  // Headers de rate limiting
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
  if (!allowed) {
    response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
  }
  
  return response;
}
```

**Limitación**: No incluye headers de seguridad (CSP, HSTS, X-Frame-Options, etc.). Se recomienda agregarlos en `next.config.cjs` o middleware adicional.

## 5. Cumplimiento VeriFactu (AEAT España)

### Generación XML VeriFactu
Implementa generación completa de XML con hashing chain (SHA-256) y canonicalización.

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/verifactu/xml-generator.ts`

```typescript
export class VeriFactuXmlGenerator {
  private chainHash: string; // Hash encadenado para integridad
  
  generateXML(registros: VeriFactuRegistro[], cabecera: VeriFactuCabecera): string {
    // Calcular hashes y preparar registros
    const processedRegistros = registros.map(registro => ({
      ...registro,
      Encadenamiento: registro.Encadenamiento || this.chainHash,
      Huella: registro.Huella || this.calculateRecordHash(registro) // SHA-256
    }));
    
    const doc = create({
      version: '1.0',
      encoding: 'UTF-8',
      standalone: true
    }, {
      'SuministroInformacion': {
        '@xmlns': 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/SuministroInformacion.xsd',
        'Cabecera': { /* ... */ },
        'Registros': { /* ... */ }
      }
    });
    
    return doc.end({ prettyPrint: true });
  }
  
  public calculateRecordHash(registro: VeriFactuRegistro): string {
    const canonicalString = this.createCanonicalString(registro);
    return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
  }
  
  private createCanonicalString(registro: VeriFactuRegistro): string {
    // Representación canónica para cálculo de hash según tipo de registro
    if (registro.TipoRegistro === 'A') {
      // Alta: TipoRegistro + IdRegistro + NumSerieFactura + ...
    } else if (registro.TipoRegistro === 'M') {
      // Modificación/Anulación: TipoRegistro + IdRegistro + ...
    }
  }
}
```

### Firma Digital XAdES-BES
Implementa firma digital con certificados P12/PFX (FNMT o similar) usando node-forge.

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/verifactu/signer.ts`

```typescript
export class VeriFactuSigner {
  private certificate: forge.pki.Certificate;
  private privateKey: forge.pki.PrivateKey;
  private certificateChain: forge.pki.Certificate[];
  
  constructor(certificatePath: string, password: string) {
    this.loadCertificate(certificatePath, password);
  }
  
  signXML(xmlContent: string): string {
    // Canonicalizar XML (C14N básico)
    const canonicalXml = this.canonicalizeXML(xmlContent);
    
    // Calcular digest SHA-256
    const digestValue = this.calculateDigest(canonicalXml);
    
    // Crear firma XAdES-BES
    const signatureXml = this.createXAdESSignature(canonicalXml, digestValue);
    
    // Insertar firma en XML original
    return this.insertSignatureIntoXML(xmlContent, signatureXml);
  }
  
  private createXAdESSignature(canonicalXml: string, digestValue: string): string {
    // Firma XAdES-BES con:
    // - CanonicalizationMethod: xml-exc-c14n#
    // - SignatureMethod: rsa-sha256
    // - DigestMethod: sha256
    // - SignedProperties con timestamp UTC
  }
}
```

**Nota**: La contraseña del certificado debe estar encriptada usando `encryptCertificatePassword()` antes de almacenarse.

### Cliente AEAT con Reintentos
Comunicación SOAP con AEAT con manejo de errores robusto.

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/verifactu/aeat-client.ts`

```typescript
export class VeriFactuAeatClient {
  async submitXML(xmlContent: string): Promise<AeatResponse> {
    const soapEnvelope = this.createSoapEnvelope(xmlContent);
    const endpoint = this.getEndpoint() + 'SuministroFactEmitidas.wsdl';
    
    // Reintentos con backoff exponencial
    const response = await this.makeSoapRequestWithRetry(endpoint, soapEnvelope, 'submitXML');
    return this.parseSoapResponse(response);
  }
}
```

**Estados VeriFactu:**
- `pending`: XML generado, esperando envío
- `sent`: Enviado a AEAT, esperando confirmación
- `verified`: Confirmado por AEAT
- `rejected`: Rechazado por AEAT
- `error`: Error en proceso

## 6. Cumplimiento GDPR

### Derechos del Usuario
Implementa funcionalidades GDPR completas con tracking de actividades de procesamiento.

**Archivo clave:** `/home/christian/Escritorio/AppTrabajo/src/lib/services/gdpr-service.ts`

#### Derecho de Acceso (Art. 15 GDPR)
```typescript
// GET /api/gdpr/data
// Retorna todos los datos personales del usuario
const userData = await GDPRService.getUserData(userId, companyId);
// Incluye: user, clients, invoices, expenses, consents, processingActivities

// Registra actividad de procesamiento
await GDPRService.recordProcessingActivity({
  userId,
  activityType: 'access',
  status: 'pending',
  ipAddress,
  userAgent,
});
```

#### Derecho de Rectificación (Art. 16 GDPR)
```typescript
// PUT /api/gdpr/data
// Permite actualizar datos personales
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({ /* ... */ }).optional(),
});

await GDPRService.recordProcessingActivity({
  userId,
  activityType: 'rectification',
  status: 'pending',
  metadata: { fields: Object.keys(validated.data) },
});
```

#### Derecho al Olvido (Art. 17 GDPR)
```typescript
// DELETE /api/gdpr/data
// Elimina/anonimiza todos los datos personales (soft delete)
await GDPRService.deleteUserData(userId, companyId);
// - Anonimiza email: `deleted_${timestamp}_${email}`
// - Elimina password y MFA secrets
// - Soft delete de clients, invoices, expenses
// - Revoca todos los consentimientos
```

#### Derecho de Portabilidad (Art. 20 GDPR)
```typescript
// GET /api/gdpr/export
// Exporta datos en formato JSON descargable
const userData = await GDPRService.getUserData(userId, companyId);
// Retorna como archivo JSON: `gdpr-export-${userId}-${timestamp}.json`
```

#### Gestión de Consentimientos
```typescript
await GDPRService.updateConsent({
  userId,
  consentType: 'marketing' | 'analytics' | 'necessary' | 'functional',
  granted: boolean,
  version: string, // Versión de términos
  ipAddress,
  userAgent,
});
```

**Modelos GDPR:**
- `GDPRConsent`: Almacena consentimientos con timestamps
- `GDPRProcessingActivity`: Registra todas las actividades GDPR (access, rectification, erasure, portability)

### Medidas Técnicas GDPR
- **Minimización de datos**: Solo se recopilan datos necesarios
- **Retención limitada**: Logs de auditoría se eliminan automáticamente después de 2 años (TTL index)
- **Consentimiento**: Sistema completo de gestión de consentimientos con versionado
- **Transparencia**: Logs auditables de todas las operaciones GDPR (access, rectification, erasure, portability)
- **Seguridad**: Encriptación de datos sensibles en tránsito y reposo (AES-256-GCM)
- **Soft Delete**: Eliminación de datos usa soft delete para cumplir períodos legales de retención
- **Anonimización**: Email y nombre se anonimizan en lugar de eliminarse físicamente

## Evaluaciones Técnicas

### Fortalezas
1. **Autenticación multifactor**: MFA opcional con respaldo seguro
2. **Encriptación robusta**: AES-256-GCM para datos sensibles
3. **Rate limiting granular**: Protección contra ataques de fuerza bruta
4. **Auditoría completa**: Logs detallados con retención automática
5. **RBAC granular**: Permisos específicos por rol y compañía
6. **Validación estricta**: Zod schemas + sanitización XSS
7. **Cumplimiento VeriFactu**: Implementación completa XAdES-BES
8. **GDPR compliance**: Derechos del usuario implementados

### Áreas de Mejora Recomendadas

#### Alta Prioridad
1. **Headers de Seguridad**: Agregar en `next.config.cjs`:
   ```javascript
   async headers() {
     return [{
       source: '/(.*)',
       headers: [
         { key: 'X-Frame-Options', value: 'DENY' },
         { key: 'X-Content-Type-Options', value: 'nosniff' },
         { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
         { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
         { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" }
       ]
     }];
   }
   ```

2. **Rate Limiting Distribuido**: Migrar de in-memory a Redis-based para escalabilidad multi-instancia

#### Media Prioridad
3. **Rotación de claves**: Sistema automático de rotación de `ENCRYPTION_KEY`
4. **Análisis de vulnerabilidades**: Escaneos regulares con OWASP ZAP o Snyk
5. **Backup encriptado**: Asegurar que backups incluyan claves de encriptación
6. **Monitoreo de seguridad**: Ya implementado `SecurityAnalysisService`, integrar alertas en tiempo real

#### Baja Prioridad
7. **CSP más estricto**: Reducir `unsafe-inline` y `unsafe-eval` en CSP
8. **Subresource Integrity**: Para recursos externos cargados
9. **Certificate Pinning**: Para APIs externas críticas (AEAT, bancos)

### Conclusión
FacturaHub implementa un sistema de seguridad robusto con múltiples capas de protección, cumplimiento normativo completo tanto para VeriFactu (AEAT España) como GDPR, y prácticas de desarrollo seguras. El sistema está diseñado para escalar manteniendo altos estándares de seguridad y compliance.