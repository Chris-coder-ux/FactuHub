#!/bin/bash

# Script para crear un archivo comprimido (ZIP o TAR.GZ) de la aplicación
# excluyendo directorios innecesarios
# Uso: ./scripts/create-archive.sh [zip|tar.gz] [nombre-archivo]

set -e

# Tipo de archivo (zip o tar.gz)
ARCHIVE_TYPE="${1:-zip}"
ZIP_NAME="${2:-AppTrabajo-$(date +%Y%m%d-%H%M%S)}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "📦 Creando archivo comprimido de la aplicación..."
echo "📁 Directorio del proyecto: $PROJECT_ROOT"
echo "📦 Tipo: $ARCHIVE_TYPE"
echo "📦 Nombre: $ZIP_NAME"

# Cambiar al directorio del proyecto
cd "$PROJECT_ROOT"

# Lista de exclusiones comunes
EXCLUDE_PATTERNS=(
  "node_modules"
  ".next"
  ".git"
  ".vercel"
  "dist"
  "build"
  "out"
  "coverage"
  ".env*.local"
  ".env.local"
  "*.tsbuildinfo"
  "tsconfig.tsbuildinfo"
  ".DS_Store"
  "Thumbs.db"
  "*.log"
  "*.swp"
  "*.swo"
  "*~"
  ".vscode"
  ".idea"
  ".cursor"
  "codacy-mcp"
  "sequential-thinking-mcp"
  "sonarqube-mcp"
  "artillery"
  "artillery-*.yml"
  "artillery-*.js"
  "artillery-processor.js"
  "cypress/screenshots"
  "cypress/videos"
  "*.report.json"
  "eslint_report.json"
  "security_report.json"
  "AUDIT_REPORT_JSON.json"
  "report.json"
  ".codacy"
  ".pnp"
  ".pnp.js"
  "next-env.d.ts"
  ".windsurf"
  "*.kate-swp"
  "*.kate-backup"
  "*.sublime-*"
  "*.code-workspace"
  ".windsurfrules"
  ".github/instructions"
  ".directory"
  "*.zip"
  "*.tar.gz"
  "backups"
  "uploads"
)

if [ "$ARCHIVE_TYPE" = "zip" ]; then
  # Crear ZIP
  FULL_NAME="${ZIP_NAME}.zip"
  
  # Construir comando zip con exclusiones
  ZIP_CMD="zip -r '$FULL_NAME' ."
  for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    ZIP_CMD="$ZIP_CMD -x '$pattern/*'"
  done
  
  eval "$ZIP_CMD" > /dev/null 2>&1
  
elif [ "$ARCHIVE_TYPE" = "tar.gz" ] || [ "$ARCHIVE_TYPE" = "tgz" ]; then
  # Crear TAR.GZ
  FULL_NAME="${ZIP_NAME}.tar.gz"
  
  # Construir comando tar con exclusiones
  TAR_EXCLUDE=""
  for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    TAR_EXCLUDE="$TAR_EXCLUDE --exclude='$pattern'"
  done
  
  eval "tar $TAR_EXCLUDE -czf '$FULL_NAME' ." > /dev/null 2>&1
  
else
  echo "❌ Error: Tipo de archivo no válido. Use 'zip' o 'tar.gz'"
  exit 1
fi

# Obtener el tamaño del archivo
ARCHIVE_SIZE=$(du -h "$FULL_NAME" | cut -f1)

echo "✅ Archivo creado exitosamente: $FULL_NAME"
echo "📊 Tamaño: $ARCHIVE_SIZE"
echo "📍 Ubicación: $PROJECT_ROOT/$FULL_NAME"

