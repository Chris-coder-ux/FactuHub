# Guía de Certificate Pinning

## 📋 Descripción

Certificate Pinning es una técnica de seguridad que protege contra ataques Man-in-the-Middle (MITM) al verificar que el certificado SSL/TLS del servidor coincide con uno esperado. Esto previene que atacantes intercepten comunicaciones usando certificados falsos.

## 🔐 ¿Qué es Certificate Pinning?

Certificate Pinning almacena los "fingerprints" (hashes) de los certificados SSL/TLS esperados de servidores externos. Cuando se establece una conexión, el cliente verifica que el certificado del servidor coincide con uno de los fingerprints almacenados. Si no coincide, la conexión se rechaza.

## 🛠️ Implementación

### 1. Utilidades de Certificate Pinning

**Archivo**: `src/lib/security/certificate-pinning.ts`
- `CertificatePinningStore`: Almacena y verifica fingerprints
- `initializeCertificatePins()`: Inicializa pins desde variables de entorno
- `createPinnedHttpsAgent()`: Crea HTTPS agent con pinning para Node.js
- `createPinnedAxiosInterceptor()`: Crea interceptor para axios

### 2. APIs Protegidas

#### AEAT (Agencia Tributaria)
- **Producción**: `www.agenciatributaria.es`
- **Sandbox**: `prewww.agenciatributaria.es`
- **Cliente**: `src/lib/verifactu/aeat-client.ts`

#### BBVA Banking API
- **Producción**: `api.bbva.com`
- **Sandbox**: `api.sandbox.bbva.com`
- **Clientes**: `src/lib/banking/bbva-api.ts`, `src/lib/banking/oauth.ts`

### 3. Inicialización

**Archivo**: `src/instrumentation.ts`
- Se ejecuta al iniciar el servidor Next.js
- Inicializa certificate pins desde variables de entorno

## 📝 Configuración

### Variables de Entorno

Agrega las siguientes variables a `.env.local`:

```bash
# AEAT Certificate Fingerprints (SHA-256)
AEAT_PRODUCTION_CERT_FINGERPRINT="FINGERPRINT1,FINGERPRINT2"
AEAT_SANDBOX_CERT_FINGERPRINT="FINGERPRINT1,FINGERPRINT2"

# BBVA Certificate Fingerprints (SHA-256)
BBVA_PRODUCTION_CERT_FINGERPRINT="FINGERPRINT1,FINGERPRINT2"
BBVA_SANDBOX_CERT_FINGERPRINT="FINGERPRINT1,FINGERPRINT2"
```

**Nota**: Puedes proporcionar múltiples fingerprints separados por comas para permitir rotación de certificados.

### Obtener Fingerprints

#### Método 1: Script Automático

```bash
# AEAT Producción
npm run cert:extract www.agenciatributaria.es

# AEAT Sandbox
npm run cert:extract prewww.agenciatributaria.es

# BBVA Sandbox
npm run cert:extract api.sandbox.bbva.com
```

El script mostrará el fingerprint y cómo agregarlo a `.env.local`.

#### Método 2: Manual (OpenSSL)

```bash
# Conectar y extraer certificado
openssl s_client -connect www.agenciatributaria.es:443 -servername www.agenciatributaria.es < /dev/null 2>/dev/null | openssl x509 -fingerprint -sha256 -noout -in /dev/stdin

# Salida: SHA256 Fingerprint=AA:BB:CC:DD:...
```

#### Método 3: Navegador

1. Abre DevTools → Security
2. Haz clic en "View Certificate"
3. Ve a "Details" → "Thumbprint"
4. Copia el SHA-256 fingerprint

## 🔒 Funcionamiento

### Flujo de Verificación

1. **Conexión HTTPS**: Cliente se conecta al servidor externo
2. **Certificado Recibido**: Servidor envía su certificado SSL/TLS
3. **Extracción Fingerprint**: Se calcula SHA-256 del certificado
4. **Verificación**: Se compara con fingerprints esperados
5. **Resultado**:
   - ✅ **Coincide**: Conexión permitida
   - ❌ **No coincide**: Conexión rechazada (error de seguridad)

### Múltiples Fingerprints

Para permitir rotación de certificados sin interrupciones:

```bash
# Fingerprint actual + backup (para rotación)
AEAT_PRODUCTION_CERT_FINGERPRINT="CURRENT_FINGERPRINT,BACKUP_FINGERPRINT"
```

