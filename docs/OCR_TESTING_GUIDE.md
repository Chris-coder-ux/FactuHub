# Guía de Testing OCR con Dataset Real

Esta guía explica cómo realizar testing de precisión OCR con un dataset real de recibos españoles.

## Estructura del Dataset

El dataset debe estar en `tests/fixtures/receipts/` con la siguiente estructura:

```
tests/fixtures/receipts/
├── README.md              # Documentación del dataset
├── ground-truth.json      # Datos esperados (ground truth)
├── receipt-001.jpg        # Imagen del recibo 1
├── receipt-002.jpg        # Imagen del recibo 2
└── ...                    # Más recibos
```

## Formato de ground-truth.json

Cada entrada en `ground-truth.json` debe tener este formato:

```json
{
  "filename": "receipt-001.jpg",
  "expected": {
    "merchant": "MERCADONA",
    "date": "2024-01-15",
    "total": 45.67,
    "tax": 9.59,
    "items": [
      {
        "description": "Leche entera",
        "quantity": 2,
        "price": 0.95,
        "total": 1.90
      }
    ],
    "confidence": 85
  }
}
```

## Ejecutar Tests

### Opción 1: Con Tesseract.js (default)

```bash
npm run test:ocr-accuracy
```

### Opción 2: Con Google Vision API

```bash
npm run test:ocr-accuracy -- --vision
```

O configurar variable de entorno:

```bash
USE_VISION_OCR=true npm run test:ocr-accuracy
```

### Opción 3: Dataset personalizado

```bash
npm run test:ocr-accuracy -- --dataset=path/to/receipts
```

## Criterios de Validación

Un recibo **pasa** la validación si:

1. **Precisión general ≥ 90%**: Calculada como promedio ponderado:
   - Merchant: 15%
   - Fecha: 15%
   - Total: 35%
   - IVA: 20%
   - Items: 15%

2. **Confianza OCR ≥ 80%**: Score de confianza del motor OCR

## Métricas Calculadas

El script calcula:

- **Precisión por campo**: Merchant, fecha, total, IVA, items
- **Precisión general**: Promedio ponderado de todos los campos
- **Confianza OCR**: Score proporcionado por el motor OCR
- **Tasa de éxito**: Porcentaje de recibos que cumplen los umbrales

## Interpretación de Resultados

### Precisión por Campo

- **1.0 (100%)**: Coincidencia exacta
- **0.7-0.99**: Coincidencia parcial (contiene o es contenido)
- **<0.7**: No coincide (usa distancia de Levenshtein)

### Precisión de Números

- Calculada como: `1 - (|extracted - expected| / max(|expected|, |extracted|, 1))`
- Ejemplo: Si se espera 100 y se extrae 95, precisión = 1 - (5/100) = 0.95 (95%)

### Precisión de Items

- Matching por descripción usando fuzzy matching
- Ponderación: 50% descripción, 30% total, 20% precio

## Ejemplo de Salida

```
🧪 Testing OCR accuracy with 10 receipts...

Using Tesseract.js

Processing: receipt-001.jpg...
  ✅ Accuracy: 92.5% | Confidence: 87.3%
Processing: receipt-002.jpg...
  ✅ Accuracy: 88.2% | Confidence: 82.1%
...

============================================================
📊 TEST SUMMARY
============================================================
Total Receipts: 10
✅ Passed: 9 (90.0%)
❌ Failed: 1
📈 Average Accuracy: 91.2%
🎯 Average Confidence: 85.4%

✅ Overall: PASSED (>90% accuracy required)
============================================================
```

## API de Métricas en Tiempo Real

También puedes consultar métricas de precisión desde la API:

```bash
GET /api/receipts/validate-accuracy?minConfidence=80&minAccuracy=90
```

Respuesta:

```json
{
  "message": "Métricas de precisión OCR calculadas",
  "metrics": {
    "total": 50,
    "averageConfidence": 87.5,
    "averageCompleteness": 0.92,
    "passedRate": 0.94,
    "meetsThreshold": true,
    "confidenceRanges": {
      "excellent": 30,
      "good": 15,
      "fair": 4,
      "poor": 1
    },
    "trend": {
      "recentAverage": 88.2,
      "previousAverage": 86.5,
      "change": 1.97,
      "direction": "up"
    }
  }
}
```

## Visualización en UI

Las métricas también están disponibles en la interfaz:

1. Ve a `/receipts`
2. Haz clic en la pestaña "Métricas OCR"
3. Verás:
   - Cards de resumen (precisión, confianza, tasa de éxito)
   - Gráfico de distribución de confianza
   - Tendencia temporal
   - Estadísticas detalladas

## Recomendaciones

1. **Mínimo 20-30 recibos** para validación estadísticamente significativa
2. **Variedad de formatos**: Tickets, facturas, diferentes comercios
3. **Diferentes calidades**: Imágenes claras y borrosas
4. **Actualizar ground truth** manualmente para asegurar precisión
5. **Ejecutar tests regularmente** para detectar regresiones

## Troubleshooting

### Error: "Ground truth file not found"

Asegúrate de que `tests/fixtures/receipts/ground-truth.json` existe.

### Error: "Image not found"

Verifica que las imágenes estén en el mismo directorio que `ground-truth.json`.

### Baja precisión

- Revisa la calidad de las imágenes
- Considera usar Google Vision API (`--vision`)
- Mejora el parser en `src/lib/receipt-parser.ts`
- Ajusta los umbrales de validación

