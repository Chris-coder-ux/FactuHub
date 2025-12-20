# Dataset de Recibos Españoles para Testing OCR

Este directorio contiene un dataset de recibos españoles reales para validar la precisión del OCR.

## Estructura

```
tests/fixtures/receipts/
├── README.md
├── ground-truth.json          # Datos esperados (ground truth)
├── receipt-001.jpg            # Recibo de ejemplo 1
├── receipt-002.jpg            # Recibo de ejemplo 2
└── ...                        # Más recibos
```

## Formato de ground-truth.json

```json
[
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
        },
        {
          "description": "Pan de molde",
          "quantity": 1,
          "price": 1.20,
          "total": 1.20
        }
      ],
      "confidence": 85
    }
  }
]
```

## Campos esperados

- **merchant**: Nombre del comercio (string)
- **date**: Fecha del recibo en formato YYYY-MM-DD (string)
- **total**: Total del recibo en euros (number)
- **tax**: IVA total en euros (number)
- **items**: Array de items con:
  - **description**: Descripción del producto (string)
  - **quantity**: Cantidad (number, opcional)
  - **price**: Precio unitario (number, opcional)
  - **total**: Total del item (number, opcional)
- **confidence**: Confianza mínima esperada (number, opcional, 0-100)

## Criterios de validación

Un recibo pasa la validación si:
- **Precisión general ≥ 90%**: Calculada como promedio ponderado de:
  - Merchant: 15%
  - Fecha: 15%
  - Total: 35%
  - IVA: 20%
  - Items: 15%
- **Confianza OCR ≥ 80%**: Score de confianza del motor OCR

## Ejecutar tests

```bash
# Con Tesseract.js (default)
npm run test:ocr-accuracy

# Con Google Vision API
npm run test:ocr-accuracy -- --vision

# Con dataset personalizado
npm run test:ocr-accuracy -- --dataset=path/to/receipts
```

## Agregar recibos al dataset

1. Coloca la imagen del recibo en este directorio
2. Agrega la entrada correspondiente en `ground-truth.json`
3. Asegúrate de que los datos esperados sean precisos (revisados manualmente)

## Notas

- Los recibos deben ser imágenes reales de recibos españoles
- El formato puede variar (tickets, facturas, etc.)
- Se recomienda incluir variedad: diferentes comercios, formatos, calidades de imagen
- Mínimo recomendado: 20-30 recibos para una validación estadísticamente significativa

