# Guía de Subresource Integrity (SRI)

## 📋 Descripción

Subresource Integrity (SRI) es una característica de seguridad que permite al navegador verificar que los recursos externos (scripts, estilos, etc.) no han sido modificados. Esto protege contra ataques donde un CDN o servidor externo es comprometido.

## 🔐 ¿Qué es SRI?

SRI usa hashes criptográficos para verificar la integridad de recursos externos. Cuando un recurso se carga, el navegador calcula su hash y lo compara con el hash proporcionado en el atributo `integrity`. Si no coinciden, el recurso se bloquea.

## 🛠️ Implementación

### 1. Utilidades SRI

**Archivo**: `src/lib/sri.ts`
- `generateSRIHash()`: Genera hash SRI para contenido
- `generateSRIHashFromURL()`: Genera hash SRI desde URL
- `generateAllSRIHashes()`: Genera todos los hashes (sha256, sha384, sha512)
- `formatSRIIntegrity()`: Formatea hash(es) para atributo integrity
- `isValidSRIHash()`: Valida formato de hash SRI

### 2. Componentes Seguros

**Archivo**: `src/components/SecureScript.tsx`
- Componente wrapper para `next/script` con soporte SRI
- Agrega automáticamente `crossOrigin` cuando se proporciona `integrity`

**Archivo**: `src/components/SecureLink.tsx`
- Componente wrapper para `<link>` con soporte SRI
- Útil para estilos externos, fuentes, etc.

### 3. Script de Generación

**Archivo**: `scripts/generate-sri-hash.ts`
- Script CLI para generar hashes SRI desde URLs o archivos locales
- Soporta múltiples algoritmos (sha256, sha384, sha512)

## 📝 Uso

### Generar Hash SRI

#### Desde URL:
```bash
tsx scripts/generate-sri-hash.ts https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js
```

**Salida**:
```
✅ SRI Hash (sha384):
sha384-abc123def456...

📋 All hashes:
SHA256: sha256-xyz789...
SHA384: sha384-abc123...
SHA512: sha512-def456...
```

#### Desde archivo local:
```bash
tsx scripts/generate-sri-hash.ts ./public/external-script.js
```

### Usar en Componentes

#### Scripts Externos:

```tsx
import { SecureScript } from '@/components/SecureScript';

export default function Page() {
  return (
    <>
      <SecureScript
        src="https://cdn.example.com/script.js"
        integrity="sha384-abc123def456..."
        crossOrigin="anonymous"
        async
      />
    </>
  );
}
```

**Nota**: `SecureScript` inyecta el script dinámicamente con SRI para asegurar que los atributos `integrity` y `crossOrigin` se apliquen correctamente.

#### Estilos Externos:

```tsx
import { SecureLink } from '@/components/SecureLink';

export default function Page() {
  return (
    <>
      <SecureLink
        rel="stylesheet"
        href="https://cdn.example.com/style.css"
        integrity="sha384-abc123def456..."
        crossOrigin="anonymous"
      />
    </>
  );
}
```

#### En Layout (Head):

```tsx
// src/app/layout.tsx
import { SecureLink } from '@/components/SecureLink';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <SecureLink
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          integrity="sha384-..." // Si Google Fonts proporciona SRI
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Usar Utilidades Directamente

```tsx
import { generateSRIHash, formatSRIIntegrity } from '@/lib/sri';

// Generar hash desde contenido
const content = 'console.log("Hello, World!");';
const hash = generateSRIHash(content, 'sha384');

// Usar múltiples hashes para compatibilidad
const allHashes = generateAllSRIHashes(content);
const integrity = formatSRIIntegrity([
  allHashes.sha256,
  allHashes.sha384,
  allHashes.sha512,
]);
```

## ⚠️ Consideraciones Importantes

### 1. Cross-Origin

**IMPORTANTE**: Cuando uses SRI con recursos de diferentes orígenes, debes incluir `crossOrigin="anonymous"` o `crossOrigin="use-credentials"`.

```tsx
<SecureScript
  src="https://cdn.example.com/script.js"
  integrity="sha384-..."
  crossOrigin="anonymous" // ✅ Requerido para SRI cross-origin
/>
```

### 2. Actualización de Recursos

Cuando actualices un recurso externo (nueva versión), debes:
1. Regenerar el hash SRI
2. Actualizar el atributo `integrity` en el código
3. Verificar que el recurso funciona correctamente

### 3. Múltiples Hashes

Puedes proporcionar múltiples hashes para compatibilidad:

```tsx
<SecureScript
  src="https://cdn.example.com/script.js"
  integrity="sha256-... sha384-... sha512-..."
  crossOrigin="anonymous"
/>
```

El navegador usará el primer hash que pueda verificar.

### 4. Recursos Dinámicos

SRI no funciona bien con recursos que cambian dinámicamente (como scripts que incluyen timestamps o versiones dinámicas). En estos casos, considera:
- Usar versiones específicas en lugar de "latest"
- Hostear el recurso localmente
- Usar CSP en lugar de SRI

## 🔒 Beneficios de Seguridad

### Antes (Sin SRI)
- ❌ Vulnerable a CDN comprometido
- ❌ No verificación de integridad
- ⚠️ Scripts maliciosos pueden ejecutarse

### Después (Con SRI)
- ✅ Verificación automática de integridad
- ✅ Bloqueo de recursos modificados
- ✅ Protección contra CDN comprometido
- ✅ Protección contra Man-in-the-Middle (MITM)

## 📊 Algoritmos Soportados

| Algoritmo | Longitud Hash | Recomendado | Compatibilidad |
|-----------|---------------|-------------|----------------|
| SHA-256   | 64 caracteres | ⚠️ Mínimo   | ✅ Excelente   |
| SHA-384   | 96 caracteres | ✅ Recomendado | ✅ Excelente   |
| SHA-512   | 128 caracteres | ⚠️ Excesivo | ✅ Excelente   |

**Recomendación**: Usa SHA-384 como balance entre seguridad y tamaño.

## 🚀 Próximos Pasos

Si necesitas cargar recursos externos en el futuro:

1. **Generar hash SRI**:
   ```bash
   tsx scripts/generate-sri-hash.ts <url>
   ```

2. **Usar componentes seguros**:
   ```tsx
   import { SecureScript, SecureLink } from '@/components/...';
   ```

3. **Verificar en desarrollo**:
   - Abre DevTools → Console
   - Verifica que no hay errores de integridad
   - Los recursos deben cargar correctamente

4. **Monitorear en producción**:
   - Revisa logs de errores
   - Monitorea bloqueos de recursos
   - Actualiza hashes cuando sea necesario

## 📝 Notas

- **Next.js Script Component**: Ya incluye optimizaciones. `SecureScript` es un wrapper que agrega SRI.
- **Recursos Locales**: No necesitan SRI (mismo origen).
- **CDNs Populares**: Algunos CDNs (como jsDelivr, unpkg) proporcionan hashes SRI en sus páginas de documentación.
- **Compatibilidad**: SRI es compatible con todos los navegadores modernos (IE11+ con polyfill).

## 🔗 Recursos Adicionales

- [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [W3C SRI Specification](https://www.w3.org/TR/SRI/)
- [SRI Hash Generator (Online)](https://www.srihash.org/)

