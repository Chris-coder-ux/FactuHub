# Configuración de Encriptación para Certificados VeriFactu

## ✅ Implementación Completada

Se ha implementado encriptación AES-256-GCM para los siguientes datos sensibles:
- Contraseñas de certificados VeriFactu (`verifactuCertificatePassword`)
- Credenciales AEAT (`aeatUsername`, `aeatPassword`)

## 🔐 Configuración Requerida

### 1. Generar Clave de Encriptación

**IMPORTANTE**: En producción, debes generar una clave segura de 32 bytes (64 caracteres hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Esto generará una clave como: `a1b2c3d4e5f6...` (64 caracteres)

### 2. Configurar Variable de Entorno

Agrega la clave a tu archivo `.env` o variables de entorno:

```bash
ENCRYPTION_KEY=tu_clave_generada_de_64_caracteres_hex
```

**⚠️ ADVERTENCIA**: 
- En desarrollo, si no se configura `ENCRYPTION_KEY`, se usará una clave por defecto (NO SEGURA)
- En producción, la aplicación fallará si no está configurada `ENCRYPTION_KEY`
- NUNCA compartas esta clave ni la subas a repositorios públicos

### 3. Migración de Datos Existentes

Si ya tienes certificados guardados sin encriptar:

1. Los datos existentes seguirán funcionando (el sistema detecta si están encriptados)
2. La próxima vez que se actualicen los settings, se encriptarán automáticamente
3. Para forzar re-encriptación, actualiza los settings desde la UI

## 📁 Archivos Modificados

- `src/lib/encryption.ts` - Módulo de encriptación (NUEVO)
- `src/app/api/settings/route.ts` - Encripta/desencripta al guardar/leer
- `src/app/api/invoices/route.ts` - Desencripta para usar certificados
- `src/app/api/invoices/[id]/verifactu/sign/route.ts` - Desencripta para firmar
- `src/app/api/invoices/[id]/verifactu/send/route.ts` - Desencripta para enviar
- `src/app/api/invoices/[id]/verifactu/status/route.ts` - Desencripta para consultar estado
- `src/app/api/invoices/[id]/cancel/route.ts` - Desencripta para cancelaciones

## 🔒 Características de Seguridad

1. **AES-256-GCM**: Cifrado autenticado (previene manipulación)
2. **Salt único**: Cada encriptación usa un salt diferente
3. **IV aleatorio**: Vector de inicialización único por encriptación
4. **Auth Tag**: Verificación de integridad automática
5. **Detección automática**: El sistema detecta si los datos están encriptados

## 🧪 Testing

Para verificar que funciona:

1. Configura `ENCRYPTION_KEY` en `.env`
2. Actualiza los settings de VeriFactu desde la UI
3. Verifica en la base de datos que `verifactuCertificatePassword` está encriptado (base64, longitud > 48 caracteres)
4. Verifica que las operaciones VeriFactu siguen funcionando

## 📝 Notas

- La encriptación es transparente para el usuario final
- Los datos se desencriptan automáticamente cuando se usan
- Los datos se encriptan automáticamente cuando se guardan
- Compatible con datos existentes (sin encriptar)

## 🚀 Próximos Pasos Recomendados

1. **Rotación de claves**: Implementar sistema de rotación de claves de encriptación
2. **AWS Secrets Manager**: Migrar a un gestor de secretos en producción
3. **Auditoría**: Registrar accesos a datos encriptados
4. **Backup seguro**: Asegurar que los backups incluyan la clave de encriptación de forma segura

