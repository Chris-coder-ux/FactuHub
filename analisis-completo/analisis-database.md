# Análisis Detallado de la Base de Datos de FacturaHub

## 1. Esquemas MongoDB

### Modelo Company (Multi-tenant Principal)
```typescript
interface ICompany {
  name: string;
  taxId: string; // CIF/NIF
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  ownerId: mongoose.Types.ObjectId; // User who created it
  groupId: mongoose.Types.ObjectId | null; // Group ID for sharing resources
  members: {
    userId: mongoose.Types.ObjectId;
    role: 'owner' | 'admin' | 'accountant' | 'sales' | 'client';
  }[];
  settings: {
    currency: string;
    defaultTaxRate: number;
    verifactuEnabled: boolean;
    verifactuEnvironment: 'production' | 'sandbox';
  };
}
```
- **Relaciones**: Referencia a User (ownerId), User (members), CompanyGroup (groupId)
- **RBAC**: Sistema de roles por empresa con permisos granulares

### Modelo Invoice (Facturas)
```typescript
interface Invoice {
  invoiceNumber: string; // Unique per company
  invoiceType: 'invoice' | 'proforma';
  client: mongoose.Types.ObjectId; // Ref: Client
  items: Array<{
    product: mongoose.Types.ObjectId; // Ref: Product
    quantity: number;
    price: number;
    tax: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  issuedDate: Date;
  companyId: mongoose.Types.ObjectId; // Multi-tenant isolation
  publicToken?: string; // Secure public access
  
  // VeriFactu compliance fields
  verifactuId?: string;
  verifactuStatus?: 'pending' | 'signed' | 'sent' | 'verified' | 'rejected' | 'error';
  verifactuXml?: string;
  verifactuSignature?: string;
  verifactuHash?: string;
  verifactuSentAt?: Date;
  verifactuVerifiedAt?: Date;
  verifactuErrorMessage?: string;
  verifactuChainHash?: string;
  verifactuCancellationXml?: string;
  verifactuCancellationDate?: Date;
  verifactuCancellationReason?: string;
}
```

### Modelo Expense (Gastos)
```typescript
interface IExpense {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  receiptIds: mongoose.Types.ObjectId[]; // Array of receipts
  category: 'travel' | 'meals' | 'office' | 'supplies' | 'utilities' | 'marketing' | 'software' | 'professional_services' | 'other';
  amount: number;
  taxAmount: number;
  date: Date;
  description: string;
  vendor?: string;
  status: 'pending' | 'approved' | 'rejected';
  tags?: string[];
  notes?: string;
}
```

### Modelo Receipt (Recibos OCR)
```typescript
interface IReceipt {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  imageUrl: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  extractedData: {
    merchant?: string;
    date?: string;
    total?: number;
    tax?: number;
    items?: Array<{
      description: string;
      quantity?: number;
      price?: number;
      total?: number;
    }>;
  };
  confidenceScore: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  expenseId?: mongoose.Types.ObjectId;
}
```

### Modelo User (Usuarios)
```typescript
interface User {
  name: string;
  email: string; // Unique
  password: string;
  role: 'admin' | 'user';
  companyId?: mongoose.Types.ObjectId; // Optional for multi-company
  
  // MFA fields
  mfaEnabled?: boolean;
  mfaSecret?: string; // Encrypted TOTP secret
  mfaBackupCodes?: string[]; // Encrypted backup codes
  mfaVerified?: boolean; // Whether MFA setup is verified
}
```

### Modelo Payment (Pagos)
```typescript
interface Payment {
  invoice: mongoose.Types.ObjectId; // Ref: Invoice
  amount: number;
  method: 'stripe' | 'paypal' | 'bank_transfer' | 'cash';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  stripePaymentIntentId?: string; // Sparse index for Stripe
}
```

### Modelo RecurringInvoice (Facturas Recurrentes)
```typescript
interface RecurringInvoice {
  invoiceNumber: string;
  client: mongoose.Types.ObjectId; // Ref: Client
  items: Array<{
    product: mongoose.Types.ObjectId; // Ref: Product
    quantity: number;
    price: number;
  }>;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextDueDate: Date;
  endDate?: Date;
  status: 'active' | 'inactive' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}
```

### Modelo BankAccount (Cuentas Bancarias)
```typescript
interface IBankAccount {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId; // Multi-company support
  bankName: string; // e.g., 'BBVA', 'Santander'
  accountNumber: string; // Masked or IBAN
  consentId: string; // PSD2 consent ID
  accessToken?: string; // If using OAuth
  lastSync?: Date;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
}
```

### Modelo BankTransaction (Transacciones Bancarias)
```typescript
interface IBankTransaction {
  bankAccountId: mongoose.Types.ObjectId; // Ref: BankAccount
  transactionId: string; // From bank API
  amount: number;
  currency: string;
  date: Date;
  description: string;
  category?: string;
  reconciled: boolean;
  reconciledInvoiceId?: mongoose.Types.ObjectId; // Ref: Invoice
}
```

