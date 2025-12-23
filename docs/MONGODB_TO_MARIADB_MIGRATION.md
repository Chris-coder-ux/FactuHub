# Análisis de Migración: MongoDB → MariaDB

## 📊 Resumen Ejecutivo

**Esfuerzo Estimado**: 🔴 **MUY ALTO** - 2-4 semanas de trabajo intensivo  
**Complejidad**: 🔴 **MUY ALTA** - Requiere reescritura significativa del código  
**Riesgo**: 🟡 **MEDIO-ALTO** - Posibles pérdidas de funcionalidad durante migración

---

## 🔍 Análisis del Código Actual

### Uso de MongoDB en el Proyecto

- **448 referencias** a `mongoose`/`MongoDB` en 83 archivos
- **138 usos** de características específicas de MongoDB:
  - `aggregate()` - Pipelines de agregación complejos
  - `.populate()` - Joins automáticos
  - `ObjectId` - Tipo de dato específico
  - Documentos embebidos (arrays, objetos anidados)

### Características Específicas de MongoDB Usadas

1. **Aggregation Pipelines** (Crítico)
   - `/api/analytics` - Pipelines complejos con `$match`, `$group`, `$lookup`, `$unwind`
   - Cálculos de profitability, cash flow, trends
   - **Impacto**: Requiere reescritura completa a SQL con JOINs y GROUP BY

2. **ObjectId** (Muy Común)
   - Todos los modelos usan `mongoose.Types.ObjectId`
   - Referencias entre colecciones
   - **Impacto**: Cambiar a UUID o auto-increment INT

3. **Documentos Embebidos** (Común)
   - `Invoice.items[]` - Array de items embebidos
   - `Client.address{}` - Objeto embebido
   - `Company.settings{}` - Objeto embebido
   - **Impacto**: Normalizar a tablas relacionadas

4. **`.populate()`** (Muy Común)
   - `Invoice.populate('client')`
   - `Invoice.populate('items.product')`
   - **Impacto**: Reemplazar con JOINs SQL

5. **Índices Específicos**
   - Índices compuestos de MongoDB
   - Text indexes para búsqueda full-text
   - **Impacto**: Recrear índices en SQL

---

## 📋 Tareas de Migración Requeridas

### Fase 1: Preparación (3-5 días)

1. **Elegir ORM SQL**
   - Opciones: Prisma, TypeORM, Sequelize, Knex.js
   - **Recomendado**: Prisma (TypeScript-first, mejor DX)

2. **Diseñar Esquema SQL**
   - Normalizar documentos embebidos a tablas
   - Definir relaciones (foreign keys)
   - Planear migración de datos

3. **Crear Scripts de Migración**
   - Exportar datos de MongoDB
   - Transformar a formato SQL
   - Importar a MariaDB

### Fase 2: Reescritura de Modelos (5-7 días)

**Modelos a Migrar** (20+ modelos):
- User, Company, Invoice, Client, Product
- Expense, Receipt, Payment, BankAccount
- Settings, AuditLog, SecurityAlert
- Template, RecurringInvoice
- AnalyticsMaterializedView
- Y más...

**Cambios por Modelo**:
```typescript
// ANTES (Mongoose)
const invoiceSchema = new Schema({
  items: [{
    product: Schema.Types.ObjectId,
    quantity: Number,
    price: Number
  }]
});

// DESPUÉS (Prisma)
model Invoice {
  id        String   @id @default(uuid())
  items     InvoiceItem[]
  // ...
}

model InvoiceItem {
  id         String   @id @default(uuid())
  invoiceId  String
  invoice    Invoice  @relation(fields: [invoiceId], references: [id])
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  quantity   Decimal
  price      Decimal
}
```

### Fase 3: Reescritura de Queries (7-10 días)

**Aggregation Pipelines → SQL**:

