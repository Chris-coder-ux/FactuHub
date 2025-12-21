# Guía para Desarrolladores - FacturaHub

## 🚀 Inicio Rápido

### Requisitos Previos

- **Node.js**: >= 18.x
- **MongoDB**: >= 6.0
- **npm** o **yarn**
- **Git**

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/your-org/facturahub.git
cd facturahub

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Inicializar base de datos
npm run db:init

# Iniciar servidor de desarrollo
npm run dev
```

### Estructura del Proyecto

```
facturahub/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API Routes
│   │   └── (auth)/       # Route groups
│   ├── components/       # React components
│   ├── lib/              # Utilidades y servicios
│   │   ├── models/       # Mongoose models
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helpers
│   └── types/            # TypeScript types
├── scripts/              # Scripts de migración y utilidades
├── docs/                 # Documentación
└── tests/                # Tests
```

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes, MongoDB, Mongoose
- **Autenticación**: NextAuth.js
- **Estilos**: TailwindCSS, shadcn/ui
- **Validación**: Zod
- **Testing**: Jest, Testing Library, Cypress

### Principios de Diseño

1. **Server Components por defecto**: Solo usar 'use client' cuando sea necesario
2. **Validación en servidor**: Siempre validar con Zod en API routes
3. **Manejo de errores**: Usar Result Pattern y clases de error personalizadas
4. **Type Safety**: Evitar `any`, usar tipos estrictos
5. **Seguridad**: Validar, sanitizar y autenticar en cada capa

## 📝 Convenciones de Código

### TypeScript

```typescript
// ✅ CORRECTO
interface User {
  id: string;
  email: string;
  isActive: boolean; // Booleanos con prefijo 'is', 'has', 'can'
}

type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// ❌ INCORRECTO
const user: any = {}; // Nunca usar 'any'
```

### Nomenclatura

- **Variables booleanas**: `isLoading`, `hasError`, `canSubmit`
- **Funciones**: `validateForm`, `fetchUsers` (verbo + sustantivo)
- **Componentes**: `PascalCase` (ej: `InvoiceForm`)
- **Archivos**: `kebab-case` (ej: `invoice-form.tsx`)
- **Arrays**: Plural (ej: `users: User[]`)

### Imports

```typescript
// ✅ CORRECTO - Absolute imports
import { Button } from '@/components/ui/button';
import { ApiResponse } from '@/types/api';

// ❌ INCORRECTO - Relative imports profundos
import { something } from '../../../../utils';
```

## 🔐 Autenticación y Autorización

### NextAuth Configuration

```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // ...
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.companyId = user.companyId;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.companyId = token.companyId;
      return session;
    },
  },
};
```

### Requerir Autenticación

```typescript
// En API routes
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}
```

### Requerir Contexto de Empresa

```typescript
import { requireCompanyContext } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { session, companyId } = await requireCompanyContext();
  // companyId garantizado
}
```

### RBAC (Role-Based Access Control)

```typescript
import { requireCompanyPermission } from '@/lib/company-rbac';

export async function DELETE(request: NextRequest) {
  const { session, companyId } = await requireCompanyContext();
  
  // Verificar permisos
  await requireCompanyPermission(
    session.user.id,
    companyId,
    'canManageInvoices'
  );
  
  // Continuar con la lógica
}
```

## 🗄️ Base de Datos

### Modelos Mongoose

```typescript
// src/lib/models/Invoice.ts
import mongoose, { Schema } from 'mongoose';

const invoiceSchema = new Schema<Invoice>({
  invoiceNumber: { type: String, required: true, unique: true },
  companyId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true,
    index: true,
  },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number,
  }],
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
```

### Índices

```typescript
// src/lib/indexes.ts
await Invoice.collection.createIndex(
  { companyId: 1, invoiceNumber: 1 },
  { unique: true, name: 'companyId_invoiceNumber_unique' }
);

await Invoice.collection.createIndex(
  { companyId: 1, status: 1, createdAt: -1 },
  { name: 'companyId_status_createdAt' }
);
```

### Queries Optimizadas

```typescript
// ✅ CORRECTO - Usar select y lean
const invoices = await Invoice.find({ companyId })
  .populate('client', 'name email')
  .populate('items.product', 'name price')
  .select('invoiceNumber total status createdAt')
  .lean()
  .limit(20)
  .sort({ createdAt: -1 });

// ❌ INCORRECTO - Traer todos los campos
const invoices = await Invoice.find({ companyId })
  .populate('client')
  .populate('items.product');
