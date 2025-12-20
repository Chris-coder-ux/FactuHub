# Guía de Implementación RBAC y Multi-Empresa

## ✅ Implementado

### 1. Sistema de RBAC Base
- **Archivo**: `src/lib/company-rbac.ts`
- **Funcionalidades**:
  - `getUserCompanyRole()` - Obtener rol de usuario en compañía
  - `getUserCompanies()` - Listar todas las compañías del usuario
  - `createCompanyContext()` - Crear contexto con permisos
  - `requireCompanyPermission()` - Verificar permisos específicos
  - `canAccessResource()` - Verificar acceso a recursos

### 2. Autenticación Extendida
- **Archivo**: `src/lib/auth.ts`
- **Cambios**:
  - `companyId` agregado al JWT y Session
  - `requireCompanyContext()` - Helper para requerir contexto de compañía
  - Soporte para switching de compañías vía `session.update()`

### 3. APIs de Compañías
- **GET /api/companies** - Listar compañías del usuario
- **POST /api/companies** - Crear nueva compañía
- **POST /api/companies/switch** - Cambiar compañía activa

### 4. Componente UI
- **Archivo**: `src/components/CompanySwitcher.tsx`
- **Funcionalidad**: Selector de compañías en el Navbar

## ⚠️ Pendiente: Aplicar RBAC en APIs

### Pasos para Aplicar RBAC en una API

#### Ejemplo: API de Facturas

```typescript
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';

export async function GET(request: NextRequest) {
  try {
    // 1. Requerir autenticación y contexto de compañía
    const { session, companyId } = await requireCompanyContext();
    
    // 2. Verificar permisos específicos (opcional)
    const context = await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices' // o 'canViewReports' según el caso
    );
    
    await connectDB();
    
    // 3. Filtrar por companyId en las queries
    const filter: Record<string, unknown> = { 
      deletedAt: null,
      companyId: companyId // Agregar filtro de compañía
    };
    
    const invoices = await Invoice.find(filter)
      .populate('client')
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json({ invoices });
  } catch (error) {
    // Manejar errores de permisos
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    // ... otros errores
  }
}
```

### APIs que Necesitan RBAC

1. **Facturas** (`/api/invoices`)
   - GET: Requiere `canManageInvoices` o `canViewReports`
   - POST: Requiere `canManageInvoices`
   - PUT/DELETE: Requiere `canManageInvoices`

2. **Clientes** (`/api/clients`)
   - GET: Requiere `canManageInvoices` o `canViewReports`
   - POST/PUT/DELETE: Requiere `canManageInvoices`

3. **Productos** (`/api/products`)
   - GET: Todos los roles pueden ver
   - POST/PUT/DELETE: Requiere `canManageInvoices`

4. **Recibos** (`/api/receipts`)
   - GET: Requiere `canManageInvoices` o `canViewReports`
   - POST/PATCH/DELETE: Requiere `canManageInvoices`

5. **Reportes** (`/api/reports`)
   - GET: Requiere `canViewReports`

6. **Configuración** (`/api/settings`)
   - GET: Todos los roles pueden ver
   - PATCH: Requiere `canManageSettings`

## 🔧 Cambios Necesarios en Modelos

### Agregar `companyId` a Modelos

Los siguientes modelos necesitan el campo `companyId`:

```typescript
// Ejemplo para Invoice
const invoiceSchema = new Schema<Invoice>({
  // ... campos existentes
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  // ... resto de campos
});
```

**Modelos a actualizar**:
- [ ] `Invoice` - `src/lib/models/Invoice.ts`
- [ ] `Client` - `src/lib/models/Client.ts`
- [ ] `Product` - `src/lib/models/Product.ts`
- [ ] `Receipt` - `src/lib/models/Receipt.ts`
- [ ] `BankAccount` - `src/lib/models/BankAccount.ts`
- [ ] `FiscalProjection` - `src/lib/models/FiscalProjection.ts`

### Migración de Datos

Para datos existentes, necesitarás:

1. **Crear compañía por defecto** para usuarios existentes
2. **Asignar `companyId`** a todos los registros existentes
3. **Actualizar índices** para incluir `companyId`

```typescript
// Script de migración (ejemplo)
async function migrateToMultiCompany() {
  await connectDB();
  
  // Crear compañía por defecto para cada usuario
  const users = await User.find({ companyId: null });
  
  for (const user of users) {
    const company = new Company({
      name: `${user.name}'s Company`,
      taxId: 'TEMP-' + user._id,
      ownerId: user._id,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'España',
      },
    });
    await company.save();
    
    user.companyId = company._id;
    await user.save();
    
    // Asignar companyId a todos los recursos del usuario
    await Invoice.updateMany(
      { userId: user._id, companyId: null },
      { $set: { companyId: company._id } }
    );
    // ... repetir para otros modelos
  }
}
```

## 📋 Checklist de Implementación

### Fase 1: Base (✅ Completado)
- [x] Crear sistema RBAC base
- [x] Extender autenticación con companyId
- [x] Crear APIs de compañías
- [x] Crear componente UI de switching

### Fase 2: Modelos (Pendiente)
- [ ] Agregar `companyId` a Invoice
- [ ] Agregar `companyId` a Client
- [ ] Agregar `companyId` a Product
- [ ] Agregar `companyId` a Receipt
- [ ] Agregar `companyId` a BankAccount
- [ ] Agregar `companyId` a FiscalProjection
- [ ] Crear índices compuestos (companyId + otros campos)

### Fase 3: APIs (Pendiente)
- [ ] Aplicar RBAC en `/api/invoices`
- [ ] Aplicar RBAC en `/api/clients`
- [ ] Aplicar RBAC en `/api/products`
- [ ] Aplicar RBAC en `/api/receipts`
- [ ] Aplicar RBAC en `/api/reports`
- [ ] Aplicar RBAC en `/api/settings`
- [ ] Aplicar RBAC en `/api/banking/*`

### Fase 4: Frontend (Pendiente)
- [ ] Actualizar queries para incluir companyId
- [ ] Agregar validación de permisos en componentes
- [ ] Ocultar/mostrar acciones según permisos
- [ ] Agregar indicadores de rol en UI

### Fase 5: Testing (Pendiente)
- [ ] Tests unitarios de RBAC
- [ ] Tests de integración de switching
- [ ] Tests de permisos en APIs
- [ ] Tests de aislamiento de datos entre compañías

## 🎯 Roles y Permisos

| Rol | canManageUsers | canManageInvoices | canViewReports | canManageSettings |
|-----|----------------|-------------------|----------------|-------------------|
| owner | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| accountant | ❌ | ✅ | ✅ | ❌ |
| sales | ❌ | ✅ | ❌ | ❌ |
| client | ❌ | ❌ | ❌ | ❌ |

## 📝 Notas Importantes

1. **Aislamiento de Datos**: Todos los queries deben filtrar por `companyId` para evitar fuga de datos entre compañías.

2. **Performance**: Crear índices compuestos en campos frecuentemente consultados junto con `companyId`.

3. **Migración**: Planificar migración de datos existentes antes de desplegar a producción.

4. **Testing**: Probar exhaustivamente el aislamiento de datos entre compañías.

5. **UI/UX**: El selector de compañías debe estar visible y accesible en todas las páginas relevantes.

