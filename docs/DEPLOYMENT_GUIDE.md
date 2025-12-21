# 🚀 Guía de Despliegue - FacturaHub

## 📋 Tabla de Contenidos

1. [Despliegue en Vercel (Recomendado)](#vercel)
2. [Variables de Entorno](#variables-de-entorno)
3. [Servicios Externos Requeridos](#servicios-externos)
4. [Despliegue Manual](#despliegue-manual)
5. [Post-Despliegue](#post-despliegue)

---

## 🎯 Vercel (Recomendado)

Vercel es la plataforma recomendada para desplegar FacturaHub ya que está optimizada para Next.js.

### Paso 1: Preparar el Repositorio

1. Asegúrate de que todos los cambios estén en `main`:
   ```bash
   git push origin main
   ```

### Paso 2: Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en **"Add New Project"**
3. Importa tu repositorio de GitHub (`Chris-coder-ux/FactuHub`)
4. Vercel detectará automáticamente que es un proyecto Next.js

### Paso 3: Configurar Variables de Entorno

En la configuración del proyecto en Vercel, agrega todas las variables de entorno necesarias (ver sección [Variables de Entorno](#variables-de-entorno)).

### Paso 4: Configurar Build Settings

Vercel detectará automáticamente:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

No necesitas cambiar nada, pero verifica que estén correctos.

### Paso 5: Desplegar

1. Haz clic en **"Deploy"**
2. Espera a que el build termine (3-5 minutos)
3. Tu app estará disponible en `https://tu-proyecto.vercel.app`

### Paso 6: Configurar Dominio Personalizado (Opcional)

1. Ve a **Settings > Domains**
2. Agrega tu dominio personalizado
3. Configura los registros DNS según las instrucciones de Vercel

---

## 🔐 Variables de Entorno

### Variables Requeridas

```bash
# Base de Datos MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/facturahub?retryWrites=true&w=majority

# Autenticación NextAuth
NEXTAUTH_SECRET=genera-un-secreto-seguro-aqui-minimo-32-caracteres
NEXTAUTH_URL=https://tu-dominio.com

# Stripe (Pagos)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid (Emails)
SENDGRID_API_KEY=SG.xxx...
```

### Variables Opcionales pero Recomendadas

```bash
# Redis (Caching y Real-time)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Sentry (Monitoring)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=tu-org
SENTRY_PROJECT=facturahub
SENTRY_AUTH_TOKEN=xxx

# Cloudinary (Almacenamiento de imágenes)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Google Cloud Vision (OCR avanzado)
GOOGLE_CLOUD_PROJECT=xxx
GOOGLE_APPLICATION_CREDENTIALS=xxx  # Solo para despliegue manual

# VeriFactu (Cumplimiento AEAT España)
VERIFACTU_ENABLED=true
VERIFACTU_ENVIRONMENT=production
VERIFACTU_AUTO_SEND=true
VERIFACTU_AUTO_ENABLE_FOR_SPAIN=true

# Cron Jobs Secret
CRON_SECRET=genera-un-secreto-aleatorio-para-proteger-cron-jobs
```

### Generar NEXTAUTH_SECRET

```bash
# En Linux/Mac
openssl rand -base64 32

# O usar Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Generar CRON_SECRET

```bash
# Mismo método que NEXTAUTH_SECRET
openssl rand -base64 32
```

---

## 🌐 Servicios Externos

### 1. MongoDB Atlas

1. Ve a [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Crea una cuenta gratuita
3. Crea un nuevo cluster (gratis: M0)
4. Crea un usuario de base de datos
5. Configura IP whitelist (0.0.0.0/0 para Vercel)
6. Obtén la connection string: `mongodb+srv://usuario:password@cluster.mongodb.net/facturahub`
7. Agrega `MONGODB_URI` a las variables de entorno

### 2. Upstash Redis (Caching y Real-time)

1. Ve a [upstash.com](https://upstash.com)
2. Crea una cuenta gratuita
3. Crea un nuevo Redis database
4. Copia `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`
5. Agrega a las variables de entorno

### 3. Stripe (Pagos)

1. Ve a [stripe.com](https://stripe.com)
2. Crea una cuenta
3. Obtén las API keys desde **Developers > API keys**
4. Para producción, usa las keys **Live** (no Test)
5. Configura webhook en **Developers > Webhooks**:
   - URL: `https://tu-dominio.com/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `invoice.paid`, `payment_intent.succeeded`
6. Copia el webhook secret y agrega `STRIPE_WEBHOOK_SECRET`

### 4. SendGrid (Emails)

1. Ve a [sendgrid.com](https://sendgrid.com)
2. Crea una cuenta (plan gratuito disponible)
3. Crea un API key desde **Settings > API Keys**
4. Agrega `SENDGRID_API_KEY` a las variables de entorno
5. Verifica tu dominio (opcional pero recomendado)

### 5. Sentry (Monitoring)

1. Ve a [sentry.io](https://sentry.io)
2. Crea una cuenta
3. Crea un nuevo proyecto (Next.js)
4. Copia el DSN
5. Agrega `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

### 6. Cloudinary (Almacenamiento)

1. Ve a [cloudinary.com](https://cloudinary.com)
2. Crea una cuenta gratuita
3. Obtén `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` del dashboard
4. Agrega a las variables de entorno

---

## 🛠️ Despliegue Manual

Si prefieres desplegar en otro servidor (AWS, DigitalOcean, etc.):

### Requisitos del Servidor

- **Node.js**: >= 18.x
- **MongoDB**: Instalado localmente o usar MongoDB Atlas
- **PM2** (recomendado): Para gestión de procesos
- **Nginx** (opcional): Como reverse proxy

### Pasos

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Chris-coder-ux/FactuHub.git
   cd FactuHub
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env.local
   # Editar .env.local con tus credenciales
   ```

4. **Construir la aplicación**:
   ```bash
   npm run build
   ```

5. **Iniciar con PM2**:
   ```bash
   npm install -g pm2
   pm2 start npm --name "facturahub" -- start
   pm2 save
   pm2 startup
   ```

6. **Configurar Nginx** (opcional):
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Configurar SSL con Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d tu-dominio.com
   ```

---

## ✅ Post-Despliegue

### 1. Verificar Funcionalidad

- [ ] Acceder a la URL de producción
- [ ] Crear una cuenta de prueba
- [ ] Verificar que MongoDB esté conectado
- [ ] Probar creación de factura
- [ ] Verificar que los emails se envíen
- [ ] Probar integración de Stripe (modo test primero)

### 2. Configurar Cron Jobs

Los cron jobs están configurados en `vercel.json` y se ejecutan automáticamente en Vercel:

- **Facturas recurrentes**: Diario a las 00:00 UTC
- **Análisis de seguridad**: Diario a las 03:00 UTC (limitado por plan gratuito)
- **Limpieza de almacenamiento**: Diario a las 02:00 UTC

**⚠️ Limitación del Plan Gratuito de Vercel**: El plan Hobby solo permite cron jobs que se ejecuten **una vez al día** como máximo. Si necesitas ejecutar el análisis de seguridad más frecuentemente (cada hora), tienes estas opciones:

1. **Usar un servicio externo** (Recomendado para plan gratuito):
   - [cron-job.org](https://cron-job.org) (gratis)
   - [EasyCron](https://www.easycron.com) (gratis con limitaciones)
   - Configura una llamada HTTP a: `https://tu-dominio.com/api/cron/security-analysis`
   - Headers: `Authorization: Bearer ${CRON_SECRET}`
   - Frecuencia: Cada hora

2. **Actualizar a Vercel Pro** ($20/mes):
   - Permite cron jobs con cualquier frecuencia
   - Cambia el schedule en `vercel.json` a `"0 * * * *"` para ejecutar cada hora

Si despliegas manualmente, configura estos cron jobs en tu servidor o usa un servicio externo.

### 3. Configurar VeriFactu (Opcional)

Si necesitas cumplimiento AEAT:

1. Obtén certificados digitales de [FNMT](https://www.fnmt.es)
2. Sube los certificados a un servicio de almacenamiento seguro (AWS S3, etc.)
3. Configura las variables de entorno de VeriFactu
4. Prueba primero en modo `sandbox`

### 4. Monitoreo

- **Sentry**: Verifica que los errores se capturen correctamente
- **Vercel Analytics**: Habilita en el dashboard de Vercel
- **Logs**: Revisa los logs en Vercel o en tu servidor

### 5. Backup de Base de Datos

Configura backups automáticos en MongoDB Atlas o en tu servidor:

```bash
# Ejemplo con mongodump
mongodump --uri="mongodb+srv://..." --out=/backups/facturahub
```

### 6. Actualizar CHECKLIST

Marca las tareas de despliegue como completadas en `CHECKLIST.md`.

---

## 🔄 Actualizaciones

### Despliegue Automático (Vercel)

Cada push a `main` desplegará automáticamente la nueva versión.

### Despliegue Manual

```bash
# En tu servidor
cd /ruta/a/FactuHub
git pull origin main
npm install
npm run build
pm2 restart facturahub
```

---

## 🐛 Troubleshooting

### Error: "MongoDB connection failed"

- Verifica que `MONGODB_URI` esté correcto
- Verifica que la IP whitelist en MongoDB Atlas incluya 0.0.0.0/0
- Verifica que el usuario de MongoDB tenga permisos

### Error: "NEXTAUTH_SECRET is missing"

- Genera un nuevo secret con `openssl rand -base64 32`
- Agrega a las variables de entorno en Vercel

### Error: "Stripe webhook verification failed"

- Verifica que `STRIPE_WEBHOOK_SECRET` sea correcto
- Verifica que la URL del webhook en Stripe sea correcta
- Verifica que el webhook esté activo en Stripe

### Build falla en Vercel

- Revisa los logs de build en Vercel
- Verifica que todas las dependencias estén en `package.json`
- Verifica que no haya errores de TypeScript (`npm run build` localmente)

### Cron jobs no se ejecutan

- Verifica que `CRON_SECRET` esté configurado
- Verifica que las rutas de cron estén correctas en `vercel.json`
- Revisa los logs de ejecución en Vercel

---

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/getting-started/)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Sentry Next.js Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

## 🎉 ¡Listo!

Tu aplicación FacturaHub debería estar desplegada y funcionando. Si tienes problemas, revisa los logs y la sección de troubleshooting.

