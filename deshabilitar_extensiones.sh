#!/bin/bash
# Script para deshabilitar extensiones innecesarias en Cursor

echo "=== Deshabilitando extensiones innecesarias ==="
echo ""

# Extensiones a deshabilitar
EXTENSIONS=(
  "sonarsource.sonarlint-vscode"
  "felixfbecker.php-debug"
  "astro-build.astro-vscode"
  "ms-vscode.live-server"
  "ritwickdey.liveserver"
)

CURSOR_CMD="cursor"
if ! command -v $CURSOR_CMD &> /dev/null; then
    echo "Cursor CLI no encontrado. Usa la interfaz gráfica:"
    echo "1. Abre Cursor"
    echo "2. Ve a Extensions (Ctrl+Shift+X)"
    echo "3. Busca cada extensión y haz clic en 'Disable'"
    echo ""
    echo "Extensiones a deshabilitar:"
    for ext in "${EXTENSIONS[@]}"; do
        echo "  - $ext"
    done
    exit 1
fi

for ext in "${EXTENSIONS[@]}"; do
    echo "Deshabilitando: $ext"
    $CURSOR_CMD --disable-extension "$ext" 2>/dev/null || echo "  ⚠️  No se pudo deshabilitar automáticamente"
done

echo ""
echo "✅ Proceso completado"
echo ""
echo "Para verificar, ejecuta: cursor --list-extensions | grep -E 'sonarlint|php|astro|live-server'"
