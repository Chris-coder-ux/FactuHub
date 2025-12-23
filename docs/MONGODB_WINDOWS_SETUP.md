# Guía de Configuración MongoDB en Windows

## 🎯 Problema Común

Error 500 al ejecutar la aplicación en Windows porque MongoDB no está disponible.

## ✅ Soluciones (Ordenadas por Facilidad)

---

## Opción 1: MongoDB Atlas (Cloud) - ⭐ RECOMENDADO

**Ventajas**: 
- ✅ Gratis (512MB)
- ✅ No requiere instalación
- ✅ Funciona en cualquier OS
- ✅ Backup automático
- ✅ Escalable

### Pasos:

1. **Crear cuenta en MongoDB Atlas**
   - Ve a https://www.mongodb.com/cloud/atlas/register
   - Crea una cuenta gratuita

2. **Crear un Cluster Gratuito**
   - Click en "Build a Database"
   - Selecciona "FREE" (M0 Sandbox)
   - Elige región más cercana
   - Click "Create"

3. **Configurar Acceso**
   - **Database Access**: Crea un usuario y contraseña
   - **Network Access**: Agrega `0.0.0.0/0` (permite desde cualquier IP) o tu IP específica

4. **Obtener Connection String**
   - Click en "Connect" en tu cluster
   - Selecciona "Connect your application"
   - Copia la connection string (ejemplo):
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

5. **Configurar en `.env.local`**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/facturahub?retryWrites=true&w=majority
   ```
   ⚠️ **Reemplaza**:
   - `username` con tu usuario
   - `password` con tu contraseña
   - `facturahub` con el nombre de tu base de datos (opcional)

6. **Reiniciar la aplicación**
   ```bash
   npm run dev
   ```

---

## Opción 2: MongoDB Community Edition (Local)

**Ventajas**: 
- ✅ Gratis
- ✅ Datos locales
- ✅ Sin dependencia de internet

**Desventajas**: 
- ⚠️ Requiere instalación
- ⚠️ Más mantenimiento

### Pasos:

1. **Descargar MongoDB**
   - Ve a https://www.mongodb.com/try/download/community
   - Selecciona:
     - Version: 7.0 (o la más reciente)
     - Platform: Windows
     - Package: MSI
   - Click "Download"

2. **Instalar MongoDB**
   - Ejecuta el instalador `.msi`
   - Selecciona "Complete" installation
   - ✅ Marca "Install MongoDB as a Service"
   - ✅ Marca "Install MongoDB Compass" (GUI opcional)
   - Click "Install"

3. **Verificar Instalación**
   - Abre PowerShell como Administrador
   ```powershell
   # Verificar que el servicio está corriendo
   Get-Service MongoDB
   
   # Debería mostrar: Status: Running
   ```

4. **Configurar en `.env.local`**
   ```bash
   MONGODB_URI=mongodb://localhost:27017/facturahub
   ```

5. **Reiniciar la aplicación**
   ```bash
   npm run dev
   ```

---

## Opción 3: Docker (Recomendado para Desarrolladores)

**Ventajas**: 
- ✅ Aislado del sistema
- ✅ Fácil de limpiar/reiniciar
- ✅ Mismo entorno en todos los OS

### Pasos:

1. **Instalar Docker Desktop**
   - Descarga: https://www.docker.com/products/docker-desktop
   - Instala y reinicia Windows

2. **Ejecutar MongoDB en Docker**
   ```powershell
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

3. **Verificar que está corriendo**
   ```powershell
   docker ps
   # Debería mostrar mongodb corriendo
   ```

4. **Configurar en `.env.local`**
   ```bash
   MONGODB_URI=mongodb://localhost:27017/facturahub
   ```

---

## 🔍 Verificar Configuración

### Test de Conexión

Crea un archivo `test-mongodb.js`:

```javascript
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/facturahub';

async function testConnection() {
  try {
    console.log('🔌 Intentando conectar a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conexión exitosa a MongoDB!');
    console.log('📊 Base de datos:', mongoose.connection.db.databaseName);
    await mongoose.disconnect();
    console.log('👋 Desconectado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }
}

testConnection();
```

Ejecutar:
```bash
node test-mongodb.js
```

---

## 🐛 Troubleshooting

### Error: "MONGODB_URI is not defined"

**Solución**: Crea `.env.local` en la raíz del proyecto:
```bash
MONGODB_URI=mongodb://localhost:27017/facturahub
```

### Error: "ECONNREFUSED" o "Connection timeout"

**Causas posibles**:
1. MongoDB no está corriendo
2. Puerto incorrecto (debe ser 27017)
3. Firewall bloqueando conexión

**Soluciones**:
```powershell
# Verificar si MongoDB está corriendo
Get-Service MongoDB

# Si no está corriendo, iniciarlo
Start-Service MongoDB

# Verificar puerto
netstat -an | findstr 27017
```

### Error: "Authentication failed"

**Solución**: Verifica usuario y contraseña en la connection string:
```bash
# Formato correcto:
MONGODB_URI=mongodb://username:password@host:port/database

# O para Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### Error: "Network is unreachable" (Atlas)

**Solución**: 
1. Verifica que tu IP está en la whitelist de Atlas
2. O agrega `0.0.0.0/0` temporalmente (menos seguro)

---

## 📝 Configuración Recomendada para Desarrollo

### `.env.local` (MongoDB Atlas)
```bash
# MongoDB Atlas (Cloud) - RECOMENDADO
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/facturahub?retryWrites=true&w=majority
```

### `.env.local` (MongoDB Local)
```bash
# MongoDB Local
MONGODB_URI=mongodb://localhost:27017/facturahub

# O con autenticación:
MONGODB_URI=mongodb://user:pass@localhost:27017/facturahub?authSource=admin
```

---

## 🚀 Próximos Pasos

Una vez configurado MongoDB:

1. **Inicializar la base de datos**
   - La aplicación creará las colecciones automáticamente
   - Los índices se crearán en el primer inicio

2. **Crear usuario inicial**
   - Ve a `/auth` en la aplicación
   - Registra el primer usuario
   - Crea una compañía

3. **Verificar funcionamiento**
   - Intenta crear una factura
   - Verifica que se guarda en MongoDB

---

## 💡 Recomendación Final

**Para desarrollo en Windows**: Usa **MongoDB Atlas** (Opción 1)
- ✅ Más fácil de configurar
- ✅ No requiere instalación
- ✅ Funciona igual en todos los OS
- ✅ Gratis hasta 512MB

**Para producción**: Usa **MongoDB Atlas** o **MongoDB Cloud**
- ✅ Backup automático
- ✅ Escalabilidad
- ✅ Monitoreo incluido

---

**Última Actualización**: Diciembre 2025

