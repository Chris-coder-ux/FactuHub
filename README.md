# FacturaHub - Plataforma Avanzada de Facturación

Una plataforma completa de facturación web construida con Next.js, TypeScript, MongoDB, NextAuth y Stripe. Incluye cumplimiento VeriFactu para normativas AEAT (España) y está diseñada para escalar a features avanzadas como OCR IA, conciliación bancaria y forecasting fiscal.

## Características

### Core Features
- **Autenticación**: Registro y login seguro con NextAuth.
- **Gestión de Clientes**: CRUD completo de clientes con validaciones avanzadas.
- **Facturación**: Creación de facturas personalizables con cálculos automáticos de totales e impuestos.
- **Productos**: Gestión de productos con precios, impuestos y categorías.
- **Pagos**: Integración con Stripe para procesar pagos online.
- **PDF**: Generación de PDFs de facturas con branding personalizado.
- **Reportes**: Dashboards con gráficos de ingresos, análisis y métricas de negocio.
- **Emails**: Envío de facturas por email con SendGrid y templates HTML.
- **Recurrentes**: Facturas automáticas recurrentes (diarias, semanales, mensuales).
- **UI Moderna**: Interfaz responsiva con TailwindCSS, shadcn/ui y modo oscuro.
- **Seguridad**: Validación de entrada, encriptación, rate limiting y cumplimiento GDPR.

### Cumplimiento VeriFactu (AEAT España) ✅
- **Generación XML VeriFactu**: Con hashing chain y validación contra esquemas XSD.
- **Firmas Digitales XAdES-BES**: Usando certificados FNMT con node-forge.
- **Cliente AEAT SOAP**: Envío automático a AEAT con autenticación por certificados.
- **Indicadores de Compliance**: Estados VeriFactu en UI con badges visuales.
- **QR Codes**: Códigos QR VeriFactu para verificación rápida.
- **Testing Completo**: 42 tests unitarios pasando con cobertura ~80%.

### OCR de Recibos con IA (En Desarrollo) 🟡
- **Procesamiento OCR**: Extracción automática de datos de recibos españoles.
- **Google Cloud Vision API**: Motor OCR avanzado con precisión >90%.
- **Fallback Tesseract.js**: Motor OCR local como respaldo.
- **Parsing Inteligente**: Detección de comerciante, fecha, total, IVA e items.
- **UI de Galería**: Visualización de recibos con indicadores de confianza.

### Arquitectura y Calidad
- **Estándares Avanzados**: Principios SOLID, Clean Architecture, manejo robusto de errores.
- **Performance**: Memoización, paginación, lazy loading y optimizaciones Next.js.
- **Testing**: Jest para unitarios, Cypress para E2E, cobertura completa.
- **Escalabilidad**: Arquitectura modular preparada para microservicios.
- **Seguridad**: Headers de seguridad, encriptación de datos sensibles, auditorías regulares.

## Tecnologías

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, Recharts
- **Backend**: Next.js API Routes, MongoDB con Mongoose, Redis (planeado)
- **Autenticación**: NextAuth.js con JWT y sesiones
- **Pagos**: Stripe con webhooks y intents
- **Emails**: SendGrid con templates dinámicos
- **PDF**: jsPDF con branding personalizado
- **VeriFactu Compliance**: xmlbuilder2, node-forge, certificados XAdES-BES, cliente SOAP AEAT
- **Testing**: Jest (42 tests), Cypress (E2E), Testing Library
- **Linter/Formatter**: ESLint, Prettier
- **CI/CD**: GitHub Actions (planeado), Vercel para deployment

## Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Chris-coder-ux/FactuHub.git
   cd FactuHub
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Configura variables de entorno en `.env.local`:
   ```
   # Base de datos y auth
   MONGODB_URI=mongodb://localhost:27017/invoicing-app
   NEXTAUTH_SECRET=tu-secreto-aqui
   NEXTAUTH_URL=http://localhost:3000

   # Redis (para cola VeriFactu - opcional en desarrollo)
   # Opción 1: Instalar Redis localmente o usar Docker
   REDIS_URL=redis://localhost:6379
   # Opción 2: Usar Upstash (cloud) incluso en desarrollo
   # REDIS_URL=rediss://default:password@xxx.upstash.io:6379
   # Si no configuras Redis, la cola usará modo in-memory (fallback)

   # Pagos
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # Emails
   SENDGRID_API_KEY=tu-api-key

     # VeriFactu (opcional - para cumplimiento AEAT España)
     VERIFACTU_ENABLED=true  # Habilitar VeriFactu
     VERIFACTU_CERTIFICATE_PATH=/path/to/certificate.p12  # Ruta al certificado FNMT
     VERIFACTU_CERTIFICATE_PASSWORD=tu-password-certificado
     VERIFACTU_ENVIRONMENT=sandbox  # 'sandbox' para pruebas, 'production' para real
     VERIFACTU_AUTO_SEND=true  # Enviar automáticamente al crear facturas españolas
     VERIFACTU_AUTO_ENABLE_FOR_SPAIN=true  # Habilitar automáticamente para clientes ES
     VERIFACTU_CHAIN_HASH=hash-inicial-para-chain  # Hash inicial para encadenamiento

     # OCR con Google Cloud Vision (opcional - para procesamiento avanzado de recibos)
     GOOGLE_CLOUD_PROJECT=tu-project-id-gcp  # ID del proyecto Google Cloud
     GOOGLE_APPLICATION_CREDENTIALS=./ruta/a/service-account-key.json  # Ruta a credenciales GCP
     USE_VISION_OCR=false  # true para usar Vision API por defecto, false para Tesseract
   ```

   **Nota VeriFactu**: Para usar cumplimiento AEAT, obtén certificados digitales de FNMT (https://www.fnmt.es) y configúralos en la interfaz de settings de la app.

4. Ejecuta la aplicación:
   ```bash
   npm run dev
   ```

5. Abre [http://localhost:3000](http://localhost:3000).

## Despliegue

### Vercel
1. Conecta tu repositorio a Vercel.
2. Configura variables de entorno.
3. Despliega.

### AWS
1. Configura una instancia EC2.
2. Instala Node.js y MongoDB.
3. Construye y ejecuta con PM2.

## Uso

1. Regístrate o inicia sesión.
2. Agrega clientes y productos.
3. Crea facturas con cálculos automáticos.
4. Envía por email o genera PDF con branding.
5. Procesa pagos con Stripe.
6. **Para cumplimiento AEAT**: Configura certificados VeriFactu en settings, genera XML y envía automáticamente a AEAT.
7. **Para OCR de recibos**: Sube imágenes de recibos en la sección "Recibos" para extracción automática de datos.

### Configuración de VeriFactu

#### Obtención de Certificados
1. Solicita certificado digital en [FNMT](https://www.fnmt.es) (gratuito para particulares, ~20€ empresas)
2. Descarga el certificado en formato `.p12`
3. Configura la ruta y contraseña en variables de entorno o interfaz de settings

#### Configuración en la App
1. Ve a **Settings > VeriFactu**
2. Habilita "Cumplimiento VeriFactu"
3. Sube el certificado `.p12` y configura contraseña
4. Selecciona entorno: `sandbox` (pruebas) o `production`
5. Configura opciones de auto-envío

#### Requisitos Técnicos
- Certificado digital válido FNMT
- Conexión a internet para envío a AEAT
- Base de datos MongoDB para almacenar estados

### Uso de VeriFactu

#### Flujo Manual
1. Crea una factura para cliente español (taxId con formato ES)
2. Ve al detalle de la factura
3. En sección "Cumplimiento VeriFactu":
   - **Generar XML**: Crea XML con datos de factura
   - **Enviar a AEAT**: Firma y envía automáticamente
   - **Consultar Estado**: Verifica estado con AEAT

#### Flujo Automático
- Configura `VERIFACTU_AUTO_SEND=true`
- Las facturas españolas se procesan automáticamente al crear
- Estados se actualizan en background

#### Estados VeriFactu
- **pending**: XML generado, esperando envío
- **sent**: Enviado a AEAT, esperando respuesta
- **verified**: Aceptado por AEAT
- **error/rejected**: Problemas en envío o validación

#### Códigos QR
- Incluidos automáticamente en PDFs
- Escaneables para verificación de compliance
- Contienen datos cifrados de la factura

### Troubleshooting VeriFactu

#### Error: "XML not generated yet"
- **Causa**: Intento de envío sin generar XML primero
- **Solución**: Genera XML VeriFactu antes de enviar

#### Error: "Certificate not configured"
- **Causa**: Certificado no subido o contraseña incorrecta
- **Solución**: Ve a Settings > VeriFactu y configura certificado FNMT válido

#### Error: "Connection to AEAT failed"
- **Causa**: Problemas de red o AEAT caído
- **Solución**: Verifica conexión internet, reintenta más tarde

#### Estado "error" persistente
- **Causa**: Datos de factura inválidos o certificado expirado
- **Solución**: Revisa logs en consola, valida datos de factura, renueva certificado

#### Auto-envío no funciona
- **Causa**: Configuración `VERIFACTU_AUTO_SEND=false` o cliente no español
- **Solución**: Habilita auto-envío en settings o procesa manualmente

#### Problemas de memoria en testing
- **Solución**: Usa Artillery con `arrivalRate: 1`, ejecuta tests E2E con mocks

Ver [docs/verifactu-troubleshooting.md](docs/verifactu-troubleshooting.md) para guía completa.

### Configuración de OCR para Recibos

#### Configuración de Google Cloud Vision API
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita la API de Cloud Vision: APIs & Services > Library > Cloud Vision API
4. Crea una cuenta de servicio: IAM & Admin > Service Accounts
5. Genera una clave JSON para la cuenta de servicio
6. Configura variables de entorno:
   ```
   GOOGLE_CLOUD_PROJECT=tu-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
   USE_VISION_OCR=true
   ```

#### Motores OCR Disponibles
- **Google Cloud Vision API**: Precisión alta (~95%), requiere configuración GCP, costo por uso
- **Tesseract.js**: Gratuito, funciona localmente, precisión ~80%, más lento

#### Uso del OCR
1. Ve a la sección **Recibos** en el dashboard
2. Sube imágenes de recibos (JPG, PNG, máximo 10MB)
3. El sistema extrae automáticamente:
   - Nombre del comerciante
   - Fecha de emisión
   - Importe total
   - IVA (si aplica)
   - Items individuales
4. Revisa y corrige datos extraídos si es necesario
5. Integra con formularios de gastos

#### Troubleshooting OCR
- **Error "Vision API not configured"**: Configura credenciales GCP correctamente
- **Baja precisión**: Usa imágenes de mejor calidad, iluminación adecuada
- **Timeout**: Imágenes muy grandes, reduce resolución antes de subir
- **Fallback automático**: Si Vision falla, usa Tesseract.js automáticamente

## Roadmap

### ✅ Fase Actual: Cumplimiento VeriFactu (Completado)
- Generación XML VeriFactu con hashing chain
- Firmas digitales XAdES-BES
- Cliente SOAP AEAT con autenticación
- UI con indicadores de compliance

### 🚧 Próximas Fases
- **Fase 1**: IA OCR para gestión automática de recibos
- **Fase 2**: Conciliación bancaria automática
- **Fase 3**: Forecasting fiscal IVA/IRPF
- **Fase 4**: Features empresariales (multi-empresa, RBAC)
- **Fase 5**: Mejoras técnicas y escalabilidad

Ver [CHECKLIST.md](CHECKLIST.md) para detalles completos.

## API

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Clientes
- `GET /api/clients` - Lista clientes con paginación
- `POST /api/clients` - Crear cliente con validaciones
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente

### Facturas
- `GET /api/invoices` - Lista facturas con filtros y paginación
- `POST /api/invoices` - Crear factura con cálculos automáticos y auto-VeriFactu
- `GET /api/invoices/:id/pdf` - Generar PDF con branding y QR VeriFactu
- `POST /api/invoices/:id/send` - Enviar factura por email con estado VeriFactu

### VeriFactu APIs
- `POST /api/invoices/:id/verifactu/generate` - Genera XML VeriFactu
  - **Auth**: Requerida
  - **Body**: Ninguno
  - **Response**: `{ success: true, xml: string, invoiceId: string }`
- `POST /api/invoices/:id/verifactu/sign` - Firma XML con certificado
  - **Auth**: Requerida
  - **Body**: Ninguno
  - **Response**: `{ success: true, signedXml: string, invoiceId: string }`
- `POST /api/invoices/:id/verifactu/send` - Envía a AEAT
  - **Auth**: Requerida
  - **Body**: Ninguno
  - **Response**: `{ success: boolean, response: object, invoiceId: string }`
- `GET /api/invoices/:id/verifactu/status` - Consulta estado AEAT
  - **Auth**: Requerida
  - **Response**: `{ status: string, response: object, invoiceId: string }`

### Productos
- `GET /api/products` - Lista productos con filtros
- `POST /api/products` - Crear producto con validaciones

### Pagos
- `POST /api/payments/create-intent` - Crear intent de pago Stripe
- `POST /api/webhooks/stripe` - Webhook de confirmación de pago

### Reportes
- `GET /api/reports` - Datos para dashboards y gráficos

## Contribución

1. Fork el proyecto.
2. Crea una rama (`git checkout -b feature/nueva-funcion`).
3. Commit cambios (`git commit -am 'Agrega nueva funcion'`).
4. Push (`git push origin feature/nueva-funcion`).
5. Abre un Pull Request.

## Licencia

MIT
