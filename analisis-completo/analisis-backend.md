# Análisis Detallado de la Arquitectura Backend de FacturaHub

## Arquitectura General

FacturaHub es una aplicación full-stack construida con **Next.js 13+** siguiendo el patrón App Router, utilizando **MongoDB** como base de datos y **TypeScript** para type safety. La arquitectura implementa un modelo multi-tenant con aislamiento por empresa (company), siguiendo principios de seguridad y escalabilidad.

## 1. Rutas API

La aplicación expone una API RESTful organizada por módulos bajo `/api/`:

### Estructura Principal:
- **Autenticación**: `/api/auth/` (login, register, NextAuth.js)
- **Gestión de Empresas**: `/api/companies/` (CRUD multi-tenant, miembros, cambio de empresa)
- **Facturas**: `/api/invoices/` (CRUD con VeriFactu integration, PDF, envío, cancelación, checkout)
- **Clientes/Productos**: `/api/clients/`, `/api/products/` (compartición de productos)
- **Gastos/Recibos**: `/api/expenses/` (exportación, reportes), `/api/receipts/` (validación de precisión OCR)
- **Banca**: `/api/banking/` (cuentas, conexión OAuth, callback, reconciliación manual/automática, sincronización, transacciones, exportación, sugerencias)
- **Fiscal**: `/api/fiscal/` (validación, proyecciones, recordatorios, calendario, tendencias, precisión, análisis what-if)
- **Seguridad**: `/api/security/` (análisis, alertas, configuración, reportes, ejecución)
- **Soporte**: `/api/support/` (tickets, FAQ)
- **GDPR**: `/api/gdpr/` (consentimientos, datos, exportación)
- **MFA**: `/api/mfa/` (configuración, verificación, deshabilitación, estado)
- **Pagos**: `/api/payments/` (creación de intents Stripe)
- **Templates**: `/api/templates/` (CRUD, aplicación a facturas)
- **Analytics**: `/api/analytics/` (métricas y estadísticas)
- **Auditoría**: `/api/audit-logs/` (logs, estadísticas)
- **Tiempo Real**: `/api/realtime/events/` (Server-Sent Events)
- **Webhooks**: `/api/webhooks/stripe/`
- **Cron Jobs**: `/api/cron/` (recordatorios fiscales, verificación de vencimientos, facturas recurrentes, análisis de seguridad, limpieza de almacenamiento)

### Patrón de Rutas:
Cada ruta sigue el patrón Next.js App Router con archivos `route.ts` que exportan handlers HTTP (GET, POST, PUT, DELETE).

**Ejemplo de implementación** (`src/app/api/invoices/route.ts`):
```typescript
export async function GET(request: NextRequest) {
  const { session, companyId } = await requireCompanyContext();
  await requireCompanyPermission(session.user.id, companyId, 'canManageInvoices');
  
  // Paginación, filtros, búsqueda
  const invoices = await Invoice.find(filter)
    .populate('client', 'name email taxId address')
    .sort({ [field]: order })
    .skip(skip).limit(limit);
    
  return NextResponse.json(createPaginatedResponse(invoices, total));
}
```

## 2. Servicios (Services Layer)

Los servicios encapsulan la lógica de negocio y externalizan operaciones complejas:

### Servicios Principales:
- **InvoiceService**: Gestión de facturas con transacciones MongoDB
- **EmailService**: Envío de emails via SendGrid con logging
- **AuditService**: Logging de auditoría asíncrono
- **RealtimeService**: Eventos en tiempo real via Server-Sent Events (SSE) con Redis pub/sub como fallback
- **VeriFactuService**: Integración con AEAT (España) con circuit breaker y retry logic
- **SecurityAnalysisService**: Análisis de seguridad automatizado
- **GDPRService**: Cumplimiento RGPD (exportación de datos, consentimientos, actividades de procesamiento)
- **MFAService**: Autenticación de dos factores (TOTP)
- **MetricsService**: Tracking de rendimiento de APIs y métricas
- **TemplateService**: Gestión de plantillas de facturas
- **ImageOptimizationService**: Optimización de imágenes