```typescript
// ANTES (MongoDB)
await Invoice.aggregate([
  { $match: { companyId, status: 'paid' } },
  { $unwind: '$items' },
  { $lookup: { from: 'products', ... } },
  { $group: { _id: '$items.product', total: { $sum: '$items.total' } } },
  { $sort: { total: -1 } }
]);

// DESPUÉS (SQL)
SELECT 
  i.product_id,
  SUM(i.total) as total
FROM invoice_items i
JOIN invoices inv ON i.invoice_id = inv.id
JOIN products p ON i.product_id = p.id
WHERE inv.company_id = ? AND inv.status = 'paid'
GROUP BY i.product_id
ORDER BY total DESC;
```

**Archivos Críticos a Reescribir**:
- `src/app/api/analytics/route.ts` - Pipelines complejos
- `src/app/api/reports/route.ts` - Queries complejas
- `src/app/api/invoices/route.ts` - Queries con populate
- Todos los endpoints API (40+ archivos)

### Fase 4: Migración de Datos (2-3 días)

1. **Exportar de MongoDB**
   ```bash
   mongodump --uri=$MONGODB_URI
   ```

2. **Transformar Datos**
   - ObjectId → UUID o INT
   - Documentos embebidos → Tablas relacionadas
   - Arrays → Tablas de relación

3. **Importar a MariaDB**
   ```bash
   mysql -u user -p database < data.sql
   ```

### Fase 5: Testing y Ajustes (3-5 días)

- Tests unitarios
- Tests de integración
- Verificar funcionalidad completa
- Optimizar queries SQL
- Ajustar índices

---

## ⚠️ Desafíos Principales

### 1. Aggregation Pipelines Complejos

**Ejemplo Real del Código**:
```typescript
// src/app/api/analytics/route.ts
await Invoice.aggregate([
  { $match: { companyId, status: 'paid' } },
  { $project: { client: 1, total: 1, subtotal: 1 } },
  { $group: {
    _id: '$client',
    totalRevenue: { $sum: '$total' },
    invoiceCount: { $addToSet: '$_id' }
  }},
  { $lookup: {
    from: 'clients',
    localField: '_id',
    foreignField: '_id',
    as: 'clientInfo',
    pipeline: [{ $project: { name: 1, email: 1 } }]
  }},
  { $unwind: '$clientInfo' },
  { $sort: { totalRevenue: -1 } },
  { $limit: 10 }
]);
```

**Equivalente SQL** (más complejo):
```sql
SELECT 
  c.id,
  c.name,
  c.email,
  SUM(i.total) as total_revenue,
  COUNT(DISTINCT i.id) as invoice_count
FROM invoices i
JOIN clients c ON i.client_id = c.id
WHERE i.company_id = ? AND i.status = 'paid'
GROUP BY c.id, c.name, c.email
ORDER BY total_revenue DESC
LIMIT 10;
```

### 2. Documentos Embebidos

**Problema**: MongoDB permite arrays/objetos embebidos, SQL requiere normalización

**Ejemplo**:
```typescript
// MongoDB - Documento embebido
Invoice {
  items: [
    { product: ObjectId, quantity: 2, price: 100 },
    { product: ObjectId, quantity: 1, price: 50 }
  ]
}

// SQL - Tabla relacionada
invoices: id, company_id, client_id, ...
invoice_items: id, invoice_id, product_id, quantity, price
```

### 3. ObjectId vs UUID/INT

**Decisión Requerida**:
- **UUID**: Más seguro, funciona en multi-instancia, pero más lento
- **INT AUTO_INCREMENT**: Más rápido, pero problemas en multi-instancia
- **Recomendado**: UUID para IDs principales

### 4. Performance de Queries

**MongoDB**: Optimizado para documentos, agregaciones rápidas  
**MariaDB**: Optimizado para JOINs, requiere índices cuidadosos

---

## 💰 Costo vs Beneficio

### ¿Por qué Cambiar?

**Razones Válidas**:
- ✅ Requisitos de compliance (algunas empresas requieren SQL)
- ✅ Equipo más familiarizado con SQL
- ✅ Integración con sistemas legacy SQL
- ✅ Transacciones ACID más estrictas necesarias

**Razones NO Válidas**:
- ❌ "SQL es mejor" (MongoDB es excelente para este caso de uso)
- ❌ "Más barato" (costo de migración > ahorro)
- ❌ "Más rápido" (depende del caso de uso)