El sistema aceptará cualquiera de los fingerprints configurados.

## ⚠️ Consideraciones Importantes

### 1. Rotación de Certificados

Cuando un proveedor (AEAT, BBVA) rota su certificado:

1. **Obtener nuevo fingerprint**:
   ```bash
   npm run cert:extract <hostname>
   ```

2. **Actualizar variable de entorno**:
   ```bash
   # Agregar nuevo fingerprint (mantener el anterior temporalmente)
   AEAT_PRODUCTION_CERT_FINGERPRINT="OLD_FINGERPRINT,NEW_FINGERPRINT"
   ```

3. **Verificar funcionamiento**:
   - Probar conexión a la API
   - Verificar logs para confirmar uso del nuevo fingerprint

4. **Limpiar fingerprint antiguo** (después de confirmar):
   ```bash
   AEAT_PRODUCTION_CERT_FINGERPRINT="NEW_FINGERPRINT"
   ```

### 2. Desarrollo vs Producción

- **Desarrollo**: Puedes deshabilitar pinning temporalmente para debugging
- **Producción**: **SIEMPRE** debe tener pinning habilitado

Para deshabilitar temporalmente (solo desarrollo):

```bash
# No configurar la variable de entorno
# El sistema permitirá conexiones sin verificación
```

### 3. Errores Comunes

#### Error: "Certificate pinning failed"

**Causa**: El certificado del servidor no coincide con el fingerprint esperado.

**Solución**:
1. Verificar que el fingerprint en `.env.local` es correcto
2. Obtener nuevo fingerprint: `npm run cert:extract <hostname>`
3. Actualizar variable de entorno

#### Error: "Unable to extract certificate"

**Causa**: Problema al extraer el certificado del servidor.

**Solución**:
1. Verificar conectividad al servidor
2. Verificar que el servidor usa HTTPS
3. Revisar logs para más detalles

### 4. Monitoreo

Los eventos de certificate pinning se registran en los logs:

- ✅ **Éxito**: `Certificate pinning verified for <hostname>`
- ❌ **Fallo**: `Certificate pinning failed for <hostname>`

Revisa los logs regularmente para detectar problemas de certificados.

## 🚀 Próximos Pasos

### Agregar Nuevos Servicios

Para agregar certificate pinning a un nuevo servicio externo:

1. **Obtener fingerprint**:
   ```bash
   npm run cert:extract <hostname>
   ```

2. **Agregar variable de entorno**:
   ```bash
   NEW_SERVICE_CERT_FINGERPRINT="FINGERPRINT"
   ```

3. **Registrar en código**:
   ```typescript
   // src/lib/security/certificate-pinning.ts
   if (process.env.NEW_SERVICE_CERT_FINGERPRINT) {
     certificatePinningStore.registerPin({
       hostname: 'api.newservice.com',
       fingerprints: process.env.NEW_SERVICE_CERT_FINGERPRINT.split(',').map(f => f.trim()),
       strict: true,
     });
   }
   ```

4. **Usar en cliente**:
   ```typescript
   const httpsAgent = createPinnedHttpsAgent('api.newservice.com');
   // o para axios
   const axiosInstance = axios.create({ httpsAgent });
   ```

## 📊 Beneficios de Seguridad

### Antes (Sin Pinning)
- ❌ Vulnerable a MITM attacks
- ❌ Certificados falsos pueden ser aceptados
- ⚠️ Datos sensibles pueden ser interceptados

### Después (Con Pinning)
- ✅ Protección contra MITM
- ✅ Solo certificados conocidos aceptados
- ✅ Verificación automática en cada conexión
- ✅ Logs de intentos de certificados inválidos

## 🔗 Recursos Adicionales

- [OWASP: Certificate and Public Key Pinning](https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning)
- [MDN: Public Key Pinning](https://developer.mozilla.org/en-US/docs/Web/HTTP/Public_Key_Pinning)
- [Node.js TLS Documentation](https://nodejs.org/api/tls.html)

## 📝 Notas

- **SHA-256**: Usamos SHA-256 para fingerprints (más seguro que SHA-1)
- **Múltiples Pins**: Soporta múltiples fingerprints para rotación sin interrupciones
- **Backward Compatibility**: Si no se configura pinning, las conexiones funcionan normalmente (solo en desarrollo)
- **Strict Mode**: Por defecto, el pinning es estricto (rechaza conexiones si no coinciden)

