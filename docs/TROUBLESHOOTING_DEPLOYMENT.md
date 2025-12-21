# 🔧 Troubleshooting de Despliegue - FacturaHub

## Errores Comunes y Soluciones

### 1. ❌ Error: "Missing required environment variable"

**Síntomas:**
```
Error: Missing required environment variable: MONGODB_URI
```

**Causa:** Variables de entorno no configuradas en Vercel

**Solución:**
1. Ve a **Settings > Environment Variables** en Vercel
2. Agrega estas variables **REQUERIDAS**:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET` (mínimo 32 caracteres)
   - `NEXTAUTH_URL` (debe ser la URL de producción, ej: `https://tu-proyecto.vercel.app`)
3. Haz clic en **"Redeploy"** después de agregar las variables

### 2. ❌ Error: "NEXTAUTH_SECRET is too weak"

**Síntomas:**
```
Error: NEXTAUTH_SECRET is too weak. It should be at least 32 characters long.
```

**Causa:** El secret es demasiado corto

**Solución:**
```bash
# Genera un secret seguro
openssl rand -base64 32

# Copia el resultado y agrégalo como NEXTAUTH_SECRET en Vercel
```

### 3. ❌ Error de Build: "Module not found" o "Cannot find module"

**Síntomas:**
```
Error: Cannot find module '@sentry/nextjs'
Error: Module not found: Can't resolve '@/lib/...'
```

**Causa:** Dependencias faltantes o problemas de importación

**Solución:**
1. Verifica que `package.json` tenga todas las dependencias
2. Asegúrate de que los imports usen rutas absolutas (`@/lib/...`)
3. Si el error es de Sentry y no lo usas, deshabilítalo temporalmente:
   ```javascript
   // En next.config.cjs, comenta la línea de Sentry:
   // const { withSentryConfig } = require('@sentry/nextjs');
   // module.exports = withSentryConfig(...)
   module.exports = withBundleAnalyzer(nextConfig);
   ```

### 4. ❌ Error: "Sentry configuration failed"

**Síntomas:**
```
Error: Sentry configuration failed: Missing SENTRY_DSN
```

**Causa:** Sentry está configurado pero faltan variables de entorno

**Solución:**
1. **Opción A - Deshabilitar Sentry temporalmente:**
   - En `next.config.cjs`, Sentry se deshabilita automáticamente si no hay `SENTRY_DSN`
   - Verifica que no esté configurado en las variables de entorno

2. **Opción B - Configurar Sentry completamente:**
   - Agrega todas las variables de Sentry en Vercel:
     - `SENTRY_DSN`
     - `NEXT_PUBLIC_SENTRY_DSN`
     - `SENTRY_ORG`
     - `SENTRY_PROJECT`
     - `SENTRY_AUTH_TOKEN`

### 5. ❌ Error: "Build failed" sin detalles claros

**Síntomas:**
- Build falla pero no hay mensaje de error claro
- Logs muestran "Build failed" sin más información

**Solución:**
1. **Revisa los logs completos en Vercel:**
   - Haz clic en el despliegue fallido
   - Expande todos los logs
   - Busca errores de TypeScript, ESLint, o dependencias

2. **Prueba el build localmente:**
   ```bash
   npm run build
   ```
   - Si falla localmente, verás el error exacto
   - Corrige el error y haz push

3. **Verifica que no haya errores de sintaxis:**
   ```bash
   npm run lint
   ```

### 6. ❌ Error: "TypeScript compilation failed"

**Síntomas:**
```
Error: Type error: Property 'X' does not exist on type 'Y'
```

**Causa:** Errores de TypeScript en el código

**Solución:**
1. Ejecuta TypeScript localmente:
   ```bash
   npx tsc --noEmit
   ```
2. Corrige todos los errores de tipos
3. Haz commit y push

### 7. ❌ Error: "Out of memory" o "Build timeout"

**Síntomas:**
- Build se detiene sin completar
- Mensaje de timeout o memoria agotada