**Ejemplo de patrón de servicio** (`src/lib/services/invoice-service.ts`):
```typescript
export class InvoiceService {
  static async createInvoice(companyId: string, invoiceData: z.infer<typeof invoiceSchema>) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Generar número de factura único con contador atómico
      const counter = await Counter.findOneAndUpdate(
        { _id: `invoiceNumber_${companyId}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      );
      
      const invoice = new Invoice({
        ...sanitizedData,
        invoiceNumber: `INV-${String(counter.seq).padStart(4, '0')}`,
        companyId: toCompanyObjectId(companyId),
        publicToken: generatePublicToken(), // Token seguro para acceso público
      });
      
      await invoice.save({ session });
      await session.commitTransaction();
      
      return invoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
```

## 3. Modelos de Datos (Mongoose)

Los modelos definen la estructura de datos con validaciones y índices optimizados:

### Modelos Clave:
- **Invoice**: Facturas con campos VeriFactu (incluye invoiceType: invoice/proforma)
- **Company**: Empresas multi-tenant con grupos para compartir recursos
- **User**: Usuarios con roles y campos MFA
- **Client/Product**: Entidades de negocio (Product soporta compartición entre empresas)
- **Expense/Receipt**: Gastos y recibos
- **BankAccount**: Cuentas bancarias conectadas
- **BankTransaction**: Transacciones bancarias
- **Reconciliation**: Reconciliaciones bancarias
- **AuditLog**: Logs de auditoría
- **Settings**: Configuración por empresa (VeriFactu, email, etc.)
- **Counter**: Contadores atómicos para números de factura
- **RecurringInvoice**: Facturas recurrentes
- **FiscalProjection**: Proyecciones fiscales
- **Template**: Plantillas de facturas
- **EmailLog**: Logs de emails enviados
- **GDPRConsent**: Consentimientos RGPD
- **GDPRProcessingActivity**: Actividades de procesamiento RGPD
- **SecurityAlert**: Alertas de seguridad
- **SupportTicket**: Tickets de soporte
- **FAQ**: Preguntas frecuentes
- **Payment**: Pagos procesados

**Ejemplo de modelo** (`src/lib/models/Invoice.ts`):
```typescript
const invoiceSchema = new Schema<Invoice>({
  invoiceNumber: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  
  // VeriFactu integration
  verifactuId: { type: String, sparse: true },
  verifactuStatus: { type: String, enum: ['pending', 'signed', 'sent', 'verified', 'rejected', 'error'] },
  verifactuXml: { type: String },
  verifactuSignature: { type: String },
}, {
  timestamps: true,
});

