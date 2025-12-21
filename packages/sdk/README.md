# AppTrabajo SDK

SDK oficial de TypeScript/JavaScript para la API de AppTrabajo.

## Instalación

```bash
npm install @apptrabajo/sdk
# o
yarn add @apptrabajo/sdk
```

## Uso Básico

```typescript
import AppTrabajoSDK from '@apptrabajo/sdk';

// Inicializar SDK
const sdk = new AppTrabajoSDK({
  baseUrl: 'https://api.apptrabajo.com',
  accessToken: 'tu-token-de-acceso',
});

// O con API Key
const sdk = new AppTrabajoSDK({
  baseUrl: 'https://api.apptrabajo.com',
  apiKey: 'tu-api-key',
});
```

## Ejemplos

### Gestión de Clientes

```typescript
// Listar clientes
const clients = await sdk.getClients({ page: 1, limit: 20 });

// Crear cliente
const newClient = await sdk.createClient({
  name: 'Cliente Ejemplo',
  email: 'cliente@example.com',
  phone: '+123456789',
  address: {
    street: 'Calle 123',
    city: 'Madrid',
    zipCode: '28001',
    country: 'España',
  },
});

// Actualizar cliente
await sdk.updateClient(newClient._id, {
  phone: '+987654321',
});
```

### Gestión de Facturas

```typescript
// Crear factura
const invoice = await sdk.createInvoice({
  client: clientId,
  items: [
    {
      product: productId,
      quantity: 2,
      price: 50,
      tax: 21,
      total: 121,
    },
  ],
  dueDate: '2025-12-31',
  invoiceType: 'invoice',
});

// Enviar factura por email
await sdk.sendInvoice(invoice._id);

// Generar PDF
const pdfBlob = await sdk.getInvoicePDF(invoice._id);
```

### VeriFactu (Cumplimiento Fiscal)

```typescript
// Generar XML VeriFactu
const { xml, hash } = await sdk.generateVeriFactuXML(invoiceId);

// Firmar XML
await sdk.signVeriFactuXML(invoiceId);

// Enviar a AEAT
const result = await sdk.sendVeriFactuToAEAT(invoiceId);

// Consultar estado
const status = await sdk.getVeriFactuStatus(invoiceId);
```

### Analytics

```typescript
// Obtener analytics con filtros de fecha
const analytics = await sdk.getAnalytics({
  startDate: '2025-01-01',
  endDate: '2025-12-31',
});

console.log('Rentabilidad por cliente:', analytics.clientProfitability);
console.log('Cash flow:', analytics.cashFlow);
console.log('Tendencias:', analytics.trends);
```

## API Completa

Ver [documentación completa de la API](https://docs.apptrabajo.com) para más detalles.

## Soporte

Para soporte, contacta a support@apptrabajo.com