### Modelo Counter (Contadores Atómicos)
```typescript
interface ICounter {
  _id: string; // e.g., 'invoiceNumber_${companyId}'
  seq: number; // Sequential number
}
```

### Modelos Adicionales
- **Template**: Plantillas de facturas
- **Settings**: Configuración por empresa (VeriFactu, email, etc.)
- **AuditLog**: Logs de auditoría
- **EmailLog**: Logs de emails enviados
- **GDPRConsent**: Consentimientos RGPD
- **GDPRProcessingActivity**: Actividades de procesamiento RGPD
- **SecurityAlert**: Alertas de seguridad
- **SupportTicket**: Tickets de soporte
- **FAQ**: Preguntas frecuentes
- **FiscalProjection**: Proyecciones fiscales
- **Reconciliation**: Reconciliaciones bancarias

## 2. Estrategias de Indexación

### Índices Principales (de `src/lib/indexes.ts`)

**Cliente (Client)**:
- `{ email: 1 }` - Unique para búsquedas por email (en indexes.ts)
- `{ createdAt: -1 }` - Para ordenamiento cronológico (en indexes.ts)
- `{ name: 1 }` - Para búsquedas por nombre (en indexes.ts)
- `{ companyId: 1, deletedAt: 1 }` - Para soft deletes (en schema)
- `{ companyId: 1, email: 1 }` - Para búsquedas por empresa y email (en schema)

**Factura (Invoice)**:
- `{ invoiceNumber: 1 }` - Unique global (definido en schema)
- `{ companyId: 1, invoiceNumber: 1 }` - Unique compuesto para aislamiento multi-tenant (en indexes.ts)
- `{ client: 1, createdAt: -1 }` - Para queries por cliente
- `{ status: 1 }` - Para filtrado por estado
- `{ dueDate: 1 }` - Para facturas vencidas
- `{ createdAt: -1 }` - Para ordenamiento cronológico
- `{ status: 1, dueDate: 1 }` - Compuesto para facturas vencidas
- `{ companyId: 1, deletedAt: 1 }` - Para soft deletes (en schema)
- `{ companyId: 1, status: 1 }` - Para queries por empresa y estado (en schema)
- `{ companyId: 1, createdAt: -1 }` - Para ordenamiento por empresa (en schema)
- `{ companyId: 1, invoiceType: 1 }` - Para filtrado por tipo (en schema)
- `{ publicToken: 1 }` - Sparse unique para acceso público (en schema)

**VeriFactu**:
- `{ verifactuStatus: 1 }` - Para estados de cumplimiento
- `{ verifactuId: 1 }` - Sparse para consultas AEAT
- `{ verifactuSentAt: -1 }` - Para envío reciente
- `{ verifactuStatus: 1, verifactuSentAt: -1 }` - Compuesto para queries de estado

**Producto (Product)**:
- `{ name: 1 }` - Para búsquedas por nombre (en indexes.ts)
- `{ createdAt: -1 }` - Para ordenamiento (en indexes.ts)
- `{ companyId: 1, deletedAt: 1 }` - Para soft deletes (en schema)
- `{ companyId: 1, name: 1 }` - Para búsquedas por empresa y nombre (en schema)
- `{ isShared: 1, sharedWithGroupId: 1, deletedAt: 1 }` - Para productos compartidos (en schema)

**Pago (Payment)**:
- `{ invoice: 1 }` - Para pagos por factura (en indexes.ts)
- `{ status: 1 }` - Para estados de pago (en indexes.ts)
- `{ stripePaymentIntentId: 1 }` - Sparse para Stripe (en indexes.ts)
- `{ createdAt: -1 }` - Para ordenamiento (en indexes.ts)

**Factura Recurrente (RecurringInvoice)**:
- `{ status: 1, nextDueDate: 1 }` - Crítico para cron jobs de facturación automática (filtra por status='active')
- `{ client: 1 }` - Para facturas recurrentes por cliente (en indexes.ts)
- `{ createdAt: -1 }` - Para ordenamiento (en indexes.ts)

**Usuario (User)**:
- `{ email: 1 }` - Unique para autenticación (en indexes.ts)
- `{ role: 1 }` - Para control de acceso (en indexes.ts)

**Company**:
- `{ groupId: 1 }` - Para búsquedas por grupo de compartición (en schema)

### Índices Adicionales en Modelos

