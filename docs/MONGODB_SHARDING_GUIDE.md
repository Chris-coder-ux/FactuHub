# 📊 MongoDB Sharding Strategy Guide

## 📋 Tabla de Contenidos

1. [¿Qué es Sharding?](#qué-es-sharding)
2. [¿Cuándo Implementar Sharding?](#cuándo-implementar-sharding)
3. [Estrategia de Sharding para FacturaHub](#estrategia-de-sharding)
4. [Configuración en MongoDB Atlas](#configuración-en-mongodb-atlas)
5. [Preparación del Código](#preparación-del-código)
6. [Migración a Sharding](#migración-a-sharding)
7. [Consideraciones y Mejores Prácticas](#consideraciones)

---

## 🎯 ¿Qué es Sharding?

Sharding es una técnica de MongoDB que distribuye datos a través de múltiples servidores (shards) para escalar horizontalmente. Cada shard contiene un subconjunto de los datos.

**Beneficios:**
- ✅ Escalabilidad horizontal ilimitada
- ✅ Mejor rendimiento con grandes volúmenes de datos
- ✅ Distribución de carga entre múltiples servidores

**Desventajas:**
- ⚠️ Mayor complejidad operacional
- ⚠️ Requiere configuración cuidadosa
- ⚠️ Migración de datos puede ser compleja

---

## 📊 ¿Cuándo Implementar Sharding?

### Indicadores de que Necesitas Sharding

1. **Volumen de Datos:**
   - Base de datos > 500GB
   - Crecimiento proyectado > 100GB/año
   - Múltiples colecciones > 100GB cada una

2. **Rendimiento:**
   - Queries lentas a pesar de índices optimizados
   - CPU del servidor constantemente > 80%
   - Memoria insuficiente para working set

3. **Escalabilidad:**
   - Necesitas más capacidad que el servidor más grande disponible
   - Requisitos de alta disponibilidad y distribución geográfica

### Evaluación para FacturaHub

**Métricas a Monitorear:**
```javascript
// Ejecutar en MongoDB para evaluar
db.stats() // Tamaño total de la base de datos
db.invoices.stats() // Tamaño de colección principal
db.invoices.getIndexes() // Verificar índices

// Monitorear en MongoDB Atlas:
// - Storage Size
// - Working Set Size
// - Query Performance
// - CPU/Memory Usage
```

**Umbral Recomendado:**
- **No shardear si:** Base de datos < 200GB, < 10 empresas grandes
- **Considerar sharding si:** Base de datos > 500GB, > 50 empresas grandes
- **Shardear cuando:** Base de datos > 1TB, > 100 empresas grandes

---

## 🎯 Estrategia de Sharding para FacturaHub

### Shard Key: `companyId`

**Razones:**
1. ✅ **Aislamiento Multi-tenant**: Cada empresa en su propio shard o grupo de shards
2. ✅ **Distribución Equitativa**: Si tienes muchas empresas, distribución natural
3. ✅ **Queries Eficientes**: Todas las queries incluyen `companyId` (requisito de seguridad)
4. ✅ **Escalabilidad**: Nuevas empresas se distribuyen automáticamente

### Colecciones a Shardear

**Prioridad Alta:**
- `invoices` - Colección más grande y consultada
- `expenses` - Crecimiento rápido
- `auditlogs` - Alto volumen de escritura

**Prioridad Media:**
- `clients` - Volumen moderado
- `products` - Volumen moderado
- `payments` - Volumen moderado

**No Shardear (Colecciones Pequeñas):**
- `companies` - Colección pequeña, consultada frecuentemente
- `users` - Colección pequeña
- `settings` - Colección pequeña

### Estrategia de Shard Key Compuesto (Opcional)

Para distribuciones más granulares, considerar:
```javascript
// Shard key compuesto para invoices
{ companyId: 1, createdAt: 1 }

// Beneficios:
// - Mejor distribución si una empresa tiene muchos documentos
// - Queries por fecha más eficientes
// - Mejor balanceo de carga

// Desventajas:
// - Queries sin createdAt pueden ser menos eficientes
// - Mayor complejidad
```

**Recomendación:** Empezar con `{ companyId: 1 }` simple, migrar a compuesto si es necesario.

---

## ⚙️ Configuración en MongoDB Atlas

### Paso 1: Crear Sharded Cluster

1. **En MongoDB Atlas:**
   - Ve a tu proyecto
   - Click en "Create" → "Cluster"
   - Selecciona "Sharded Cluster"
   - Elige región y tier (mínimo M10 por shard)

2. **Configuración Inicial:**
   - **Shards**: Empezar con 2-3 shards
   - **Config Servers**: Automático (3 nodos)
   - **Mongos Routers**: Automático (2+ nodos)

### Paso 2: Habilitar Sharding en Base de Datos

```javascript
// Conectar a mongos (no directamente a shards)
// Connection string incluye: mongos0.cluster.mongodb.net

// Habilitar sharding en la base de datos
sh.enableSharding("facturahub")
```

### Paso 3: Crear Shard Key Index

```javascript
// Crear índice en companyId (debe existir antes de shardear)
use facturahub
db.invoices.createIndex({ companyId: 1 })

// Verificar que el índice existe
db.invoices.getIndexes()
```

### Paso 4: Shardear Colección

```javascript
// Shardear colección invoices
sh.shardCollection("facturahub.invoices", { companyId: 1 })

// Verificar estado
sh.status()

// Monitorear distribución
db.invoices.getShardDistribution()
```

### Paso 5: Repetir para Otras Colecciones

```javascript
// Shardear otras colecciones importantes
sh.shardCollection("facturahub.expenses", { companyId: 1 })
sh.shardCollection("facturahub.auditlogs", { companyId: 1 })
sh.shardCollection("facturahub.clients", { companyId: 1 })
```

### Paso 6: Verificar y Monitorear

```javascript
// Ver distribución de datos
sh.status()

// Ver estadísticas por shard
db.invoices.aggregate([
  { $group: { _id: null, count: { $sum: 1 } } }
])

// Monitorear en MongoDB Atlas Dashboard:
// - Chunk Distribution
// - Shard Balance
// - Query Performance
```

---

## 💻 Preparación del Código

### ✅ Estado Actual: Preparado para Sharding

El código de FacturaHub ya está preparado para sharding:

1. **Todas las queries incluyen `companyId`:**
   ```typescript
   // ✅ CORRECTO - Usa createCompanyFilter
   const filter = createCompanyFilter(companyId, { deletedAt: null });
   await Invoice.find(filter);
   ```

2. **Índices optimizados con `companyId` primero:**
   ```typescript
   // ✅ Todos los índices compuestos tienen companyId primero
   invoiceSchema.index({ companyId: 1, status: 1 });
   invoiceSchema.index({ companyId: 1, createdAt: -1 });
   ```

3. **Helper function para consistencia:**
   ```typescript
   // ✅ createCompanyFilter asegura que companyId siempre esté presente
   export function createCompanyFilter(companyId: string, additionalFilter = {}) {
     return {
       ...additionalFilter,
       companyId: toCompanyObjectId(companyId),
     };
   }
   ```

### ⚠️ Verificaciones Antes de Shardear

1. **Asegurar que todas las queries incluyan companyId:**
   ```bash
   # Buscar queries sin companyId (no deberían existir)
   grep -r "\.find({" src/app/api --exclude-dir=node_modules
   grep -r "\.aggregate([" src/app/api --exclude-dir=node_modules
   ```

2. **Verificar índices:**
   ```typescript
   // Todos los índices compuestos deben tener companyId primero
   // Ejecutar después de shardear para verificar
   db.invoices.getIndexes()
   ```

3. **Queries que NO deben shardearse:**
   - Queries globales sin companyId (no deberían existir por seguridad)
   - Queries de administración (si existen, usar `allowDiskUse: true`)

---

## 🔄 Migración a Sharding

### Estrategia de Migración

**Opción 1: Migración Gradual (Recomendado)**

1. **Fase 1: Preparación (Sin Downtime)**
   - Crear sharded cluster en paralelo
   - Configurar índices
   - Verificar compatibilidad

2. **Fase 2: Migración de Datos**
   - Usar `mongodump` y `mongorestore` con sharding habilitado
   - O usar MongoDB Atlas Live Migration
   - Migrar colecciones una por una

3. **Fase 3: Switchover**
   - Actualizar connection string en aplicación
   - Verificar que todo funciona
   - Monitorear performance

**Opción 2: MongoDB Atlas Live Migration**

1. En MongoDB Atlas, usar "Live Migration"
2. Seleccionar sharded cluster como destino
3. MongoDB maneja la migración automáticamente
4. Switchover cuando esté listo

### Script de Migración

```bash
#!/bin/bash
# migrate-to-sharding.sh

# 1. Backup de datos actuales
mongodump --uri="$MONGODB_URI" --out=/backups/pre-sharding

# 2. Crear índices en sharded cluster
mongosh "$MONGODB_SHARDED_URI" <<EOF
use facturahub
db.invoices.createIndex({ companyId: 1 })
db.expenses.createIndex({ companyId: 1 })
db.auditlogs.createIndex({ companyId: 1 })
EOF

# 3. Habilitar sharding
mongosh "$MONGODB_SHARDED_URI" <<EOF
sh.enableSharding("facturahub")
sh.shardCollection("facturahub.invoices", { companyId: 1 })
sh.shardCollection("facturahub.expenses", { companyId: 1 })
sh.shardCollection("facturahub.auditlogs", { companyId: 1 })
EOF

# 4. Restaurar datos (se distribuirán automáticamente)
mongorestore --uri="$MONGODB_SHARDED_URI" /backups/pre-sharding

# 5. Verificar distribución
mongosh "$MONGODB_SHARDED_URI" <<EOF
sh.status()
db.invoices.getShardDistribution()
EOF
```

---

## ⚠️ Consideraciones y Mejores Prácticas

### 1. Shard Key Selection

**✅ Buenas Prácticas:**
- Shard key debe estar en todas las queries importantes
- Distribución relativamente uniforme
- Evitar "hot spots" (una empresa con 90% de datos)

**❌ Evitar:**
- Shard keys que causan distribución desigual
- Shard keys que no están en queries frecuentes
- Cambiar shard key después de shardear (muy complejo)

### 2. Chunk Management

**Tamaño de Chunks:**
- Default: 64MB (MongoDB)
- Chunks grandes: Mejor para queries, peor para balanceo
- Chunks pequeños: Mejor balanceo, más overhead

**Balanceo:**
- MongoDB balancea automáticamente
- Puede tomar tiempo después de migración
- Monitorear en Atlas Dashboard

### 3. Queries Eficientes

**✅ Queries Optimizadas (Targeted):**
```typescript
// Incluye shard key - va directo al shard correcto
await Invoice.find({ companyId: companyId, status: 'paid' });
```

**⚠️ Queries Menos Eficientes (Scatter-Gather):**
```typescript
// Sin shard key - debe consultar todos los shards
// Evitar si es posible
await Invoice.find({ status: 'paid' }); // ❌ Sin companyId
```

**Nota:** En FacturaHub, todas las queries incluyen `companyId` por seguridad, así que esto no debería ser un problema.

### 4. Índices en Sharded Collections

**Reglas:**
- Índice único debe incluir shard key
- Índices compuestos deben tener shard key primero (o al menos incluirlo)
- Índices sin shard key son menos eficientes

**Ejemplo:**
```typescript
// ✅ CORRECTO - Shard key primero
{ companyId: 1, status: 1 }

// ✅ CORRECTO - Shard key incluido
{ companyId: 1, createdAt: -1 }

// ⚠️ Menos eficiente - Shard key no primero
{ status: 1, companyId: 1 }
```

### 5. Transacciones en Sharded Clusters

**Limitaciones:**
- Transacciones multi-documento solo dentro de un shard
- Transacciones que cruzan shards requieren MongoDB 4.2+
- Considerar esto al diseñar operaciones atómicas

**En FacturaHub:**
- La mayoría de transacciones son por empresa (mismo shard)
- Operaciones que cruzan empresas son raras
- Compatible con sharding

### 6. Monitoreo

**Métricas Clave:**
- Chunk distribution balance
- Query performance por shard
- Shard balance (chunks por shard)
- Jumbo chunks (chunks > 64MB)

**Herramientas:**
- MongoDB Atlas Dashboard
- `sh.status()` en mongosh
- `db.collection.getShardDistribution()`

---

## 📝 Checklist de Implementación

### Pre-Sharding
- [ ] Evaluar volumen de datos actual y proyección
- [ ] Verificar que todas las queries incluyan `companyId`
- [ ] Verificar índices (companyId primero en compuestos)
- [ ] Crear backup completo de datos
- [ ] Documentar queries críticas

### Configuración
- [ ] Crear sharded cluster en MongoDB Atlas
- [ ] Habilitar sharding en base de datos
- [ ] Crear índices de shard key
- [ ] Shardear colecciones principales
- [ ] Verificar distribución inicial

### Migración
- [ ] Migrar datos (mongorestore o Live Migration)
- [ ] Verificar integridad de datos
- [ ] Verificar distribución de chunks
- [ ] Actualizar connection string en aplicación
- [ ] Monitorear performance post-migración

### Post-Migración
- [ ] Monitorear balanceo de chunks (puede tomar días)
- [ ] Verificar performance de queries
- [ ] Ajustar índices si es necesario
- [ ] Documentar cambios y lecciones aprendidas

---

## 🔗 Recursos Adicionales

- [MongoDB Sharding Documentation](https://docs.mongodb.com/manual/sharding/)
- [MongoDB Atlas Sharding Guide](https://docs.atlas.mongodb.com/sharding/)
- [Shard Key Selection Best Practices](https://docs.mongodb.com/manual/core/sharding-shard-key/)
- [MongoDB Sharding FAQ](https://docs.mongodb.com/manual/faq/sharding/)

---

## 📊 Resumen

**FacturaHub está preparado para sharding:**
- ✅ Todas las queries incluyen `companyId`
- ✅ Índices optimizados con `companyId` primero
- ✅ Arquitectura multi-tenant compatible

**Cuándo implementar:**
- Cuando base de datos > 500GB
- Cuando performance se degrada a pesar de optimizaciones
- Cuando necesitas escalabilidad horizontal

**Shard key recomendado:**
- `{ companyId: 1 }` - Simple y efectivo
- Considerar `{ companyId: 1, createdAt: 1 }` si distribución es desigual

**Migración:**
- Usar MongoDB Atlas Live Migration si es posible
- O migración gradual con mongodump/mongorestore
- Monitorear cuidadosamente durante y después

