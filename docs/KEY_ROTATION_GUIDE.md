# Guía de Rotación de Claves de Encriptación

## 📋 Descripción

Este documento describe el proceso de rotación automática de claves de encriptación para datos sensibles en la aplicación.

## 🔐 ¿Qué se Encripta?

Los siguientes datos sensibles están encriptados y requieren rotación:

- **Settings (por compañía)**:
  - `verifactuCertificatePassword`: Contraseña del certificado VeriFactu
  - `aeatUsername`: Usuario de AEAT
  - `aeatPassword`: Contraseña de AEAT

- **Users**:
  - `mfaSecret`: Secreto TOTP para MFA
  - `mfaBackupCodes`: Códigos de respaldo MFA

## 🔄 Proceso de Rotación Automática

### Configuración

1. **Habilitar rotación automática** (opcional):
   ```bash
   ENCRYPTION_KEY_ROTATION_ENABLED=true
   ```

2. **Cron job configurado**: El sistema verifica diariamente si es necesario rotar (cada 90 días)

### Flujo Automático

1. **Verificación diaria**: El cron job `/api/cron/key-rotation` se ejecuta diariamente
2. **Detección**: Si han pasado 90 días desde la última rotación, inicia el proceso
3. **Generación**: Genera una nueva clave de encriptación (64 caracteres hex)
4. **Re-encriptación**: 
   - Desencripta todos los datos con la clave antigua
   - Encripta con la nueva clave
   - Actualiza en base de datos
5. **Registro**: Guarda metadatos de la rotación en `KeyRotation` collection
6. **Advertencia**: Logs alertan que se debe actualizar `ENCRYPTION_KEY` manualmente

### ⚠️ IMPORTANTE: Actualización Manual Requerida

**Después de una rotación automática, DEBES actualizar manualmente la variable de entorno `ENCRYPTION_KEY`.**

El servicio no puede actualizar variables de entorno automáticamente por razones de seguridad.

## 🔧 Rotación Manual

Si prefieres rotar manualmente o necesitas hacerlo fuera del ciclo automático:

### Paso 1: Generar Nueva Clave

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Esto generará una clave de 64 caracteres hex, por ejemplo:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### Paso 2: Ejecutar Rotación

```typescript
import { rotateEncryptionKeys } from '@/lib/services/key-rotation-service';

const newKey = 'tu_nueva_clave_de_64_caracteres';
const oldKey = process.env.ENCRYPTION_KEY; // Clave actual

const result = await rotateEncryptionKeys(newKey, oldKey);

if (result.success) {
  console.log(`Rotación completada: ${result.recordsProcessed} registros procesados`);
} else {
  console.error('Error en rotación:', result.error);
}
```

O usando la API directamente:

```bash
curl -X POST http://localhost:3000/api/cron/key-rotation \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"newKey": "tu_nueva_clave", "oldKey": "clave_actual"}'
```

### Paso 3: Actualizar Variable de Entorno

**En Vercel**:
1. Ve a Project Settings > Environment Variables
2. Actualiza `ENCRYPTION_KEY` con la nueva clave
3. Reinicia el deployment

**En servidor propio**:
1. Actualiza `.env` o variables de entorno del sistema
2. Reinicia la aplicación

### Paso 4: Verificar

Después de actualizar `ENCRYPTION_KEY` y reiniciar, verifica que los datos se pueden desencriptar correctamente:

```typescript
// Los datos deberían desencriptarse correctamente con la nueva clave
const settings = await Settings.findOne({ companyId });
const password = await decryptCertificatePassword(settings.verifactuCertificatePassword);
// Debe funcionar sin errores
```

## 📊 Monitoreo

### Ver Última Rotación

```typescript
import { getLastRotationDate } from '@/lib/services/key-rotation-service';

const lastRotation = await getLastRotationDate();
console.log('Última rotación:', lastRotation);
```

### Historial de Rotaciones

Consulta la colección `KeyRotation` en MongoDB:

```javascript
db.keyrotations.find().sort({ rotationDate: -1 }).limit(5)
```

Campos importantes:
- `rotationDate`: Fecha de la rotación
- `status`: Estado (`pending`, `in_progress`, `completed`, `failed`)
- `recordsProcessed`: Número de registros procesados
- `recordsTotal`: Total de registros encontrados
- `newKeyHash`: Hash de la nueva clave (para referencia)

## 🚨 Troubleshooting

### Error: "Decryption failed"

**Causa**: La clave actual no coincide con la usada para encriptar los datos.

**Solución**:
1. Verifica que `ENCRYPTION_KEY` esté configurada correctamente
2. Si acabas de rotar, asegúrate de haber actualizado `ENCRYPTION_KEY` con la nueva clave
3. Si los datos están con una clave antigua, necesitas la clave antigua para re-encriptarlos

### Error: "Key rotation failed"

**Causa**: Error durante la re-encriptación de algún registro.

**Solución**:
1. Revisa los logs para identificar qué registro falló
2. El proceso continúa con otros registros aunque uno falle
3. Puedes ejecutar la rotación nuevamente (es idempotente)

### Datos no se pueden desencriptar después de rotación

**Causa**: `ENCRYPTION_KEY` no se actualizó después de la rotación.

**Solución**:
1. **CRÍTICO**: Si aún tienes acceso a la clave antigua, actualiza `ENCRYPTION_KEY` con la clave antigua temporalmente
2. Ejecuta la rotación nuevamente con ambas claves
3. Actualiza `ENCRYPTION_KEY` con la nueva clave
4. Si no tienes la clave antigua, los datos afectados no se pueden recuperar

## 🔒 Mejores Prácticas

1. **Backup antes de rotar**: Asegúrate de tener backups de la base de datos antes de rotar
2. **Rotación en horario de bajo tráfico**: Ejecuta rotaciones durante horas de menor uso
3. **Monitoreo**: Revisa logs después de cada rotación
4. **Documentación**: Mantén registro de las claves usadas (hashes, no las claves reales)
5. **Pruebas**: Prueba el proceso de rotación en staging antes de producción
6. **Ventana de mantenimiento**: Considera una ventana de mantenimiento para la primera rotación

## 📅 Intervalo de Rotación

- **Recomendado**: Cada 90 días
- **Mínimo**: Cada 6 meses
- **Máximo**: Cada año (según políticas de seguridad)

El intervalo es configurable en `src/lib/services/key-rotation-service.ts`:

```typescript
const rotationIntervalDays = 90; // Cambiar según necesidades
```

## 🔐 Seguridad

- **Nunca almacenes la clave real**: Solo se almacenan hashes en `KeyRotation`
- **Rotación segura**: El proceso desencripta con clave antigua y encripta con nueva
- **Idempotente**: Puede ejecutarse múltiples veces sin duplicar trabajo
- **Transaccional**: Cada registro se actualiza individualmente (no hay rollback global)

## 📝 Notas Adicionales

- La primera rotación debe hacerse manualmente para establecer el baseline
- El cron job solo verifica; no ejecuta rotación automática sin `ENCRYPTION_KEY_ROTATION_ENABLED=true`
- Los datos no encriptados se encriptan automáticamente con la nueva clave durante la rotación
- El proceso es resiliente: si un registro falla, continúa con los demás

