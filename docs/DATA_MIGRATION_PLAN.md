# Plan de Migración de Datos - FacturaHub

## 📋 Resumen Ejecutivo

Este documento describe el plan completo para migrar datos existentes a la arquitectura multi-empresa de FacturaHub. El plan incluye scripts de migración, validaciones, rollback y procedimientos de verificación.

## 🎯 Objetivos

1. **Migrar usuarios existentes** a la arquitectura multi-empresa
2. **Asignar `companyId`** a todos los registros existentes
3. **Crear compañías por defecto** para usuarios sin una
4. **Preservar integridad de datos** durante la migración
5. **Permitir rollback** en caso de errores

## 📊 Alcance de la Migración

### Modelos a Migrar

| Modelo | Campo de Relación | Acción |
|--------|------------------|--------|
| `User` | `companyId` | Crear compañía si no existe |
| `Invoice` | `companyId` | Asignar según usuario creador |
| `Client` | `companyId` | Asignar según usuario creador |
| `Product` | `companyId` | Asignar según usuario creador |
| `Receipt` | `userId` + `companyId` | Asignar según usuario |
| `BankAccount` | `userId` + `companyId` | Asignar según usuario |
| `FiscalProjection` | `userId` + `companyId` | Asignar según usuario |
| `Expense` | `userId` + `companyId` | Asignar según usuario |
| `Settings` | `companyId` | Crear si no existe |

### Datos No Migrados

- **AuditLogs**: Se mantienen con `userId` original (histórico)
- **VeriFactu XML**: Se mantienen vinculados a facturas (ya tienen `invoiceId`)

## 🔄 Proceso de Migración

### Fase 1: Preparación

#### 1.1 Backup de Base de Datos

```bash
# MongoDB backup
mongodump --uri="$MONGODB_URI" --out=./backups/pre-migration-$(date +%Y%m%d-%H%M%S)

# Verificar backup
mongorestore --dry-run --uri="$MONGODB_URI" ./backups/pre-migration-*
```

#### 1.2 Verificación Pre-Migración

```bash
# Ejecutar script de verificación
npx tsx scripts/verify-pre-migration.ts
```

**Checks realizados**:
- ✅ Usuarios sin `companyId`
- ✅ Registros huérfanos (sin `userId` ni `companyId`)
- ✅ Integridad referencial
- ✅ Índices existentes

#### 1.3 Configuración de Entorno

```bash
# Variables requeridas
MONGODB_URI=mongodb://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# Opcional: Modo dry-run
DRY_RUN=true
```

### Fase 2: Ejecución

#### 2.1 Script de Migración Principal

**Ubicación**: `scripts/migrate-to-multi-company.ts`

**Uso**:
```bash
# Dry-run (sin cambios)
DRY_RUN=true npx tsx scripts/migrate-to-multi-company.ts

# Migración real
npx tsx scripts/migrate-to-multi-company.ts
```

**Funcionalidades**:
1. Conecta a MongoDB
2. Encuentra usuarios sin `companyId`
3. Para cada usuario:
   - Crea compañía por defecto
   - Asigna `companyId` al usuario
   - Migra todos los registros relacionados
   - Crea `Settings` por defecto
4. Genera reporte de migración

#### 2.2 Validaciones Durante Migración

- ✅ Verificar que `companyId` se asigna correctamente
- ✅ Verificar que no se duplican registros
- ✅ Verificar integridad referencial
- ✅ Verificar que índices se crean correctamente

### Fase 3: Verificación Post-Migración

#### 3.1 Script de Verificación

**Ubicación**: `scripts/verify-migration.ts`

```bash
npx tsx scripts/verify-migration.ts
```

**Checks realizados**:
- ✅ Todos los usuarios tienen `companyId`
- ✅ Todos los registros tienen `companyId`
- ✅ No hay registros huérfanos
- ✅ Índices compuestos funcionan
- ✅ Queries por `companyId` funcionan

#### 3.2 Pruebas Manuales

1. **Login de usuario migrado**
   - Verificar que puede acceder
   - Verificar que ve sus datos
   - Verificar que no ve datos de otros

2. **Crear nuevo registro**
   - Verificar que se asigna `companyId` automáticamente
   - Verificar que aparece en listados

3. **Switching de compañías**
   - Verificar que usuarios con múltiples compañías pueden cambiar
   - Verificar aislamiento de datos

### Fase 4: Rollback (Si es Necesario)

#### 4.1 Script de Rollback

**Ubicación**: `scripts/rollback-migration.ts`

```bash
# Restaurar desde backup
mongorestore --uri="$MONGODB_URI" ./backups/pre-migration-YYYYMMDD-HHMMSS

# O ejecutar script de rollback
npx tsx scripts/rollback-migration.ts
```

**Acciones de Rollback**:
1. Eliminar `companyId` de todos los registros
2. Eliminar compañías creadas durante migración
3. Restaurar estado original de usuarios

