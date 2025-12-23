# Iconos PWA

Este directorio contiene los iconos necesarios para la Progressive Web App (PWA).

## Iconos Requeridos

La PWA requiere los siguientes tamaños de iconos:
- 72x72px
- 96x96px
- 128x128px
- 144x144px
- 152x152px
- 192x192px
- 384x384px
- 512x512px

## Generar Iconos

### Opción 1: Desde una imagen fuente

```bash
# Instalar dependencia
npm install -D sharp

# Generar todos los iconos desde una imagen
npm run pwa:icons ./assets/logo.png
```

### Opción 2: Herramientas online

1. **PWA Builder Image Generator**: https://www.pwabuilder.com/imageGenerator
2. **RealFaviconGenerator**: https://realfavicongenerator.net/
3. **Favicon.io**: https://favicon.io/

Sube tu logo y descarga los iconos en los tamaños requeridos.

### Opción 3: Usar el placeholder

Si no tienes un logo aún, puedes usar el `icon-placeholder.svg` como base y convertirlo a PNG con cualquier herramienta de diseño.

## Verificar Iconos

Asegúrate de que todos los iconos estén presentes:

```bash
ls -la public/icons/icon-*.png
```

Deberías ver 8 archivos:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Notas

- Los iconos deben ser cuadrados (1:1)
- Se recomienda usar formato PNG con transparencia
- El icono debe ser reconocible incluso en tamaños pequeños
- Usa colores contrastantes para mejor visibilidad

