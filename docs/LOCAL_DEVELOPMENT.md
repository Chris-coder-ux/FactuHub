# 💻 Guía de Desarrollo Local

Esta guía te ayuda a configurar el entorno de desarrollo local, incluyendo Redis para la cola VeriFactu.

## 📋 Requisitos Previos

- **Node.js**: >= 18.x
- **MongoDB**: Instalado localmente o MongoDB Atlas
- **Redis**: Para la cola VeriFactu (opcional, tiene fallback in-memory)
- **npm** o **yarn**

## 🚀 Configuración Rápida

### 1. Clonar e Instalar

```bash
git clone <tu-repositorio>
cd AppTrabajo
npm install
```

### 2. Configurar MongoDB

#### Opción A: MongoDB Local
```bash
# Instalar MongoDB (según tu OS)
# Ubuntu/Debian:
sudo apt install mongodb

# macOS:
brew install mongodb-community

# Iniciar MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

#### Opción B: MongoDB Atlas (Cloud - Recomendado)
1. Crea cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un cluster gratuito
3. Obtén la connection string

### 3. Configurar Redis (Opcional pero Recomendado)

#### Opción A: Redis Local con Docker (Más Fácil) ⭐

```bash
# Ejecutar Redis en Docker
docker run -d \
  --name redis-local \
  -p 6379:6379 \
  redis:7-alpine

# Verificar que funciona
docker exec -it redis-local redis-cli ping
# Debería responder: PONG
```

#### Opción B: Instalar Redis Localmente

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar
redis-cli ping
```

**Linux (Fedora):**
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

**Nota para Fedora**: El servicio se llama `redis` (no `redis-server`).

**macOS:**
```bash
brew install redis
brew services start redis

# Verificar
redis-cli ping
```

**Windows:**
- Usa WSL2 o descarga desde: https://github.com/microsoftarchive/redis/releases
- O usa Docker Desktop y sigue la opción de Docker

