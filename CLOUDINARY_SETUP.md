# Configuración de Cloudinary para Almacenamiento de Recibos

## ✅ Implementación Completada

Se ha implementado un sistema de almacenamiento abstracto que soporta tanto almacenamiento local como Cloudinary. El sistema detecta automáticamente qué usar basándose en las variables de entorno.

## 🔐 Configuración Requerida

### 1. Crear Cuenta en Cloudinary

1. Ve a [cloudinary.com](https://cloudinary.com) y crea una cuenta gratuita
2. El plan gratuito incluye:
   - 25 GB de almacenamiento
   - 25 GB de ancho de banda mensual
   - Transformaciones de imagen ilimitadas
   - CDN global incluido

### 2. Obtener Credenciales

Desde el Dashboard de Cloudinary, copia:
- **Cloud Name**: Tu nombre de cloud (ej: `dxyz123`)
- **API Key**: Tu API key
- **API Secret**: Tu API secret

### 3. Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env.local` o `.env`:

```bash
# Cloudinary Configuration (opcional - si no se configuran, usa almacenamiento local)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

**⚠️ IMPORTANTE**: 
- Si NO configuras estas variables, el sistema usará almacenamiento local (comportamiento actual)
- Las imágenes existentes en local seguirán funcionando
- Las nuevas imágenes se subirán a Cloudinary si está configurado

## 📁 Arquitectura Implementada

### Servicios de Almacenamiento

1. **`LocalStorage`** (`src/lib/storage/local-storage.ts`)
   - Almacena archivos en `uploads/receipts/`
   - Usado cuando Cloudinary no está configurado

2. **`CloudinaryStorage`** (`src/lib/storage/cloudinary-storage.ts`)
   - Almacena archivos en Cloudinary
   - Optimización automática de imágenes
   - CDN global incluido
   - URLs seguras (HTTPS)

3. **Factory Pattern** (`src/lib/storage/index.ts`)
   - Detecta automáticamente qué servicio usar
   - Singleton para eficiencia

### Funciones Actualizadas

- `saveReceiptImage()` - Ahora usa el storage service configurado
- `deleteReceiptImage()` - Funciona con ambos storages
- `getReceiptImagePath()` - Descarga temporalmente desde Cloudinary si es necesario para OCR

## 🔄 Migración de Imágenes Existentes

Las imágenes existentes en almacenamiento local seguirán funcionando. Para migrar a Cloudinary:

1. **Opción 1: Migración Automática (Script)**
   ```bash
   # Script pendiente de creación
   npx ts-node scripts/migrate-receipts-to-cloudinary.ts
   ```

2. **Opción 2: Migración Gradual**
   - Las nuevas imágenes se subirán a Cloudinary automáticamente
   - Las imágenes antiguas seguirán en local hasta que se migren manualmente

## 🎯 Ventajas de Cloudinary

1. **CDN Global**: Imágenes servidas desde servidores cercanos al usuario
2. **Optimización Automática**: Formato y calidad optimizados automáticamente
3. **Escalabilidad**: Sin límites de espacio en servidor local
4. **Transformaciones**: Redimensionar, recortar, aplicar filtros on-the-fly
5. **Seguridad**: URLs firmadas y acceso controlado

## 📝 Notas Técnicas

### OCR Processing

Cuando una imagen está en Cloudinary y necesita procesamiento OCR:
1. El sistema descarga temporalmente la imagen a `temp/`
2. Procesa con OCR
3. Limpia el archivo temporal después

### Backward Compatibility

- URLs locales (`/uploads/receipts/...`) siguen funcionando
- URLs de Cloudinary (`https://res.cloudinary.com/...`) se sirven directamente
- El endpoint `/api/uploads/[...path]` maneja ambos casos

## 🚀 Próximos Pasos

1. ✅ Instalar dependencias (`cloudinary`)
2. ✅ Crear servicios de almacenamiento
3. ✅ Refactorizar `file-upload.ts`
4. ✅ Actualizar endpoints
5. ⏳ Crear script de migración (opcional)
6. ⏳ Agregar tests unitarios

---

**Última Actualización**: Enero 2025

