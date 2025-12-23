# Guía de Backups Encriptados

## 📋 Descripción

Este documento describe cómo crear y restaurar backups encriptados de la base de datos MongoDB.

## 🔐 Características

- **Encriptación AES-256-GCM**: Los backups se encriptan usando la misma clave de encriptación que los datos sensibles
- **Compresión**: Los backups se comprimen con gzip antes de encriptar
- **Retención automática**: Los backups antiguos se eliminan automáticamente según la configuración
- **Seguridad**: Los backups encriptados solo pueden ser restaurados con la clave correcta

## 🚀 Uso

### Crear Backup

```bash
# Usando script npm
npm run backup:create

# O directamente con tsx
tsx scripts/backup-database.ts [output-dir]
```

**Variables de Entorno Requeridas**:
- `MONGODB_URI`: Connection string de MongoDB
- `ENCRYPTION_KEY`: Clave de encriptación (64 caracteres hex)

**Variables Opcionales**:
- `BACKUP_OUTPUT_DIR`: Directorio de salida (default: `./backups`)
- `BACKUP_RETENTION_DAYS`: Días de retención (default: 30)

**Ejemplo**:
```bash
MONGODB_URI="mongodb+srv://..." \
ENCRYPTION_KEY="tu_clave_de_64_caracteres" \
BACKUP_RETENTION_DAYS=60 \
npm run backup:create
```

### Restaurar Backup

```bash
# Usando script npm
npm run backup:restore <backup-file.encrypted>

# O directamente con tsx
tsx scripts/restore-backup.ts <backup-file.encrypted>
```

**Variables de Entorno Requeridas**:
- `MONGODB_URI`: Connection string de MongoDB (destino)
- `ENCRYPTION_KEY`: Clave de encriptación usada para crear el backup

**Ejemplo**:
```bash
MONGODB_URI="mongodb+srv://..." \
ENCRYPTION_KEY="tu_clave_de_64_caracteres" \
npm run backup:restore ./backups/backup-2024-01-15T10-30-00-000Z.tar.gz.encrypted
```

## ⚠️ IMPORTANTE

1. **Clave de Encriptación**: La clave `ENCRYPTION_KEY` debe ser la misma que se usó para crear el backup
2. **Backup de la Clave**: Guarda la clave de encriptación de forma segura. Sin ella, los backups no pueden ser restaurados
3. **Verificación**: Siempre verifica los backups restaurados antes de usarlos en producción
4. **Almacenamiento**: Almacena los backups encriptados en un lugar seguro (almacenamiento encriptado, fuera del servidor)

## 📁 Estructura de Archivos

```
backups/
  ├── backup-2024-01-15T10-30-00-000Z.tar.gz.encrypted
  ├── backup-2024-01-16T10-30-00-000Z.tar.gz.encrypted
  └── ...
```

## 🔄 Automatización

### Cron Job (Linux/macOS)

```bash
# Agregar a crontab (crontab -e)
# Ejecutar backup diario a las 2:00 AM
0 2 * * * cd /ruta/a/proyecto && MONGODB_URI="..." ENCRYPTION_KEY="..." npm run backup:create
```

### GitHub Actions

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # Diario a las 2:00 AM
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Create backup
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}
        run: npm run backup:create
      - name: Upload backup
        uses: actions/upload-artifact@v4
        with:
          name: database-backup
          path: backups/*.encrypted
          retention-days: 30
```

## 🔒 Seguridad

- Los backups se encriptan con AES-256-GCM (mismo algoritmo que los datos sensibles)
- Los archivos sin encriptar se eliminan automáticamente después de encriptar
- La clave de encriptación nunca se almacena en los backups
- Los backups antiguos se eliminan automáticamente según la retención configurada

## 📊 Monitoreo

El script registra:
- Inicio y fin del backup
- Tamaño del backup creado
- Número de backups eliminados en limpieza
- Errores durante el proceso

Revisa los logs para monitorear el estado de los backups.

## 🛠️ Troubleshooting

### Error: "ENCRYPTION_KEY must be 64 hex characters"
- Verifica que la clave tenga exactamente 64 caracteres hexadecimales
- Genera una nueva clave: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Error: "Failed to create MongoDB dump"
- Verifica que `MONGODB_URI` sea correcta
- Verifica que tengas permisos de lectura en la base de datos
- Verifica que `mongodump` esté instalado y en el PATH

### Error: "Decryption failed" al restaurar
- Verifica que `ENCRYPTION_KEY` sea la misma que se usó para crear el backup
- Verifica que el archivo de backup no esté corrupto

### Backup muy grande
- Considera hacer backups incrementales
- Considera excluir colecciones grandes que no necesiten backup
- Considera comprimir más agresivamente (aunque ya se comprime con gzip)

