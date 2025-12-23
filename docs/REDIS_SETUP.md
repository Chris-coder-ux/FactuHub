# 🔴 Configuración de Redis para Bull Queue

Esta guía explica cómo configurar Redis para la cola VeriFactu usando Bull.

## 📋 Requisitos

Bull requiere una **conexión Redis tradicional** (no REST API). Si usas Upstash, necesitas la conexión tradicional además de la REST API.

## 🔧 Opciones de Configuración

### Opción 1: URL Completa (Recomendado)

```bash
# Formato: redis://[:password@]host:port[/db]
# Para conexiones seguras (TLS): rediss://

# Ejemplo Upstash
REDIS_URL=rediss://default:tu-password@xxx.upstash.io:6379

# Ejemplo Redis local
REDIS_URL=redis://localhost:6379

# Ejemplo Redis Cloud
REDIS_URL=rediss://default:password@xxx.redis.cloud:12345
```

### Opción 2: Variables Individuales

```bash
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=tu-password
REDIS_TLS=true  # Requerido para Upstash y Redis Cloud
```

### Opción 3: Upstash Específico

```bash
# Upstash también permite usar UPSTASH_REDIS_URL
UPSTASH_REDIS_URL=rediss://default:password@xxx.upstash.io:6379
```

## 💻 Configuración para Desarrollo Local (localhost)

### Opción 1: Instalar Redis Localmente

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server

# Iniciar Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar que funciona
redis-cli ping
# Debería responder: PONG
```

#### Linux (Fedora)
```bash
# Instalar Redis
sudo dnf install redis

# Iniciar Redis
sudo systemctl start redis
sudo systemctl enable redis

# Verificar que funciona
redis-cli ping
# Debería responder: PONG

# Verificar estado
sudo systemctl status redis
```

**Nota para Fedora**: El servicio se llama `redis` (no `redis-server` como en Ubuntu/Debian).

#### macOS (con Homebrew)
```bash
brew install redis

# Iniciar Redis
brew services start redis

# O iniciar manualmente
redis-server

# Verificar que funciona
redis-cli ping
# Debería responder: PONG
```

#### Windows
1. Descarga Redis desde: https://github.com/microsoftarchive/redis/releases
2. O usa WSL2 (Windows Subsystem for Linux) y sigue las instrucciones de Linux
3. O usa Docker Desktop y sigue la opción de Docker

### Opción 2: Usar Docker (Recomendado - Más Fácil)

```bash
# Ejecutar Redis en Docker
docker run -d \
  --name redis-local \
  -p 6379:6379 \
  redis:7-alpine

# Verificar que funciona
docker ps
# Deberías ver el contenedor redis-local corriendo

# Probar conexión
docker exec -it redis-local redis-cli ping
# Debería responder: PONG
```

**Ventajas de Docker:**
- ✅ Fácil de instalar y limpiar
- ✅ No contamina tu sistema
- ✅ Misma configuración en todos los equipos
- ✅ Fácil de detener: `docker stop redis-local`

### Configurar en .env.local

Una vez que Redis esté corriendo, agrega a tu archivo `.env.local` en la raíz del proyecto:

```bash
# Redis para desarrollo local (sin contraseña por defecto)
REDIS_URL=redis://localhost:6379

# O usando variables individuales
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=  # No necesario para Redis local sin autenticación
# REDIS_TLS=false  # No necesario para Redis local
```

### Verificar Configuración

1. **Verifica que Redis está corriendo:**
   ```bash
   # Probar conexión
   redis-cli ping
   # Debería responder: PONG
   
   # Verificar estado del servicio (Linux)
   sudo systemctl status redis-server  # Ubuntu/Debian
   sudo systemctl status redis  # Fedora
   ```

2. **Inicia la aplicación:**
   ```bash
   npm run dev
   ```

3. **Revisa los logs al iniciar:**
   - ✅ Deberías ver: `VeriFactu queue initialized with Bull (Redis-based)`
   - ❌ Si ves: `Redis not configured, using in-memory queue` → Redis no está configurado o no está corriendo

4. **Usa el frontend de configuración:**
   - Ve a `/settings` en tu aplicación
   - Busca la sección "Configuración de Redis"
   - Deberías ver estado: "Conectado" en verde

5. **Probar manualmente desde la aplicación:**
   - En `/settings`, usa el botón "Probar Conexión" en la sección de Redis

### Troubleshooting Local

#### Error: "Connection refused"
**Causa**: Redis no está corriendo.

**Solución**:
```bash
# Verificar si Redis está corriendo
redis-cli ping
# O
docker ps | grep redis

# Si no está corriendo, inícialo:
# Linux (Ubuntu/Debian):
sudo systemctl start redis-server

# Linux (Fedora):
sudo systemctl start redis

# macOS:
brew services start redis

# O con Docker:
docker start redis-local
```

#### Error: "ECONNREFUSED 127.0.0.1:6379"
**Causa**: Redis no está escuchando en el puerto 6379.

**Solución**:
```bash
# Verificar qué está usando el puerto 6379
# Linux/macOS:
lsof -i :6379
# O
netstat -an | grep 6379

