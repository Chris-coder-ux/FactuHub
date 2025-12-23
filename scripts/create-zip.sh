#!/bin/bash

# Script para crear un ZIP de la aplicación excluyendo directorios innecesarios
# Uso: ./scripts/create-zip.sh [nombre-archivo]

set -e

# Nombre del archivo ZIP (con fecha si no se especifica)
ZIP_NAME="${1:-AppTrabajo-$(date +%Y%m%d-%H%M%S).zip}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMP_DIR=$(mktemp -d)

echo "📦 Creando ZIP de la aplicación..."
echo "📁 Directorio del proyecto: $PROJECT_ROOT"
echo "📦 Nombre del archivo: $ZIP_NAME"

# Cambiar al directorio del proyecto
cd "$PROJECT_ROOT"

# Crear el ZIP excluyendo directorios innecesarios
zip -r "$ZIP_NAME" . \
  -x "*.zip" \
  -x "node_modules/*" \
  -x ".next/*" \
  -x ".git/*" \
  -x ".vercel/*" \
  -x "dist/*" \
  -x "build/*" \
  -x "out/*" \
  -x "coverage/*" \
  -x ".env*.local" \
  -x ".env.local" \
  -x "*.tsbuildinfo" \
  -x "tsconfig.tsbuildinfo" \
  -x ".DS_Store" \
  -x "Thumbs.db" \
  -x "*.log" \
  -x "*.swp" \
  -x "*.swo" \
  -x "*~" \
  -x ".vscode/*" \
  -x "!.vscode/extensions.json" \
  -x ".idea/*" \
  -x ".cursor/*" \
  -x "codacy-mcp/*" \
  -x "sequential-thinking-mcp/*" \
  -x "sonarqube-mcp/*" \
  -x "artillery/*" \
  -x "artillery-*.yml" \
  -x "artillery-*.js" \
  -x "artillery-processor.js" \
  -x "cypress/screenshots/*" \
  -x "cypress/videos/*" \
  -x "*.report.json" \
  -x "eslint_report.json" \
  -x "security_report.json" \
  -x "AUDIT_REPORT_JSON.json" \
  -x "report.json" \
  -x ".codacy/*" \
  -x ".pnp/*" \
  -x ".pnp.js" \
  -x "next-env.d.ts" \
  -x ".windsurf/*" \
  -x "*.kate-swp" \
  -x "*.kate-backup" \
  -x "*.sublime-*" \
  -x "*.code-workspace" \
  -x ".windsurfrules" \
  -x ".github/instructions/*" \
  -x ".directory" \
  -x "*.zip" \
  -x "*.tar.gz" \
  -x "backups/*" \
  -x "uploads/*" \
  > /dev/null 2>&1

# Obtener el tamaño del archivo
ZIP_SIZE=$(du -h "$ZIP_NAME" | cut -f1)

echo "✅ ZIP creado exitosamente: $ZIP_NAME"
echo "📊 Tamaño: $ZIP_SIZE"
echo "📍 Ubicación: $PROJECT_ROOT/$ZIP_NAME"