## 📝 Detalles Técnicos

### Creación de Compañías por Defecto

```typescript
const company = new Company({
  name: `${user.name}'s Company`,
  taxId: `TEMP-${user._id.toString().slice(-8)}`, // Temporal
  ownerId: user._id,
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'España',
  },
  members: [{
    userId: user._id,
    role: 'owner',
  }],
  settings: {
    currency: 'EUR',
    defaultTaxRate: 21,
    verifactuEnabled: false,
    verifactuEnvironment: 'sandbox',
  },
});
```

**⚠️ IMPORTANTE**: Los `taxId` temporales deben actualizarse manualmente después de la migración.

### Asignación de `companyId`

**Estrategia**:
- **Invoices, Clients, Products**: Se asignan a la compañía del usuario que los creó
- **Receipts, BankAccounts, Expenses**: Se asignan según `userId`
- **Settings**: Se crean nuevos para cada compañía

### Índices Compuestos

Después de la migración, se crean índices compuestos:

```typescript
// Invoice
{ companyId: 1, deletedAt: 1 }
{ companyId: 1, status: 1 }
{ companyId: 1, createdAt: -1 }

// Client
{ companyId: 1, deletedAt: 1 }
{ companyId: 1, email: 1 }

// Product
{ companyId: 1, deletedAt: 1 }
{ companyId: 1, name: 1 }
```

## 🚨 Consideraciones Importantes

### 1. Tax IDs Temporales

Los `taxId` generados son temporales (`TEMP-XXXXX`). **Deben actualizarse manualmente** después de la migración:

```typescript
// Actualizar taxId de compañía
await Company.updateOne(
  { _id: companyId },
  { $set: { taxId: 'B12345678' } }
);
```

### 2. Datos Huérfanos

Si hay registros sin `userId` ni `companyId`, el script los asigna a la primera compañía encontrada. **Revisar manualmente** estos casos.

### 3. VeriFactu

Los XMLs de VeriFactu ya generados **no se migran** (permanecen vinculados a facturas). Solo se crean nuevos XMLs con `companyId`.

### 4. Multi-Usuario

Si un usuario tiene acceso a múltiples compañías, el script crea una compañía por defecto y asigna todos sus datos a esa compañía. El usuario puede crear/agregar más compañías después.

## 📊 Métricas de Éxito

- ✅ **100% de usuarios** tienen `companyId`
- ✅ **100% de registros** tienen `companyId`
- ✅ **0 registros huérfanos**
- ✅ **Índices compuestos** funcionan correctamente
- ✅ **Queries por `companyId`** funcionan correctamente
- ✅ **Aislamiento de datos** verificado

## 🔍 Troubleshooting

### Error: "User already has companyId"

**Causa**: El usuario ya fue migrado previamente.

**Solución**: Verificar si la migración ya se ejecutó. Si es necesario, ejecutar rollback primero.

### Error: "Cannot assign companyId to orphaned records"

**Causa**: Hay registros sin `userId` ni `companyId`.

**Solución**: Revisar manualmente estos registros y asignarlos a una compañía apropiada.

### Error: "Index creation failed"

**Causa**: Índices duplicados o conflictos.

**Solución**: Eliminar índices existentes y recrearlos:

```bash
# En MongoDB shell
db.invoices.dropIndex("companyId_1_deletedAt_1")
# Luego ejecutar script de índices
npx tsx scripts/init-db.js
```

## 📅 Timeline Estimado

| Fase | Duración | Descripción |
|------|----------|-------------|
| Preparación | 1-2 horas | Backup, verificación, configuración |
| Ejecución | 30-60 min | Ejecutar script de migración |
| Verificación | 1-2 horas | Verificar datos, pruebas manuales |
| Rollback (si necesario) | 30 min | Restaurar desde backup |

**Total estimado**: 3-5 horas (sin rollback)

## ✅ Checklist Pre-Migración

- [ ] Backup de base de datos completado
- [ ] Verificación pre-migración ejecutada sin errores
- [ ] Variables de entorno configuradas
- [ ] Script de migración probado en ambiente de desarrollo
- [ ] Plan de rollback preparado
- [ ] Equipo notificado del mantenimiento

## ✅ Checklist Post-Migración

- [ ] Verificación post-migración ejecutada sin errores
- [ ] Pruebas manuales completadas
- [ ] Tax IDs temporales actualizados
- [ ] Datos huérfanos revisados y corregidos
- [ ] Índices compuestos verificados
- [ ] Aislamiento de datos verificado
- [ ] Documentación actualizada

## 📚 Referencias

- **Script de migración**: `scripts/migrate-to-multi-company.ts`
- **Script de verificación**: `scripts/verify-migration.ts`
- **Script de rollback**: `scripts/rollback-migration.ts`
- **Inicialización de índices**: `scripts/init-db.js`
- **Documentación RBAC**: `RBAC_IMPLEMENTATION_GUIDE.md`