# Si Redis no está corriendo, inícialo
```

#### La cola sigue usando in-memory
**Causa**: Variables de entorno no están cargadas o formato incorrecto.

**Solución**:
1. Verifica que `.env.local` existe en la raíz del proyecto
2. Verifica el formato de `REDIS_URL`:
   ```bash
   # ✅ CORRECTO
   REDIS_URL=redis://localhost:6379
   
   # ❌ INCORRECTO
   REDIS_URL="redis://localhost:6379"  # Sin comillas
   REDIS_URL=redis://localhost:6379/  # Sin barra final
   ```
3. Reinicia el servidor de desarrollo: `npm run dev`

### Detener Redis (Docker)

```bash
# Detener Redis
docker stop redis-local

# Eliminar contenedor (opcional)
docker rm redis-local
```

## 🚀 Configuración para Upstash (Producción/Cloud)

### Paso 1: Crear Redis Database en Upstash

1. Ve a [upstash.com](https://upstash.com)
2. Crea una cuenta gratuita
3. Crea un nuevo Redis database
4. Selecciona la región más cercana a tu aplicación

### Paso 2: Obtener Credenciales

En el dashboard de Upstash, encontrarás dos tipos de conexiones:

#### Para Cache (REST API - ya configurado)
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

#### Para Bull Queue (Conexión Tradicional - NUEVO)
1. En el dashboard, ve a tu Redis database
2. Busca la sección **"Connect using Redis CLI"** o **"Redis URL"**
3. Copia la URL que tiene formato: `rediss://default:password@host:port`
4. Esta es la conexión tradicional que necesita Bull

### Paso 3: Configurar Variables de Entorno

Agrega a tu `.env.local` o variables de entorno en Vercel:

```bash
# Para Bull Queue (VeriFactu)
REDIS_URL=rediss://default:tu-password@xxx.upstash.io:6379

# O usando la variable específica de Upstash
UPSTASH_REDIS_URL=rediss://default:tu-password@xxx.upstash.io:6379
```

## 🧪 Verificar Configuración

### Verificar en Desarrollo

1. Inicia la aplicación: `npm run dev`
2. Revisa los logs al iniciar:
   - ✅ `VeriFactu queue initialized with Bull (Redis-based)` = Redis configurado correctamente
   - ⚠️ `Redis not configured, using in-memory queue` = Redis no configurado (fallback activo)

### Verificar Conexión Redis

Puedes crear un script de prueba:

```typescript
// scripts/test-redis-connection.ts
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

if (!redisUrl) {
  console.error('❌ REDIS_URL no configurada');
  process.exit(1);
}

const url = new URL(redisUrl);
const client = new IORedis({
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
  password: url.password || undefined,
  tls: url.protocol === 'rediss:' ? {} : undefined,
});

client.ping()
  .then(() => {
    console.log('✅ Conexión Redis exitosa');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error conectando a Redis:', error.message);
    process.exit(1);
  });
```

Ejecutar: `tsx scripts/test-redis-connection.ts`

## 🔍 Troubleshooting

### Error: "ECONNREFUSED" o "Connection refused"

**Causa**: Redis no está disponible o credenciales incorrectas.

**Solución**:
1. Verifica que `REDIS_URL` esté configurada correctamente
2. Verifica que el host y puerto sean correctos
3. Para Upstash, asegúrate de usar la conexión tradicional (no REST)

### Error: "TLS required" o "SSL required"

**Causa**: Upstash requiere TLS pero no está configurado.

**Solución**:
- Usa `rediss://` (con doble 's') en lugar de `redis://`
- O configura `REDIS_TLS=true` si usas variables individuales

### La cola usa in-memory en lugar de Bull

**Causa**: Redis no está configurado o la conexión falla.

**Solución**:
1. Verifica que las variables de entorno estén configuradas
2. Revisa los logs al iniciar la aplicación
3. Verifica que Redis esté accesible desde tu entorno

### Jobs no se procesan

**Causa**: Worker no está configurado o Redis no está disponible.

**Solución**:
1. Verifica que Bull se inicializó correctamente (revisa logs)
2. Verifica que `VeriFactuService.processInvoiceAsync` funcione correctamente
3. Revisa los logs de Bull para ver errores de procesamiento

## 📊 Monitoreo

### Ver Estado de la Cola

La cola expone métodos para monitoreo:

```typescript
import { veriFactuQueue } from '@/lib/queues/verifactu-queue';

// Obtener tamaño de la cola
const size = await veriFactuQueue.getSize();
console.log(`Jobs en cola: ${size}`);
```

### Logs de Bull

Bull emite eventos que se registran automáticamente:
- `completed`: Job completado exitosamente
- `failed`: Job falló después de todos los reintentos
- `active`: Job siendo procesado

## 🔐 Seguridad

### Variables de Entorno en Producción

**Nunca** commitees archivos `.env` o `.env.local` al repositorio.

Para Vercel:
1. Ve a **Settings > Environment Variables**
2. Agrega `REDIS_URL` o las variables individuales
3. Configura para todos los ambientes (Production, Preview, Development)

### Rotación de Credenciales

Si necesitas rotar las credenciales de Redis:
1. Actualiza las variables de entorno
2. Reinicia la aplicación
3. Los jobs en cola se procesarán con la nueva conexión

## 📚 Recursos Adicionales

- [Documentación Bull](https://github.com/OptimalBits/bull)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [IORedis Documentation](https://github.com/redis/ioredis)

