# Documentación de API

## Autenticación

### Registro
`POST /api/auth/register`

Cuerpo:
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123"
}
```

Respuesta: Usuario creado.

### Login
Manejado por NextAuth en `/api/auth/[...nextauth]`.

## Clientes

### Listar Clientes
`GET /api/clients`

Requiere autenticación.

Respuesta: Array de clientes.

### Crear Cliente
`POST /api/clients`

Cuerpo:
```json
{
  "name": "Cliente Ejemplo",
  "email": "cliente@example.com",
  "phone": "+123456789",
  "address": {
    "street": "Calle 123",
    "city": "Ciudad",
    "state": "Estado",
    "zipCode": "12345",
    "country": "País"
  },
  "taxId": "123456789"
}
```

## Facturas

### Listar Facturas
`GET /api/invoices`

### Crear Factura
`POST /api/invoices`

Cuerpo:
```json
{
  "invoiceNumber": "INV-001",
  "client": "cliente_id",
  "items": [
    {
      "product": "producto_id",
      "quantity": 2,
      "price": 50
    }
  ],
  "dueDate": "2023-12-31",
  "notes": "Notas opcionales"
}
```

### Generar PDF
`GET /api/invoices/:id/pdf`

## VeriFactu (Cumplimiento AEAT)

### Generar XML VeriFactu
`POST /api/invoices/:id/verifactu/generate`

Requiere: Certificados VeriFactu configurados en settings.

Respuesta:
```json
{
  "xml": "<SuministroInformacion>...</SuministroInformacion>",
  "hash": "abc123...",
  "status": "generated"
}
```

### Firmar y Enviar a AEAT
`POST /api/invoices/:id/verifactu/send`

Requiere: XML generado previamente.

Respuesta:
```json
{
  "success": true,
  "estadoEnvio": "AceptadaConErrores",
  "csv": "ABC123...",
  "timestamp": "2025-12-20T10:00:00Z"
}
```

### Consultar Estado VeriFactu
`GET /api/invoices/:id/verifactu/status`

Respuesta:
```json
{
  "verifactuId": "ABC123",
  "verifactuStatus": "verified",
  "verifactuSentAt": "2025-12-20T10:00:00Z",
  "verifactuVerifiedAt": "2025-12-20T10:05:00Z"
}
```

### Cancelar Factura
`PATCH /api/invoices/:id/cancel`

Requiere: Factura no cancelada y no pagada.

Cuerpo:
```json
{
  "reason": "Cancelación por error en datos",
  "cancellationDate": "2025-12-20"
}
```

Respuesta:
```json
{
  "message": "Invoice cancelled successfully",
  "invoice": {
    "id": "invoice_id",
    "status": "cancelled",
    "cancelledAt": "2025-12-20T10:00:00Z",
    "verifactuCancellationProcessed": true
  }
}
```

**Nota**: Si la factura tiene VeriFactu, genera automáticamente XML de corrección y lo envía a AEAT.

## Pagos

### Crear Intent de Pago
`POST /api/payments/create-intent`

Cuerpo:
```json
{
  "invoiceId": "factura_id",
  "amount": 100.00
}
```

Respuesta: client_secret para Stripe.

## Emails

### Enviar Factura por Email
`POST /api/emails/send-invoice`

Cuerpo:
```json
{
  "invoiceId": "factura_id",
  "email": "destinatario@example.com"
}
```

## Reportes

### Obtener Datos de Reportes
`GET /api/reports`

Respuesta: Ingresos, clientes, etc.