// Índices compuestos para queries eficientes
invoiceSchema.index({ companyId: 1, deletedAt: 1 });
invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ companyId: 1, createdAt: -1 });
invoiceSchema.index({ companyId: 1, invoiceType: 1 }); // Para filtrar por tipo
invoiceSchema.index({ publicToken: 1 }); // Para acceso público
```

## 4. Middleware

### Middleware Global:
- **Rate Limiting**: Protección contra abuso con límites diferenciados por ruta (auth: 5/15min, api: 100/min, mutation: 30/min, email: 10/hora)
- **Auditoría**: Logging automático de todas las operaciones con inferencia automática de acción y tipo de recurso
- **Métricas**: Tracking de rendimiento de APIs (duración, status codes)
- **Autenticación**: Verificación de sesiones NextAuth.js
- **RBAC**: Control de acceso basado en roles por empresa

**Ejemplo de middleware de auditoría** (`src/lib/middleware/audit-middleware.ts`):
```typescript
export async function auditMiddleware(
  request: NextRequest,
  context: AuditContext,
  options: { success?: boolean; errorMessage?: string } = {}
) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0];
  const userAgent = request.headers.get('user-agent');
  
  await AuditService.createLogAsync({
    userId: context.userId,
    companyId: context.companyId,
    action: context.action,
    resourceType: context.resourceType,
    resourceId: context.resourceId,
    metadata: { method: request.method, path: request.nextUrl.pathname },
    ipAddress,
    userAgent,
    success: options.success ?? true,
    errorMessage: options.errorMessage,
  });
}
```

## 5. Patrones de Integración

### OCR y Procesamiento de Imágenes:
- **Tesseract.js**: OCR básico con español+inglés
- **Google Vision API**: OCR avanzado como fallback
- **Cloudinary**: Almacenamiento y optimización de imágenes

**Ejemplo de integración OCR** (`src/lib/ocr-processor.ts`):
```typescript
export class OCRProcessor {
  async processImageWithVision(imagePath: string): Promise<OCRResult> {
    try {
      const { VisionOCRClient } = await import('./vision/client');
      const visionClient = new VisionOCRClient();
      return await visionClient.processImage(imagePath);
    } catch (error) {
      // Fallback to Tesseract
      return this.processImage(imagePath);
    }
  }
}
```

### Integración Fiscal (VeriFactu):
- Procesamiento asíncrono via cola in-memory con retry logic y exponential backoff
- Circuit breaker para prevenir fallos en cascada cuando AEAT está caído
- Firma digital XML para cumplimiento AEAT
- Auto-detección de clientes españoles
- Validación XSD antes de envío
- Manejo de cancelaciones y rechazos

### Integración Bancaria:
- Conexión con APIs bancarias
- Reconciliación automática de transacciones
- Sincronización en tiempo real

### Servicios Externos:
- **Stripe**: Pagos y webhooks
- **SendGrid**: Email delivery
- **Redis**: Caching y sesiones (opcional, con fallback in-memory)
- **Sentry**: Error tracking
- **Server-Sent Events (SSE)**: Tiempo real con Redis pub/sub como fallback para multi-instancia
- **Cloudinary**: Almacenamiento y optimización de imágenes
- **Google Vision API**: OCR avanzado como fallback de Tesseract

## 6. Manejo de Errores

La aplicación implementa un sistema jerárquico de errores:

**Clases de Error Personalizadas** (`src/lib/errors.ts`):
```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}
```

**Manejo Centralizado**:
- Captura automática en handlers API
- Logging estructurado con contexto
- Respuestas HTTP apropiadas
- Integración con Sentry para producción

## 7. Seguridad y RBAC

### Role-Based Access Control (RBAC):
- **Roles**: owner, admin, accountant, sales, client
- **Permisos Granulares**: canManageInvoices, canViewReports, etc.
- **Aislamiento Multi-tenant**: companyId en todas las queries

**Ejemplo de verificación de permisos** (`src/lib/company-rbac.ts`):
```typescript
export async function requireCompanyPermission(
  userId: string,
  companyId: string,
  requiredPermission: keyof CompanyContext
): Promise<CompanyContext> {
  const role = await getUserCompanyRole(userId, companyId);
  const context = createCompanyContext(role);
  
  if (!context?.[requiredPermission]) {
    throw new Error(`Insufficient permissions: ${requiredPermission} required`);
  }
  
  return { ...context, companyId };
}
```

### Características de Seguridad:
- Rate limiting por empresa
- Sanitización de inputs
- Tokens seguros para acceso público
- Encriptación de datos sensibles
- MFA opcional
- Auditoría completa de operaciones

## 8. Evaluaciones Técnicas

### Fortalezas:
- **Arquitectura Escalable**: Separación clara de responsabilidades (services, models, middleware)
- **Type Safety**: TypeScript completo con validaciones Zod
- **Seguridad Robusta**: RBAC, auditoría, rate limiting, sanitización, encriptación
- **Integraciones Avanzadas**: OCR (Tesseract + Google Vision), VeriFactu con circuit breaker, banca, pagos
- **Observabilidad**: Métricas de rendimiento, logging estructurado, Sentry
- **Multi-tenant Seguro**: Aislamiento completo por empresa con validación en cada capa
- **Resiliencia**: Circuit breakers, retry logic, fallbacks para servicios externos
- **Tiempo Real**: SSE con soporte multi-instancia via Redis

### Áreas de Mejora:
- **Testing**: Cobertura limitada (solo algunos tests unitarios)
- **Documentación**: API docs básica, falta documentación interna
- **Performance**: Sin optimizaciones avanzadas de queries
- **Microservicios**: Todo en monólito, podría beneficiarse de separación

### Recomendaciones:
1. Implementar tests end-to-end con Cypress existente
2. Migrar cola VeriFactu in-memory a Bull (Redis-based) para producción multi-instancia
3. Agregar caching avanzado con Redis para queries frecuentes
4. Considerar GraphQL para APIs complejas
5. Implementar health checks y monitoring avanzado
6. Optimizar índices de MongoDB para patrones de query específicos
7. Implementar paginación cursor-based para grandes volúmenes de datos
8. Considerar implementar WebSockets como alternativa a SSE para casos de uso bidireccionales

La arquitectura demuestra un enfoque profesional con énfasis en seguridad, mantenibilidad y escalabilidad, adecuado para una aplicación SaaS de gestión financiera.