**Expense**:
- `{ userId: 1 }` - Índice individual (en schema)
- `{ companyId: 1 }` - Índice individual (en schema)
- `{ category: 1 }` - Índice individual (en schema)
- `{ date: 1 }` - Índice individual (en schema)
- `{ status: 1 }` - Índice individual (en schema)
- `{ companyId: 1, userId: 1, status: 1 }` - Compuesto para gestión de aprobaciones (en schema)
- `{ companyId: 1, date: -1 }` - Compuesto para reportes cronológicos (en schema)
- `{ companyId: 1, category: 1 }` - Compuesto para categorización (en schema)

**Receipt**:
- `{ userId: 1 }` - Índice individual (en schema)
- `{ companyId: 1 }` - Índice individual (en schema)
- `{ expenseId: 1 }` - Índice individual para linking con gastos (en schema)
- `{ userId: 1, status: 1 }` - Compuesto para procesamiento OCR (en schema)
- `{ createdAt: -1 }` - Para ordenamiento (en schema)
- `{ companyId: 1, status: 1 }` - Compuesto para queries por empresa (en schema)
- `{ companyId: 1, createdAt: -1 }` - Compuesto para listados (en schema)

## 3. Patrones de Queries

### Función Helper de Aislamiento Multi-tenant
```typescript
export function createCompanyFilter(companyId: string | mongoose.Types.ObjectId, additionalFilter: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...additionalFilter,
    companyId: toCompanyObjectId(companyId),
  };
}
```

### Ejemplo de Query con Filtros Complejos
```typescript
// Query de facturas con filtros avanzados
const filter = createCompanyFilter(companyId, { deletedAt: null });
if (status) filter.status = status;
if (clientId) filter.client = toCompanyObjectId(clientId);
if (startDate || endDate) {
  filter.issuedDate = {};
  if (startDate) filter.issuedDate.$gte = new Date(startDate);
  if (endDate) filter.issuedDate.$lte = new Date(endDate);
}

const invoices = await Invoice.find(filter)
  .populate('client', 'name email taxId')
  .sort({ [sortField]: sortOrder })
  .skip(skip)
  .limit(limit);
```

### Aggregation Pipeline para Analytics
```typescript
// Profitability by client
const clientProfitability = await Invoice.aggregate([
  { $match: { ...invoiceMatch, status: 'paid' } },
  {
    $group: {
      _id: '$client',
      totalRevenue: { $sum: '$total' },
      totalCost: { $sum: '$subtotal' },
      invoiceCount: { $sum: 1 },
      averageInvoiceValue: { $avg: '$total' },
    },
  },
  {
    $lookup: {
      from: 'clients',
      localField: '_id',
      foreignField: '_id',
      as: 'clientInfo',
    },
  },
  { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      clientId: '$_id',
      clientName: { $ifNull: ['$clientInfo.name', 'Cliente eliminado'] },
      totalRevenue: 1,
      profit: { $subtract: ['$totalRevenue', '$totalCost'] },
      margin: {
        $cond: {
          if: { $gt: ['$totalRevenue', 0] },
          then: {
            $multiply: [
              { $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] },
              100,
            ],
          },
          else: 0,
        },
      },
      invoiceCount: 1,
      averageInvoiceValue: 1,
    },
  },
  { $sort: { totalRevenue: -1 } },
  { $limit: 50 },
]);
```

### Transacciones MongoDB para Consistencia
```typescript
export class InvoiceService {
  static async createInvoice(companyId: string, invoiceData: any) {
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
        publicToken: generatePublicToken(),
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

## 4. Aislamiento Multi-tenant

### Estrategia de Aislamiento
- **Campo companyId**: Presente en todos los modelos principales (Invoice, Expense, Client, etc.)
- **Función Helper**: `createCompanyFilter()` asegura que todas las queries incluyan el filtro de empresa
- **Middleware de Contexto**: `requireCompanyContext()` valida acceso a empresa antes de cualquier operación

### Middleware de Seguridad
```typescript
export async function requireCompanyContext(): Promise<{
  session: Session;
  companyId: string;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthenticationError('No authenticated user');
  }
  
  const user = await User.findById(session.user.id);
  if (!user?.companyId) {
    throw new Error('User not associated with any company');
  }
  
  return {
    session,
    companyId: user.companyId.toString(),
  };
}
```

### RBAC por Empresa
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

## 5. Optimización de Rendimiento

### Conexión MongoDB Optimizada
```typescript
// src/lib/mongodb.ts
const opts = {
  bufferCommands: false, // Disable mongoose buffering
};

cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
  return mongoose;
});
```

### Paginación Eficiente
```typescript
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1,
    },
  };
}
```

### Caching de Consultas Frecuentes
- **Contadores**: Uso de colección Counter con operaciones atómicas para números de factura únicos por empresa
- **Settings**: Cache de configuraciones por empresa (implementado en cache.ts con Redis opcional)
- **Templates**: Cache de plantillas de email
- **Redis**: Caching opcional con fallback in-memory para single-instance deployments

### Optimizaciones de Queries
- **Populate Selectivo**: Solo campos necesarios en populate
- **Lean Queries**: Para operaciones de solo lectura
- **Projection**: Campos específicos en aggregation pipelines
- **Early Filtering**: Filtros aplicados antes de populate/sort

## 6. Evaluaciones Técnicas

### Fortalezas de la Arquitectura

1. **Aislamiento Multi-tenant Robusto**:
   - Campo `companyId` en todos los modelos relevantes
   - Función helper `createCompanyFilter()` para consistencia
   - Middleware automático en todas las rutas API

2. **Indexación Estratégica**:
   - Índices compuestos optimizados para patrones de query comunes
   - Unique constraints apropiados (invoiceNumber único global, compuesto con companyId para multi-tenant)
   - Sparse indexes para campos opcionales (verifactuId, stripePaymentIntentId, publicToken)
   - Índices definidos tanto en indexes.ts como en schemas para garantizar creación

3. **Transacciones para Consistencia**:
   - Uso de sesiones MongoDB para operaciones atómicas
   - Contadores seguros para números de factura únicos por empresa

4. **Patrones de Query Eficientes**:
   - Aggregation pipelines optimizados para analytics
   - Paginación consistente con metadatos
   - Filtros compuestos para queries complejas

### Áreas de Mejora Identificadas

1. **Cobertura de Testing**:
   - Solo 42 tests unitarios mencionados
   - Falta testing de integración para queries complejas
   - No hay tests de performance para índices

2. **Optimizaciones Avanzadas**:
   - Redis disponible pero opcional (con fallback in-memory)
   - Falta sharding strategy para escalabilidad horizontal
   - No hay read replicas configuradas
   - Falta implementar materialized views para analytics complejos

3. **Monitoring y Observabilidad**:
   - Logging básico, falta métricas de performance de queries
   - No hay alertas para queries lentas
   - Falta profiling de MongoDB

### Recomendaciones de Optimización

1. **Implementar Caching con Redis**:
   ```typescript
   // Para queries frecuentes como settings por empresa
   const cacheKey = `company_settings_${companyId}`;
   let settings = await redis.get(cacheKey);
   if (!settings) {
     settings = await Settings.findOne(createCompanyFilter(companyId));
     await redis.setex(cacheKey, 3600, JSON.stringify(settings)); // 1 hora
   }
   ```

2. **Agregar Índices de Performance**:
   - `{ companyId: 1, status: 1, dueDate: 1 }` para facturas vencidas
   - `{ companyId: 1, date: -1, amount: -1 }` para reportes de gastos
   - Text indexes para búsquedas full-text

3. **Query Profiling**:
   ```javascript
   // En MongoDB shell para identificar queries lentas
   db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 })
   ```

4. **Optimización de Aggregation Pipelines**:
   - Usar `$match` temprano para reducir documentos procesados
   - Evitar `$lookup` innecesario con proyección
   - Considerar materialized views para analytics complejos

### Modelos Adicionales No Documentados

El sistema incluye modelos adicionales importantes para funcionalidades avanzadas:

- **Template**: Plantillas de facturas reutilizables
- **Settings**: Configuración por empresa (VeriFactu, email, moneda, impuestos)
- **AuditLog**: Logs completos de auditoría de todas las operaciones
- **EmailLog**: Registro de todos los emails enviados con estado y metadatos
- **GDPRConsent**: Gestión de consentimientos RGPD
- **GDPRProcessingActivity**: Actividades de procesamiento de datos personales
- **SecurityAlert**: Alertas de seguridad generadas por análisis automatizado
- **SupportTicket**: Sistema de tickets de soporte
- **FAQ**: Preguntas frecuentes
- **FiscalProjection**: Proyecciones fiscales y forecasting
- **Reconciliation**: Reconciliaciones bancarias con transacciones

### Conclusión

La base de datos de FacturaHub demuestra una arquitectura bien diseñada con énfasis en seguridad multi-tenant, indexación estratégica y patrones de query eficientes. El uso consistente de `companyId` para aislamiento, índices compuestos optimizados y transacciones para consistencia refleja un enfoque profesional. 

**Puntos destacados**:
- Aislamiento multi-tenant robusto con validación en múltiples capas
- Índices estratégicos tanto en archivo centralizado como en modelos
- Sistema de contadores atómicos para números únicos por empresa
- Soporte para compartición de recursos entre empresas mediante grupos
- Soft deletes implementados con `deletedAt`

Las áreas de mejora identificadas (caching avanzado, monitoring, testing, sharding) son comunes en aplicaciones en crecimiento y pueden abordarse incrementalmente sin refactorizaciones mayores.

La implementación actual es adecuada para una aplicación SaaS de facturación, con espacio para optimizaciones de performance a medida que crece la base de usuarios.