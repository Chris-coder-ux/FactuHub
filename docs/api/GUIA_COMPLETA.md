# Guía Completa de la API AppTrabajo

## 📚 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Empresas](#empresas)
4. [Clientes](#clientes)
5. [Productos](#productos)
6. [Facturas](#facturas)
7. [VeriFactu](#verifactu)
8. [Gastos](#gastos)
9. [Recibos](#recibos)
10. [Bancario](#bancario)
11. [Fiscal](#fiscal)
12. [Analytics](#analytics)
13. [Reportes](#reportes)
14. [Plantillas](#plantillas)
15. [Auditoría](#auditoría)
16. [Configuración](#configuración)
17. [Webhooks](#webhooks)

---

## Introducción

La API REST de AppTrabajo proporciona acceso completo a todas las funcionalidades de gestión empresarial, facturación, cumplimiento fiscal y análisis financiero.

### Base URL

- **Producción**: `https://api.apptrabajo.com`
- **Desarrollo**: `http://localhost:3000`

### Formato de Respuesta

Todas las respuestas siguen el formato JSON estándar:

```json
{
  "data": {},
  "message": "Success",
  "error": null
}
```

### Códigos de Estado HTTP

- `200` - Éxito
- `201` - Creado
- `400` - Solicitud incorrecta
- `401` - No autorizado
- `403` - Prohibido
- `404` - No encontrado
- `429` - Demasiadas solicitudes
- `500` - Error del servidor

### Paginación

Los endpoints que devuelven listas soportan paginación:

```
GET /api/resource?page=1&limit=20&sort=createdAt&order=desc
```

Respuesta paginada:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Autenticación

### Registrar Usuario

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "PasswordSeguro123!",
  "companyName": "Mi Empresa SL"
}
```

**Respuesta:**

```json
{
  "user": {
    "id": "user_123",
    "email": "juan@example.com",
    "name": "Juan Pérez"
  },
  "company": {
    "_id": "comp_123",
    "name": "Mi Empresa SL"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login (NextAuth)

```http
POST /api/auth/[...nextauth]
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "PasswordSeguro123!"
}
```

### Autenticación en Peticiones

Incluye el token JWT en el header:

```http
Authorization: Bearer tu-token-jwt
```

O usa cookies de sesión (NextAuth maneja esto automáticamente).

---

## Empresas

### Listar Empresas

```http
GET /api/companies
Authorization: Bearer {token}
```

**Respuesta:**

```json
{
  "companies": [
    {
      "_id": "comp_123",
      "name": "Mi Empresa SL",
      "taxId": "B12345678",
      "address": {
        "street": "Calle Principal 123",
        "city": "Madrid",
        "zipCode": "28001",
        "country": "España"
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Crear Empresa

```http
POST /api/companies
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nueva Empresa SL",
  "taxId": "B87654321",
  "legalName": "Nueva Empresa Sociedad Limitada",
  "email": "info@nuevaempresa.es",
  "phone": "+34911223344",
  "address": {
    "street": "Calle Nueva 456",
    "city": "Barcelona",
    "state": "Cataluña",
    "zipCode": "08001",
    "country": "España"
  },
  "website": "https://nuevaempresa.es",
  "industry": "Tecnología"
}
```

### Cambiar Empresa Activa

```http
POST /api/companies/switch
Authorization: Bearer {token}
Content-Type: application/json

{
  "companyId": "comp_123"
}
```

### Gestión de Miembros

```http
GET /api/companies/{id}/members
POST /api/companies/{id}/members
PUT /api/companies/{id}/members/{userId}
DELETE /api/companies/{id}/members/{userId}
```

---

## Clientes

### Listar Clientes

```http
GET /api/clients?page=1&limit=20&sort=name&order=asc&search=empresa
Authorization: Bearer {token}
```

**Parámetros de consulta:**
- `page` - Número de página (default: 1)
- `limit` - Elementos por página (default: 20)
- `sort` - Campo para ordenar (name, email, createdAt)
- `order` - Orden (asc, desc)
- `search` - Búsqueda por nombre o email

**Respuesta:**

```json
{
  "data": [
    {
      "_id": "client_123",
      "name": "Cliente Corporativo SL",
      "email": "cliente@corp.es",
      "phone": "+34987654321",
      "taxId": "A12345678",
      "address": {
        "street": "Avenida Principal 123",
        "city": "Madrid",
        "zipCode": "28001"
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### Crear Cliente

```http
POST /api/clients
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nuevo Cliente SL",
  "email": "nuevo@cliente.es",
  "phone": "+34123456789",
  "taxId": "B87654321",
  "address": {
    "street": "Calle Cliente 456",
    "city": "Barcelona",
    "state": "Cataluña",
    "zipCode": "08001",
    "country": "España"
  },
  "contactPerson": "Ana García",
  "website": "https://cliente.es",
  "notes": "Cliente preferente"
}
```

### Obtener Cliente

```http
GET /api/clients/{id}
Authorization: Bearer {token}
```

### Actualizar Cliente

```http
PUT /api/clients/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "phone": "+34900112233",
  "notes": "Teléfono actualizado"
}
```

### Eliminar Cliente

```http
DELETE /api/clients/{id}
Authorization: Bearer {token}
```

---

## Productos

### Listar Productos

```http
GET /api/products?page=1&limit=20&search=servicio
Authorization: Bearer {token}
```

**Respuesta incluye productos propios y compartidos del grupo.**

### Crear Producto

```http
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Servicio de Consultoría",
  "description": "Servicio profesional de consultoría",
  "price": 100.00,
  "tax": 21,
  "unit": "hora",
  "sku": "SERV-CONSUL-001",
  "category": "Servicios",
  "isActive": true
}
```

### Compartir Producto

```http
POST /api/products/{id}/share
Authorization: Bearer {token}
```

Comparte el producto con otras empresas del mismo grupo.

### Dejar de Compartir

```http
DELETE /api/products/{id}/share
Authorization: Bearer {token}
```

---

## Facturas

### Listar Facturas

```http
GET /api/invoices?page=1&limit=20&status=paid&type=invoice
Authorization: Bearer {token}
```

**Parámetros:**
- `status` - draft, sent, paid, overdue, cancelled
- `type` - invoice, proforma
- `sort` - invoiceNumber, total, status, dueDate, createdAt

### Crear Factura

```http
POST /api/invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "client": "client_123",
  "items": [
    {
      "product": "prod_123",
      "quantity": 2,
      "price": 100.00,
      "tax": 21,
      "description": "Servicio profesional"
    }
  ],
  "invoiceDate": "2025-01-15",
  "dueDate": "2025-02-15",
  "invoiceType": "invoice",
  "paymentMethod": "transfer",
  "currency": "EUR",
  "notes": "Factura de servicios",
  "paymentTerms": "Pago en 30 días"
}
```

**Respuesta:**

```json
{
  "_id": "inv_123",
  "invoiceNumber": "INV-2025-001",
  "client": {
    "_id": "client_123",
    "name": "Cliente Corporativo SL"
  },
  "items": [...],
  "subtotal": 200.00,
  "taxAmount": 42.00,
  "total": 242.00,
  "status": "draft",
  "invoiceType": "invoice",
  "createdAt": "2025-01-15T00:00:00.000Z"
}
```

### Obtener Factura

```http
GET /api/invoices/{id}
Authorization: Bearer {token}
```

### Actualizar Factura

```http
PUT /api/invoices/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "sent",
  "notes": "Factura enviada"
}
```

### Cancelar Factura

```http
POST /api/invoices/{id}/cancel
Authorization: Bearer {token}
```

### Enviar Factura por Email

```http
POST /api/invoices/{id}/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "to": "cliente@example.com",
  "subject": "Factura INV-2025-001",
  "message": "Adjunto encontrará la factura..."
}
```

### Generar PDF

```http
GET /api/invoices/{id}/pdf
Authorization: Bearer {token}
```

**Respuesta:** Blob PDF

### Convertir Proforma a Factura

```http
POST /api/invoices/{id}/convert-to-invoice
Authorization: Bearer {token}
```

### Checkout (Stripe)

```http
POST /api/invoices/{id}/checkout
Authorization: Bearer {token}
```

---

## VeriFactu

### Generar XML

```http
POST /api/invoices/{id}/verifactu/generate
Authorization: Bearer {token}
```

**Respuesta:**

```json
{
  "xml": "<?xml version=\"1.0\"?>...",
  "hash": "abc123def456...",
  "invoiceId": "inv_123"
}
```

### Firmar XML

```http
POST /api/invoices/{id}/verifactu/sign
Authorization: Bearer {token}
```

**Requiere certificado digital configurado en Settings.**

### Enviar a AEAT

```http
POST /api/invoices/{id}/verifactu/send
Authorization: Bearer {token}
```

**Respuesta:**

```json
{
  "success": true,
  "aeatCode": "AEAT-2025-001234",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Consultar Estado

```http
GET /api/invoices/{id}/verifactu/status
Authorization: Bearer {token}
```

**Respuesta:**

```json
{
  "status": "sent",
  "aeatCode": "AEAT-2025-001234",
  "lastUpdate": "2025-01-15T10:30:00.000Z",
  "errors": []
}
```

---

## Gastos

### Listar Gastos

```http
GET /api/expenses?page=1&limit=20&status=pending&category=viajes
Authorization: Bearer {token}
```

**Parámetros:**
- `status` - pending, approved, rejected
- `category` - viajes, oficina, marketing, etc.
- `startDate`, `endDate` - Rango de fechas

### Crear Gasto

```http
POST /api/expenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Viaje a Madrid",
  "amount": 250.00,
  "category": "viajes",
  "date": "2025-01-15",
  "receipt": "receipt_123",
  "notes": "Reunión con cliente"
}
```

### Aprobar/Rechazar Gasto

```http
PUT /api/expenses/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "approved",
  "approverNotes": "Aprobado"
}
```

### Reportes de Gastos

```http
GET /api/expenses/reports?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {token}
```

### Exportar Gastos

```http
GET /api/expenses/export?format=excel&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {token}
```

---

## Recibos

### Listar Recibos

```http
GET /api/receipts?page=1&limit=20
Authorization: Bearer {token}
```

### Subir Recibo

```http
POST /api/receipts
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "image": File,
  "category": "viajes",
  "amount": 50.00,
  "date": "2025-01-15"
}
```

**Respuesta incluye datos extraídos por OCR.**

### Validar Precisión OCR

```http
POST /api/receipts/validate-accuracy
Authorization: Bearer {token}
Content-Type: application/json

{
  "receiptId": "receipt_123",
  "correctedData": {
    "amount": 50.00,
    "date": "2025-01-15",
    "merchant": "Restaurante XYZ"
  }
}
```

---

## Bancario

### Conectar Cuenta Bancaria

```http
POST /api/banking/connect
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider": "openbank",
  "credentials": {
    "clientId": "...",
    "clientSecret": "..."
  }
}
```

### Sincronizar Transacciones

```http
POST /api/banking/sync
Authorization: Bearer {token}
```

### Listar Transacciones

```http
GET /api/banking/transactions?page=1&limit=50&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {token}
```

### Conciliación Automática

```http
POST /api/banking/reconcile
Authorization: Bearer {token}
Content-Type: application/json

{
  "transactionId": "trans_123",
  "invoiceId": "inv_123"
}
```

### Sugerencias de Conciliación

```http
GET /api/banking/reconciliation/suggestions?transactionId=trans_123
Authorization: Bearer {token}
```

### Exportar Conciliación

```http
GET /api/banking/reconciliation/export?format=excel&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {token}
```

---

## Fiscal

### Proyecciones IVA/IRPF

```http
GET /api/fiscal/projections?year=2025&quarter=Q1
Authorization: Bearer {token}
```

**Respuesta:**

```json
{
  "iva": {
    "projected": 5000.00,
    "paid": 3000.00,
    "pending": 2000.00
  },
  "irpf": {
    "projected": 3000.00,
    "paid": 2000.00,
    "pending": 1000.00
  },
  "trends": [...]
}
```

### Calendario Fiscal

```http
GET /api/fiscal/calendar?year=2025
Authorization: Bearer {token}
```

### Tendencias Fiscales

```http
GET /api/fiscal/trends?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer {token}
```

### Análisis What-If

```http
POST /api/fiscal/what-if
Authorization: Bearer {token}
Content-Type: application/json

{
  "scenario": {
    "revenue": 100000,
    "expenses": 50000,
    "taxRate": 25
  }
}
```

### Validar Cálculos

```http
POST /api/fiscal/validate
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoiceId": "inv_123"
}
```

### Recordatorios Fiscales

```http
GET /api/fiscal/reminders
Authorization: Bearer {token}
```

---

## Analytics

### Analytics Avanzados

```http
GET /api/analytics?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer {token}
```

**Respuesta:**

```json
{
  "clientProfitability": [
    {
      "client": "Cliente A",
      "revenue": 50000,
      "costs": 30000,
      "profit": 20000,
      "margin": 40
    }
  ],
  "productProfitability": [
    {
      "product": "Producto A",
      "revenue": 30000,
      "costs": 15000,
      "profit": 15000,
      "margin": 50
    }
  ],
  "cashFlow": {
    "income": 100000,
    "expenses": 50000,
    "net": 50000,
    "byDay": [...]
  },
  "trends": {
    "growth": 15,
    "churn": 2,
    "monthly": [...]
  },
  "summary": {
    "totalRevenue": 1000000,
    "activeClients": 25,
    "averageInvoice": 4000
  }
}
```

---

## Reportes

### Generar Reporte

```http
GET /api/reports?type=revenue&startDate=2025-01-01&endDate=2025-12-31&format=pdf
Authorization: Bearer {token}
```

**Tipos de reporte:**
- `revenue` - Ingresos
- `expenses` - Gastos
- `profitability` - Rentabilidad
- `cashflow` - Flujo de caja
- `fiscal` - Fiscal

**Formatos:**
- `pdf` - PDF
- `excel` - Excel
- `csv` - CSV

---

## Plantillas

### Listar Plantillas

```http
GET /api/templates?type=invoice&isDefault=true
Authorization: Bearer {token}
```

### Crear Plantilla

```http
POST /api/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Plantilla Factura Simple",
  "type": "invoice",
  "isDefault": false,
  "isShared": false,
  "invoiceTemplate": {
    "client": "client_123",
    "items": [...],
    "notes": "Gracias por su confianza"
  }
}
```

### Aplicar Plantilla

```http
POST /api/templates/{id}/apply
Authorization: Bearer {token}
```

Devuelve datos pre-rellenados para crear una factura.

---

## Auditoría

### Listar Logs

```http
GET /api/audit-logs?action=create&resourceType=invoice&page=1&limit=50
Authorization: Bearer {token}
```

**Parámetros:**
- `action` - create, update, delete, view
- `resourceType` - invoice, client, product, etc.
- `userId` - Filtrar por usuario
- `success` - true/false

### Estadísticas de Auditoría

```http
GET /api/audit-logs/stats?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {token}
```

---

## Configuración

### Obtener Configuración

```http
GET /api/settings
Authorization: Bearer {token}
```

### Actualizar Configuración

```http
PUT /api/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "aeatPassword": "encrypted_password",
  "certificatePath": "/path/to/cert.p12",
  "emailNotifications": true,
  "fiscalReminders": true
}
```

---

## Webhooks

### Webhook Stripe

```http
POST /api/webhooks/stripe
X-Stripe-Signature: ...
```

Maneja eventos de pago de Stripe.

---

## Rate Limiting

La API implementa rate limiting por empresa:

- **Mutations** (POST, PUT, DELETE): 100 requests / 10 segundos
- **Queries** (GET): 200 requests / 10 segundos

Headers de respuesta:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-01-15T10:30:00.000Z
Retry-After: 5
```

---

## Manejo de Errores

### Formato de Error

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "email",
    "message": "Email inválido"
  }
}
```

### Códigos de Error Comunes

- `VALIDATION_ERROR` - Error de validación
- `NOT_FOUND` - Recurso no encontrado
- `UNAUTHORIZED` - No autorizado
- `FORBIDDEN` - Prohibido
- `RATE_LIMIT_EXCEEDED` - Límite de tasa excedido
- `INTERNAL_ERROR` - Error interno del servidor

---

## Ejemplos de Uso

### Ejemplo Completo: Crear Factura y Enviar a VeriFactu

```javascript
// 1. Crear factura
const invoice = await fetch('/api/invoices', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client: 'client_123',
    items: [{
      product: 'prod_123',
      quantity: 2,
      price: 100,
      tax: 21
    }],
    dueDate: '2025-02-15'
  })
}).then(r => r.json());

// 2. Generar XML VeriFactu
const xml = await fetch(`/api/invoices/${invoice._id}/verifactu/generate`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 3. Firmar XML
await fetch(`/api/invoices/${invoice._id}/verifactu/sign`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// 4. Enviar a AEAT
const aeat = await fetch(`/api/invoices/${invoice._id}/verifactu/send`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log('Factura enviada a AEAT:', aeat.aeatCode);
```

---

## SDK

Para facilitar el uso de la API, disponemos de un SDK TypeScript/JavaScript:

```bash
npm install @apptrabajo/sdk
```

```typescript
import AppTrabajoSDK from '@apptrabajo/sdk';

const sdk = new AppTrabajoSDK({
  baseUrl: 'https://api.apptrabajo.com',
  accessToken: 'tu-token'
});

// Usar el SDK
const invoice = await sdk.createInvoice({
  client: 'client_123',
  items: [...]
});
```

Ver más ejemplos en `examples/sdk-usage.js`.

---

## Soporte

Para más información:
- **Documentación OpenAPI**: `/docs/api/openapi.yaml`
- **SDK**: `/packages/sdk`
- **Ejemplos**: `/examples/sdk-usage.js`

