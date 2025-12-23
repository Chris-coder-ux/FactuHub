# Crear Archivo Comprimido de la Aplicación

Este documento explica cómo crear un archivo ZIP o TAR.GZ de la aplicación excluyendo directorios innecesarios.

## 📦 Scripts Disponibles

### 1. Script ZIP Simple (`create-zip.sh`)

Crea un archivo ZIP con nombre automático basado en fecha y hora.

**Uso:**
```bash
# Con nombre automático (AppTrabajo-YYYYMMDD-HHMMSS.zip)
npm run zip

# O directamente
./scripts/create-zip.sh

# Con nombre personalizado
./scripts/create-zip.sh mi-aplicacion.zip
```

### 2. Script de Archivo Flexible (`create-archive.sh`)

Crea archivos ZIP o TAR.GZ con más opciones.

**Uso:**
```bash
# Crear ZIP con nombre automático
npm run archive

# Crear TAR.GZ con nombre automático
npm run archive:tar

# Crear ZIP con nombre personalizado
./scripts/create-archive.sh zip mi-aplicacion.zip

# Crear TAR.GZ con nombre personalizado
./scripts/create-archive.sh tar.gz mi-aplicacion.tar.gz
```

## 🚫 Directorios y Archivos Excluidos

El script excluye automáticamente los siguientes elementos:

### Dependencias y Build
- `node_modules/` - Dependencias de npm (se instalan con `npm install`)
- `.next/` - Build de Next.js (se genera con `npm run build`)
- `dist/`, `build/`, `out/` - Artefactos de build
- `*.tsbuildinfo`, `tsconfig.tsbuildinfo` - Archivos de build de TypeScript

### Control de Versiones y Configuración
- `.git/` - Repositorio Git
- `.vercel/` - Configuración de Vercel
- `.env*.local`, `.env.local` - Archivos de entorno local

### Testing y Reportes
- `coverage/` - Cobertura de tests
- `cypress/screenshots/`, `cypress/videos/` - Screenshots y videos de tests
- `*.report.json`, `eslint_report.json`, `security_report.json` - Reportes generados

### Herramientas de Desarrollo
- `codacy-mcp/`, `sequential-thinking-mcp/`, `sonarqube-mcp/` - MCP servers de desarrollo
- `artillery/`, `artillery-*.yml`, `artillery-*.js` - Archivos de testing de performance
- `.vscode/`, `.idea/`, `.cursor/` - Configuraciones de IDE

### Archivos Temporales
- `*.log` - Archivos de log
- `*.swp`, `*.swo`, `*~` - Archivos temporales de editores
- `.DS_Store`, `Thumbs.db` - Archivos del sistema operativo
- `.directory` - Archivos de configuración del sistema

### Otros
- `backups/` - Backups de base de datos
- `uploads/` - Archivos subidos por usuarios
- `.codacy/` - Configuración de Codacy
- `.pnp/`, `.pnp.js` - Yarn PnP
- `next-env.d.ts` - Archivo generado por Next.js

## ✅ Archivos Incluidos

El ZIP incluye:
- ✅ Código fuente (`src/`)
- ✅ Configuración (`package.json`, `tsconfig.json`, `next.config.cjs`, etc.)
- ✅ Documentación (`docs/`, `README.md`)
- ✅ Scripts (`scripts/`)
- ✅ Configuración de tests (`cypress/`, `jest.config.js`)
- ✅ Archivos de configuración importantes (`.gitignore`, `vercel.json`, etc.)

## 📊 Tamaño Esperado

El archivo ZIP resultante debería tener aproximadamente:
- **~900KB - 1.5MB** (sin node_modules y builds)

## 🔧 Requisitos

- **zip**: Comando `zip` instalado (generalmente incluido en Linux/macOS)
- **tar**: Comando `tar` instalado (generalmente incluido en Linux/macOS)
- **bash**: Shell bash

### Instalación en Fedora
```bash
sudo dnf install zip
```

## 📝 Ejemplos de Uso

### Crear ZIP para backup
```bash
npm run zip
# Crea: AppTrabajo-20251223-091019.zip
```

### Crear ZIP con nombre específico
```bash
./scripts/create-zip.sh backup-2025-12-23.zip
```

### Crear TAR.GZ (mejor compresión)
```bash
npm run archive:tar
# Crea: AppTrabajo-20251223-091019.tar.gz
```

### Crear archivo para compartir
```bash
./scripts/create-archive.sh zip facturahub-v1.0.0.zip
```

## ⚠️ Notas Importantes

1. **No incluye node_modules**: El receptor debe ejecutar `npm install` después de extraer
2. **No incluye builds**: El receptor debe ejecutar `npm run build` si necesita el build
3. **No incluye .env.local**: Las variables de entorno deben configurarse manualmente
4. **No incluye uploads/backups**: Estos directorios contienen datos específicos del entorno

## 🚀 Después de Extraer

Después de extraer el ZIP en un nuevo entorno:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las configuraciones necesarias

# 3. Construir la aplicación
npm run build

# 4. Iniciar (producción)
npm start

# O iniciar (desarrollo)
npm run dev
```

## 📋 Checklist de Verificación

Antes de compartir el ZIP, verifica que:
- ✅ No contiene `node_modules/`
- ✅ No contiene `.next/`
- ✅ No contiene `.git/`
- ✅ No contiene `.env*.local`
- ✅ Incluye `package.json`
- ✅ Incluye `src/`
- ✅ Incluye `docs/`
- ✅ Incluye archivos de configuración necesarios

