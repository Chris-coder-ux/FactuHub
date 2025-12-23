# Guía de CSP Estricto con Nonces

## 📋 Descripción

Este documento describe la implementación de Content Security Policy (CSP) estricto usando nonces para mejorar la seguridad contra ataques XSS.

## 🔐 Mejoras Implementadas

### Antes (CSP Básico)
```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline'
```

### Después (CSP Estricto con Nonces)
```
script-src 'self' 'nonce-{random}' 'unsafe-eval' (solo en desarrollo)
style-src 'self' 'nonce-{random}' 'unsafe-inline'
```

## 🛠️ Implementación

### 1. Generación de Nonces

**Archivo**: `src/lib/csp.ts`
- `generateNonce()`: Genera nonce aleatorio de 16 bytes (base64)
- `buildCSPHeader()`: Construye CSP estricto con nonce
- `getCSPNonce()`: Obtiene nonce de headers de request

### 2. Middleware

**Archivo**: `middleware.ts` y `src/middleware-csp.ts`
- Genera nonce único por request
- Agrega nonce a headers de respuesta (`x-csp-nonce`)
- Sobrescribe CSP header con versión estricta que incluye nonce

### 3. Configuración Next.js

**Archivo**: `next.config.cjs`
- CSP base configurado (fallback para assets estáticos)
- CSP dinámico con nonces agregado por middleware
- `unsafe-eval` solo en desarrollo (Next.js HMR requiere)

## 📝 Uso de Nonces

### En Server Components

```typescript
import { headers } from 'next/headers';
import { getCSPNonce } from '@/lib/csp';

export default async function Page() {
  const headersList = await headers();
  const nonce = headersList.get('x-csp-nonce');

  return (
    <>
      <script nonce={nonce} dangerouslySetInnerHTML={{
        __html: `console.log('Safe inline script');`
      }} />
    </>
  );
}
```

### En Client Components

```typescript
'use client';

import { useCSPNonce } from '@/components/CSPNonceProvider';

export function MyComponent() {
  const nonce = useCSPNonce();

  return (
    <style nonce={nonce}>
      {`.custom-style { color: red; }`}
    </style>
  );
}
```

### En Layout (Root)

El nonce se pasa automáticamente a través de headers. Para scripts inline críticos:

```tsx
// src/app/layout.tsx
import { headers } from 'next/headers';

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const nonce = headersList.get('x-csp-nonce');

  return (
    <html>
      <head>
        <meta name="csp-nonce" content={nonce || ''} />
        {/* Scripts inline con nonce */}
        <script nonce={nonce} dangerouslySetInnerHTML={{
          __html: `window.__NONCE__ = '${nonce}';`
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## ⚠️ Limitaciones y Consideraciones

### 1. Next.js HMR (Hot Module Replacement)

En desarrollo, Next.js requiere `unsafe-eval` para HMR. Esto es normal y aceptable en desarrollo.

**Solución**: El CSP incluye `unsafe-eval` solo en desarrollo. En producción, se elimina.

### 2. Estilos Inline de Next.js

Next.js inyecta estilos inline durante SSR. Por esto, mantenemos `'unsafe-inline'` como fallback para estilos.

**Solución**: Usamos nonce + `unsafe-inline` para estilos. El nonce protege scripts inline, mientras que `unsafe-inline` es necesario para estilos de Next.js.

### 3. Scripts de Terceros

Algunos scripts de terceros (como Sentry) pueden requerir ajustes en CSP.

**Solución**: Agregamos dominios específicos a `script-src`:
- `https://*.sentry.io` para Sentry

### 4. Service Worker

El Service Worker requiere scripts inline.

**Solución**: El Service Worker se registra con nonce cuando está disponible.

## 🔒 Mejoras de Seguridad

### Antes
- ❌ `unsafe-inline` permitía cualquier script inline
- ❌ `unsafe-eval` permitía `eval()` y `Function()`
- ⚠️ Vulnerable a XSS si hay input no sanitizado

### Después
- ✅ Nonces únicos por request
- ✅ Solo scripts con nonce válido pueden ejecutarse
- ✅ `unsafe-eval` solo en desarrollo
- ✅ Protección mejorada contra XSS

## 📊 Comparación

| Característica | CSP Básico | CSP Estricto |
|---------------|------------|--------------|
| Scripts inline | Permitidos (unsafe-inline) | Solo con nonce |
| eval() | Permitido | Solo en desarrollo |
| Estilos inline | Permitidos | Permitidos (necesario para Next.js) |
| Protección XSS | Básica | Mejorada |
| Compatibilidad Next.js | ✅ | ✅ |

## 🚀 Próximos Pasos (Opcional)

Para hacer el CSP aún más estricto:

1. **Usar hashes para scripts específicos**:
   ```javascript
   script-src 'self' 'sha256-{hash}' 'nonce-{nonce}'
   ```

2. **Reportar violaciones CSP**:
   ```javascript
   report-uri /api/csp-report
   ```

3. **Eliminar `unsafe-inline` de estilos** (requiere refactorizar estilos inline de Next.js):
   - Usar CSS modules exclusivamente
   - Evitar estilos inline en componentes

## 📝 Notas

- Los nonces se generan por request, no se reutilizan
- El nonce está disponible en headers como `x-csp-nonce`
- En producción, `unsafe-eval` se elimina del CSP
- El CSP se aplica dinámicamente en middleware, sobrescribiendo el CSP base de `next.config.cjs`