#### Opción C: Usar Upstash (Cloud)
1. Crea cuenta en [Upstash](https://upstash.com)
2. Crea un Redis database
3. Obtén la conexión tradicional (no REST API)

### 4. Crear Archivo .env.local

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Base de Datos
MONGODB_URI=mongodb://localhost:27017/facturahub
# O MongoDB Atlas:
# MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/facturahub

# Autenticación
NEXTAUTH_SECRET=genera-un-secreto-aleatorio-minimo-32-caracteres
NEXTAUTH_URL=http://localhost:3000

# Redis (Opcional - para cola VeriFactu)
# Si Redis está corriendo localmente:
REDIS_URL=redis://localhost:6379

# O si usas Upstash:
# REDIS_URL=rediss://default:password@xxx.upstash.io:6379

# O usando variables individuales:
# REDIS_HOST=localhost
# REDIS_PORT=6379

# Pagos (Opcional - para desarrollo)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Emails (Opcional - para desarrollo)
SENDGRID_API_KEY=SG.xxx...

# VeriFactu (Opcional - para cumplimiento AEAT)
VERIFACTU_ENABLED=true
VERIFACTU_ENVIRONMENT=sandbox
VERIFACTU_AUTO_SEND=false
VERIFACTU_AUTO_ENABLE_FOR_SPAIN=true
```

### 5. Generar NEXTAUTH_SECRET

```bash
# Linux/macOS
openssl rand -base64 32

# O con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copia el resultado y pégalo en `NEXTAUTH_SECRET` en `.env.local`.

### 6. Iniciar la Aplicación

```bash
# Asegúrate de que MongoDB y Redis estén corriendo
# MongoDB:
sudo systemctl status mongod  # Linux
# O verifica en MongoDB Atlas

# Redis:
docker ps | grep redis  # Si usas Docker
# O
redis-cli ping  # Si está instalado localmente

# Iniciar la aplicación
npm run dev
```

### 7. Verificar que Todo Funciona

1. **Abre** [http://localhost:3000](http://localhost:3000)
2. **Revisa los logs** al iniciar:
   - ✅ `MongoDB connected`
   - ✅ `VeriFactu queue initialized with Bull (Redis-based)` (si Redis está configurado)
   - ⚠️ `Redis not configured, using in-memory queue` (si Redis no está configurado - OK para desarrollo)

3. **Verifica Redis en la UI:**
   - Ve a `/settings`
   - Busca "Configuración de Redis"
   - Deberías ver el estado de conexión

## 🔧 Comandos Útiles

### MongoDB

```bash
# Verificar que MongoDB está corriendo
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# Conectar a MongoDB
mongosh  # O mongo en versiones antiguas

# Ver bases de datos
show dbs

# Usar la base de datos
use facturahub

# Ver colecciones
show collections
```

### Redis

```bash
# Verificar que Redis está corriendo
redis-cli ping
# Debería responder: PONG

# Ver información de Redis
redis-cli info

# Ver claves en Redis
redis-cli keys "*"

# Limpiar Redis (cuidado en producción)
redis-cli flushall

# Verificar estado del servicio (Linux)
sudo systemctl status redis-server  # Ubuntu/Debian
sudo systemctl status redis  # Fedora

# Si usas Docker:
docker exec -it redis-local redis-cli ping
docker exec -it redis-local redis-cli keys "*"
```

### Docker (Redis)

```bash
# Iniciar Redis
docker start redis-local

# Detener Redis
docker stop redis-local

# Ver logs
docker logs redis-local

# Eliminar contenedor
docker stop redis-local
docker rm redis-local
```

## 🐛 Troubleshooting

### MongoDB no conecta

```bash
# Verificar que MongoDB está corriendo
sudo systemctl status mongod

# Ver logs de MongoDB
sudo journalctl -u mongod -f  # Linux
# O
tail -f /usr/local/var/log/mongodb/mongo.log  # macOS

# Reiniciar MongoDB
sudo systemctl restart mongod
```

### Redis no conecta

```bash
# Verificar que Redis está corriendo
redis-cli ping

# Si no responde, iniciar Redis
# Docker:
docker start redis-local

# Local:
sudo systemctl start redis-server  # Ubuntu/Debian
sudo systemctl start redis  # Fedora
brew services start redis  # macOS

# Verificar estado del servicio
sudo systemctl status redis-server  # Ubuntu/Debian
sudo systemctl status redis  # Fedora

# Verificar puerto
lsof -i :6379  # Linux/macOS
netstat -an | grep 6379  # Linux
ss -tlnp | grep 6379  # Fedora (alternativa moderna)
```

### La aplicación no inicia

1. **Verifica variables de entorno:**
   ```bash
   # Asegúrate de que .env.local existe
   ls -la .env.local
   
   # Verifica que tiene las variables necesarias
   cat .env.local | grep MONGODB_URI
   cat .env.local | grep NEXTAUTH_SECRET
   ```

2. **Limpia caché de Next.js:**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Reinstala dependencias:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### La cola VeriFactu usa in-memory

**Esto es normal en desarrollo** si Redis no está configurado. La aplicación funciona correctamente con el fallback in-memory.

Para usar Redis:
1. Instala/ejecuta Redis (ver sección arriba)
2. Agrega `REDIS_URL=redis://localhost:6379` a `.env.local`
3. Reinicia la aplicación

## 📚 Recursos Adicionales

- [Documentación MongoDB](https://docs.mongodb.com/)
- [Documentación Redis](https://redis.io/documentation)
- [Guía Redis Setup](./REDIS_SETUP.md)
- [Guía de Despliegue](./DEPLOYMENT_GUIDE.md)

## 💡 Tips de Desarrollo

1. **Usa Docker para Redis**: Es más fácil de gestionar y no contamina tu sistema
2. **MongoDB Atlas para desarrollo**: Evita instalar MongoDB localmente
3. **Redis opcional**: La aplicación funciona sin Redis usando fallback in-memory
4. **Variables de entorno**: Nunca commitees `.env.local` al repositorio
5. **Hot reload**: Next.js recarga automáticamente cuando cambias código