**Solución:**
1. **Optimiza el build:**
   - Verifica que `next.config.cjs` tenga las optimizaciones correctas
   - Considera usar dynamic imports para componentes pesados

2. **Aumenta el timeout en Vercel:**
   - Ve a **Settings > General**
   - Aumenta "Build Command Timeout" si es necesario

### 8. ❌ Error: "Cron job validation failed"

**Síntomas:**
```
Error: Invalid cron schedule: "0 * * * *"
```

**Causa:** Schedule de cron no válido para plan gratuito

**Solución:**
- Ya está corregido en `vercel.json`
- Todos los cron jobs están configurados para ejecutarse una vez al día
- Si ves este error, verifica que `vercel.json` tenga los schedules correctos

### 9. ❌ Error: "MongoDB connection failed" en producción

**Síntomas:**
- La app se despliega pero no puede conectar a MongoDB
- Errores 500 en las rutas de API

**Solución:**
1. Verifica que `MONGODB_URI` esté correcto en Vercel
2. Verifica que la IP whitelist en MongoDB Atlas incluya `0.0.0.0/0`
3. Verifica que el usuario de MongoDB tenga permisos correctos

### 10. ❌ Error: Variables de entorno no se aplican

**Síntomas:**
- Variables configuradas pero la app no las lee
- Valores por defecto o undefined

**Solución:**
1. **Después de agregar variables, haz "Redeploy":**
   - Ve al proyecto en Vercel
   - Haz clic en **"Deployments"**
   - Haz clic en los tres puntos del último despliegue
   - Selecciona **"Redeploy"**

2. **Verifica el scope de las variables:**
   - Las variables deben estar en "Production", "Preview", o "Development"
   - Si solo están en "Development", no funcionarán en producción

## 🔍 Cómo Diagnosticar Errores

### Paso 1: Revisar Logs en Vercel

1. Ve a tu proyecto en [vercel.com/dashboard](https://vercel.com/dashboard)
2. Haz clic en el despliegue fallido
3. Revisa los logs completos:
   - **Build Logs**: Errores de compilación
   - **Function Logs**: Errores en runtime
   - **Deployment Logs**: Errores de despliegue

### Paso 2: Probar Build Localmente

```bash
# Clonar el repositorio
git clone https://github.com/Chris-coder-ux/FactuHub.git
cd FactuHub

# Instalar dependencias
npm install

# Probar build
npm run build

# Si hay errores, los verás aquí
```

### Paso 3: Verificar Variables de Entorno

```bash
# Crear .env.local con las mismas variables que en Vercel
# Probar que la app inicia correctamente
npm run dev
```

### Paso 4: Verificar Sintaxis y Linting

```bash
# Verificar TypeScript
npx tsc --noEmit

# Verificar ESLint
npm run lint

# Verificar que no haya errores de sintaxis
node -c next.config.cjs
```

## 📋 Checklist Pre-Despliegue

Antes de desplegar, verifica:

- [ ] `npm run build` funciona localmente sin errores
- [ ] `npm run lint` no muestra errores críticos
- [ ] Todas las variables de entorno requeridas están en Vercel
- [ ] `NEXTAUTH_URL` apunta a la URL de producción correcta
- [ ] `NEXTAUTH_SECRET` tiene al menos 32 caracteres
- [ ] MongoDB Atlas tiene IP whitelist configurada (0.0.0.0/0)
- [ ] No hay imports de archivos que no existen
- [ ] `vercel.json` tiene la configuración correcta

## 🆘 Obtener Ayuda

Si los errores persisten:

1. **Revisa los logs completos en Vercel** (más importante)
2. **Copia el mensaje de error exacto** y búscalo en Google
3. **Verifica la documentación de Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
4. **Verifica la documentación de Vercel**: [vercel.com/docs](https://vercel.com/docs)

## 🔄 Re-desplegar Después de Corregir Errores

1. Corrige el error en tu código local
2. Haz commit y push:
   ```bash
   git add .
   git commit -m "fix: corregir error de despliegue"
   git push origin main
   ```
3. Vercel desplegará automáticamente
4. Monitorea el nuevo despliegue en el dashboard

