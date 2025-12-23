# 📱 PWA - Instalación de FacturaHub

FacturaHub es una **Progressive Web App (PWA)** que puede instalarse en tu dispositivo para acceso rápido, como una aplicación nativa.

## 🚀 Instalación

### Desde el Navegador

1. **Visita** la aplicación en tu navegador
2. **Busca el icono de instalación** en la barra de direcciones:
   - **Chrome/Edge**: Icono de "Instalar" (➕) en la barra de direcciones
   - **Firefox**: Menú (☰) > "Instalar"
   - **Safari (iOS)**: Compartir (□↑) > "Añadir a pantalla de inicio"
3. **Haz clic** en "Instalar" o sigue las instrucciones
4. **¡Listo!** La aplicación aparecerá en tu escritorio/pantalla de inicio

### Banner de Instalación

Si el navegador lo soporta, verás un banner en la parte inferior de la pantalla ofreciendo instalar la aplicación. Puedes:
- **Instalar**: Instalar la aplicación
- **Ahora no**: Ocultar el banner (se mostrará de nuevo en 7 días)

## ✨ Características de la PWA

### 🎯 Acceso Rápido
- **Icono en escritorio/pantalla de inicio**: Acceso directo con un clic
- **Sin navegador**: Se abre como aplicación independiente
- **Inicio rápido**: Carga más rápida que en el navegador

### 📱 Experiencia Nativa
- **Pantalla completa**: Sin barras del navegador
- **Navegación fluida**: Transiciones suaves
- **Diseño responsive**: Se adapta a cualquier tamaño de pantalla

### 🔄 Funcionalidad Offline
- **Cache inteligente**: Los recursos se guardan localmente
- **Funciona sin internet**: Puedes ver datos cacheados offline
- **Sincronización automática**: Se actualiza cuando hay conexión

### ⚡ Atajos Rápidos
- **Nueva Factura**: Acceso directo desde el menú contextual del icono
- **Clientes**: Gestión rápida de clientes
- **Analytics**: Análisis financiero al instante

## 🖥️ Plataformas Soportadas

### Desktop
- ✅ **Windows**: Chrome, Edge
- ✅ **macOS**: Chrome, Edge, Safari
- ✅ **Linux**: Chrome, Edge, Firefox

### Mobile
- ✅ **Android**: Chrome, Edge, Firefox, Samsung Internet
- ✅ **iOS**: Safari (iOS 11.3+)

## 🛠️ Desarrollo

### Generar Iconos

Si necesitas generar los iconos PWA desde una imagen fuente:

```bash
# Instalar dependencia (si no está instalada)
npm install -D sharp

# Generar iconos
npm run pwa:icons ./assets/logo.png
```

Esto generará todos los tamaños necesarios en `public/icons/`.

### Configuración

El manifest de la PWA está en `public/manifest.json`. Puedes personalizar:
- Nombre de la aplicación
- Colores del tema
- Iconos
- Atajos rápidos
- Categorías

### Service Worker

El Service Worker está implementado en `src/app/sw.js/route.ts` y se registra automáticamente en producción.

## 📋 Requisitos

Para que la PWA sea instalable, se requiere:
- ✅ HTTPS (o localhost para desarrollo)
- ✅ Service Worker registrado
- ✅ Manifest.json válido
- ✅ Iconos en múltiples tamaños
- ✅ Navegador compatible

## 🔍 Verificar Instalación

### En Desktop
- Busca el icono de FacturaHub en tu escritorio o menú de aplicaciones
- Al abrir, debería abrirse en una ventana sin barras del navegador

### En Mobile
- Busca el icono en tu pantalla de inicio
- Al abrir, debería abrirse en pantalla completa sin la barra de direcciones

## 🐛 Solución de Problemas

### No aparece la opción de instalar
- **Verifica HTTPS**: La PWA requiere HTTPS (excepto localhost)
- **Revisa el navegador**: Algunos navegadores no soportan PWA
- **Limpia la caché**: Intenta limpiar la caché del navegador

### La aplicación no se instala
- **Verifica el manifest**: Asegúrate de que `manifest.json` sea accesible
- **Revisa la consola**: Busca errores en la consola del navegador
- **Service Worker**: Verifica que el Service Worker esté registrado

### Los iconos no aparecen
- **Verifica las rutas**: Asegúrate de que los iconos estén en `public/icons/`
- **Regenera iconos**: Usa `npm run pwa:icons` para regenerar
- **Tamaños correctos**: Verifica que todos los tamaños estén presentes

## 📚 Recursos

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)

