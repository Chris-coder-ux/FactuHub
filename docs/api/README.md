# Documentación de la API AppTrabajo

## Introducción

La API de AppTrabajo proporciona acceso completo a todas las funcionalidades de gestión de facturación, clientes, productos y cumplimiento fiscal (VeriFactu/AEAT).

## Autenticación

La API utiliza autenticación basada en tokens JWT. Obtén tu token mediante NextAuth:

```bash
# Login (obtener token)
POST /api/auth/[...nextauth]
```

Incluye el token en las peticiones:

```http
Authorization: Bearer tu-token-jwt
```

## Base URL

- **Producción**: `https://api.apptrabajo.com`
- **Desarrollo**: `http://localhost:3000`

## Endpoints Principales

### Autenticación

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/[...nextauth]` - Login (NextAuth)

### Empresas

- `GET /api/companies` - Listar empresas del usuario
- `POST /api/companies` - Crear empresa
- `POST /api/companies/switch` - Cambiar empresa activa

### Clientes

- `GET /api/clients` - Listar clientes (con paginación)
- `POST /api/clients` - Crear cliente
- `GET /api/clients/:id` - Obtener cliente
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente

### Productos

- `GET /api/products` - Listar productos
- `POST /api/products` - Crear producto
- `GET /api/products/:id` - Obtener producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto
- `POST /api/products/:id/share` - Compartir producto con grupo
- `DELETE /api/products/:id/share` - Dejar de compartir producto

### Facturas

- `GET /api/invoices` - Listar facturas (con filtros)
- `POST /api/invoices` - Crear factura
- `GET /api/invoices/:id` - Obtener factura
- `PUT /api/invoices/:id` - Actualizar factura
- `GET /api/invoices/:id/pdf` - Generar PDF
- `POST /api/invoices/:id/send` - Enviar por email
- `POST /api/invoices/:id/convert-to-invoice` - Convertir proforma a factura
- `PATCH /api/invoices/:id/cancel` - Cancelar factura

### VeriFactu

- `POST /api/invoices/:id/verifactu/generate` - Generar XML VeriFactu
- `POST /api/invoices/:id/verifactu/sign` - Firmar XML
- `POST /api/invoices/:id/verifactu/send` - Enviar a AEAT
- `GET /api/invoices/:id/verifactu/status` - Consultar estado

### Gastos

- `GET /api/expenses` - Listar gastos
- `POST /api/expenses` - Crear gasto
- `GET /api/expenses/:id` - Obtener gasto
- `PUT /api/expenses/:id` - Actualizar gasto
- `DELETE /api/expenses/:id` - Eliminar gasto
- `GET /api/expenses/reports` - Reportes de gastos
- `GET /api/expenses/export` - Exportar gastos (CSV/Excel)

### Recibos (OCR)

- `GET /api/receipts` - Listar recibos
- `POST /api/receipts` - Subir y procesar recibo (OCR)
- `GET /api/receipts/:id` - Obtener recibo
- `PATCH /api/receipts/:id` - Actualizar recibo
- `DELETE /api/receipts/:id` - Eliminar recibo
- `POST /api/receipts/validate-accuracy` - Validar precisión OCR

### Banking

- `GET /api/banking/accounts` - Listar cuentas bancarias
- `GET /api/banking/connect` - Iniciar conexión OAuth
- `GET /api/banking/callback` - Callback OAuth
- `POST /api/banking/sync` - Sincronizar transacciones
- `GET /api/banking/transactions` - Listar transacciones
- `POST /api/banking/reconcile` - Conciliar transacciones
- `GET /api/banking/reconciliation/suggestions` - Sugerencias de conciliación
- `GET /api/banking/reconciliation/export` - Exportar conciliación

### Fiscal

- `GET /api/fiscal/projections` - Proyecciones IVA/IRPF
- `POST /api/fiscal/projections` - Generar proyecciones
- `GET /api/fiscal/trends` - Tendencias fiscales
- `GET /api/fiscal/calendar` - Calendario fiscal
- `POST /api/fiscal/what-if` - Análisis what-if
- `GET /api/fiscal/accuracy` - Precisión de proyecciones
- `GET /api/fiscal/reminders` - Recordatorios fiscales

### Reportes y Analytics

- `GET /api/reports` - Reportes básicos
- `GET /api/analytics` - Analytics avanzados (rentabilidad, cash flow, tendencias)

### Plantillas

- `GET /api/templates` - Listar plantillas
- `POST /api/templates` - Crear plantilla
- `GET /api/templates/:id` - Obtener plantilla
- `PATCH /api/templates/:id` - Actualizar plantilla
- `DELETE /api/templates/:id` - Eliminar plantilla
- `POST /api/templates/:id/apply` - Aplicar plantilla a factura

### Auditoría

- `GET /api/audit-logs` - Listar logs de auditoría
- `GET /api/audit-logs/stats` - Estadísticas de auditoría

## Códigos de Estado HTTP

- `200` - Éxito
- `201` - Creado exitosamente
- `400` - Error de validación
- `401` - No autorizado
- `403` - Prohibido (sin permisos)
- `404` - No encontrado
- `429` - Rate limit excedido
- `500` - Error del servidor

## Paginación

Los endpoints que devuelven listas soportan paginación:

```
GET /api/clients?page=1&limit=20
```

Respuesta:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

## Multi-Empresa

Todas las peticiones requieren un contexto de empresa activa. Cambia la empresa activa con:

```
POST /api/companies/switch
Body: { "companyId": "..." }
```

## Rate Limiting

La API tiene límites de tasa por empresa:
- **Mutations** (POST, PUT, DELETE): 100 requests/10s
- **Queries** (GET): 200 requests/10s

Los headers de respuesta incluyen:
- `X-RateLimit-Limit`: Límite total
- `X-RateLimit-Remaining`: Requests restantes
- `X-RateLimit-Reset`: Timestamp de reset

## SDK

Usa nuestro SDK oficial para facilitar la integración:

```bash
npm install @apptrabajo/sdk
```

Ver [packages/sdk/README.md](../../packages/sdk/README.md) para más detalles.

## Especificación OpenAPI

La especificación completa está disponible en [openapi.yaml](./openapi.yaml).

Puedes importarla en herramientas como:
- Postman
- Insomnia
- Swagger UI
- Redoc

## Soporte

Para soporte técnico:
- Email: support@apptrabajo.com
- Documentación: https://docs.apptrabajo.com