```

## 🔌 API Routes

### Estructura de Endpoint

```typescript
// src/app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { z } from 'zod';

const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
  })),
});

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireCompanyContext();
    const searchParams = request.nextUrl.searchParams;
    
    // Validar parámetros
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Query con filtros
    const invoices = await Invoice.find({ companyId })
      .populate('client', 'name email')
      .lean()
      .limit(limit)
      .skip((page - 1) * limit);
    
    return NextResponse.json({
      data: invoices,
      page,
      limit,
      total: await Invoice.countDocuments({ companyId }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireCompanyContext();
    const body = await request.json();
    
    // Validar con Zod
    const validated = CreateInvoiceSchema.parse(body);
    
    // Crear factura
    const invoice = await Invoice.create({
      ...validated,
      companyId,
    });
    
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Manejo de Errores

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

// En API routes
function handleApiError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.issues },
      { status: 400 }
    );
  }
  
  logger.error('API Error', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## 🧪 Testing

### Unit Tests

```typescript
// src/__tests__/services/invoice-service.test.ts
import { InvoiceService } from '@/lib/services/invoice-service';

describe('InvoiceService', () => {
  describe('createInvoice', () => {
    it('debe crear una factura válida', async () => {
      // Arrange
      const data = {
        clientId: 'client-123',
        items: [{ productId: 'prod-123', quantity: 2 }],
      };
      
      // Act
      const result = await InvoiceService.createInvoice('company-123', data);
      
      // Assert
      expect(result).toHaveProperty('id');
      expect(result.total).toBeGreaterThan(0);
    });
  });
});
```

### Integration Tests

```typescript
// tests/api/invoices.test.ts
import { createMocks } from 'node-mocks-http';

describe('POST /api/invoices', () => {
  it('debe crear una factura', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        clientId: 'client-123',
        items: [{ productId: 'prod-123', quantity: 2 }],
      },
    });
    
    await POST(req);
    
    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.data).toHaveProperty('invoiceNumber');
  });
});
```

## 🔒 Seguridad

### Validación de Entrada

```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

const CreateClientSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validated = CreateClientSchema.parse(body);
  
  // Sanitizar HTML
  const sanitized = {
    ...validated,
    name: DOMPurify.sanitize(validated.name),
  };
  
  // Crear cliente
}
```

### Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await ratelimit.limit(`api:${ip}`);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // Continuar
}
```

## 📦 Servicios

### Estructura de Servicio

```typescript
// src/lib/services/invoice-service.ts
import { Invoice } from '@/lib/models/Invoice';
import { logger } from '@/lib/logger';

export class InvoiceService {
  static async createInvoice(
    companyId: string,
    data: CreateInvoiceData
  ): Promise<Invoice> {
    try {
      // Validar datos
      const validated = CreateInvoiceSchema.parse(data);
      
      // Calcular totales
      const total = this.calculateTotal(validated.items);
      
      // Crear factura
      const invoice = await Invoice.create({
        ...validated,
        companyId,
        total,
        status: 'draft',
      });
      
      logger.info('Invoice created', { invoiceId: invoice._id });
      return invoice;
    } catch (error) {
      logger.error('Failed to create invoice', error);
      throw error;
    }
  }
  
  private static calculateTotal(items: InvoiceItem[]): number {
    return items.reduce((sum, item) => {
      return sum + (item.price * item.quantity * (1 + item.taxRate / 100));
    }, 0);
  }
}
```

## 🚀 Deployment

### Vercel

1. Conecta tu repositorio
2. Configura variables de entorno
3. Despliega automáticamente

### Variables de Entorno Requeridas

```bash
# Base de datos
MONGODB_URI=mongodb://...

# Autenticación
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com

# Stripe
STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Redis (opcional)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Sentry (opcional)
SENTRY_DSN=...
```

## 📚 Recursos Adicionales

- **API Documentation**: `/docs/api/GUIA_COMPLETA.md`
- **OpenAPI Spec**: `/docs/api/openapi.yaml`
- **Architecture Docs**: `/docs/MICROSERVICES_EVALUATION.md`
- **Testing Guide**: `/docs/OCR_TESTING_GUIDE.md`

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcion`)
3. Commit cambios (`git commit -am 'Agrega nueva funcion'`)
4. Push (`git push origin feature/nueva-funcion`)
5. Abre un Pull Request

### Estándares de Código

- Sigue las convenciones de código
- Escribe tests para nuevas funcionalidades
- Actualiza documentación
- Ejecuta `npm run lint` antes de commit

---

**Última actualización**: Diciembre 2024