### Costo de NO Migrar

**MongoDB es Adecuado Para**:
- ✅ Documentos con estructura variable
- ✅ Agregaciones complejas (analytics)
- ✅ Escalabilidad horizontal
- ✅ Desarrollo rápido
- ✅ Multi-tenant (companyId filtering)

---

## 🎯 Recomendación

### ❌ NO Recomendado Migrar Si:

1. **No hay razón técnica específica**
   - MongoDB funciona bien para este caso de uso
   - El código actual está optimizado para MongoDB

2. **El proyecto está en producción**
   - Riesgo alto de downtime
   - Posibles pérdidas de datos durante migración

3. **No hay tiempo/budget**
   - 2-4 semanas de desarrollo
   - Testing exhaustivo requerido

### ✅ Considerar Migrar Si:

1. **Requisito de negocio específico**
   - Compliance que requiere SQL
   - Integración con sistemas SQL legacy

2. **Equipo especializado en SQL**
   - Conocimiento profundo de SQL
   - Preferencia del equipo

3. **Budget y tiempo disponibles**
   - 2-4 semanas de desarrollo
   - Ventana de mantenimiento para migración

---

## 🛠️ Alternativas (Menos Invasivas)

### Opción 1: Mantener MongoDB + Agregar MariaDB para Reportes

- MongoDB para operaciones principales
- MariaDB solo para reportes/analytics complejos
- Sincronización periódica de datos

### Opción 2: Usar MongoDB Atlas (Cloud)

- MongoDB gestionado
- Menos mantenimiento
- Escalabilidad automática

### Opción 3: Optimizar MongoDB Actual

- Mejorar índices
- Optimizar aggregation pipelines
- Usar read replicas para analytics

---

## 📊 Comparación Rápida

| Aspecto | MongoDB (Actual) | MariaDB (Propuesto) |
|---------|------------------|---------------------|
| **Esfuerzo Migración** | - | 🔴 2-4 semanas |
| **Performance Analytics** | ✅ Excelente | ✅ Excelente (con índices) |
| **Escalabilidad Horizontal** | ✅ Nativa | 🟡 Requiere sharding |
| **Flexibilidad Schema** | ✅ Alta | 🟡 Requiere migraciones |
| **Costo Desarrollo** | ✅ Ya implementado | 🔴 Reescritura completa |
| **Complejidad Queries** | ✅ Pipelines claros | 🟡 SQL más verboso |
| **Transacciones** | ✅ Multi-document | ✅ ACID completo |

---

## 🚀 Plan de Migración (Si se Decide Proceder)

### Semana 1: Preparación
- [ ] Elegir ORM (Prisma recomendado)
- [ ] Diseñar esquema SQL completo
- [ ] Crear scripts de migración de datos
- [ ] Setup de MariaDB en desarrollo

### Semana 2: Modelos y Queries Básicas
- [ ] Migrar modelos principales (User, Company, Invoice)
- [ ] Reescribir queries básicas (GET, POST)
- [ ] Testing de funcionalidad básica

### Semana 3: Queries Complejas
- [ ] Reescribir aggregation pipelines a SQL
- [ ] Migrar endpoints de analytics
- [ ] Optimizar queries SQL

### Semana 4: Migración y Testing
- [ ] Migrar datos de producción
- [ ] Testing exhaustivo
- [ ] Deploy gradual (feature flags)
- [ ] Rollback plan

---

## 📝 Conclusión

**Migrar de MongoDB a MariaDB es MUY LABORIOSO** debido a:

1. **448 referencias** a MongoDB en el código
2. **Aggregation pipelines complejos** que requieren reescritura completa
3. **Documentos embebidos** que requieren normalización
4. **ObjectId** usado en todas partes
5. **20+ modelos** a migrar

**Estimación Realista**: 2-4 semanas de trabajo intensivo + testing exhaustivo

**Recomendación**: Solo migrar si hay una razón de negocio específica que lo justifique. MongoDB es excelente para este caso de uso y el código actual está bien optimizado.

---

**Última Actualización**: Diciembre 2025

