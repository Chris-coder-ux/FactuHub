# Guía de Testing para Integración Bancaria

Esta guía describe cómo ejecutar los tests para la integración bancaria, incluyendo sandbox, validación de matching y pruebas de performance.

## Índice

1. [Testing con Sandbox Bancario](#testing-con-sandbox-bancario)
2. [Validación de Matching Accuracy](#validación-de-matching-accuracy)
3. [Pruebas de Performance](#pruebas-de-performance)

---

## Testing con Sandbox Bancario

### Requisitos Previos

1. **Variables de Entorno**: Configurar las siguientes variables en `.env`:
   ```env
   BBVA_CLIENT_ID=your_sandbox_client_id
   BBVA_CLIENT_SECRET=your_sandbox_client_secret
   BBVA_REDIRECT_URI=http://localhost:3000/api/banking/callback
   MONGODB_URI=your_mongodb_connection_string
   ```

2. **Cuenta de Sandbox**: Tener acceso al sandbox de BBVA y credenciales válidas.

### Ejecutar Tests

```bash
npm run test:banking-sandbox
```

### Qué Prueba

El script `scripts/test-banking-sandbox.ts` valida:

- ✅ **Configuración OAuth**: Verifica que las variables de entorno estén configuradas
- ✅ **Configuración API**: Valida que la instancia de BBVA API se pueda crear
- ✅ **Conexión a Base de Datos**: Verifica la conexión a MongoDB
- ✅ **Endpoints de Sandbox**: Documenta cómo probar endpoints (requiere tokens OAuth)
- ✅ **Sincronización de Transacciones**: Prueba la sincronización con el sandbox
- ✅ **Integridad de Datos**: Valida que las transacciones tengan todos los campos requeridos
- ✅ **Algoritmo de Matching**: Verifica que el algoritmo esté disponible

### Resultados Esperados

```
🧪 Testing Banking Sandbox Integration

✓ OAuth Configuration (5ms)
✓ BBVA API Configuration (2ms)
✓ Database Connection (150ms)
  Found 2 bank accounts in database
✓ Sandbox Endpoints (1ms)
  Note: Endpoint testing requires valid OAuth tokens
✓ Transaction Sync (250ms)
  Testing sync for account: 507f1f77bcf86cd799439011
  ✓ Synced 15 transactions
  Total transactions in database: 45
✓ Transaction Data Integrity (10ms)
  ✓ Validated 10 transactions
✓ Matching Algorithm (5ms)
  Found 5 unreconciled transactions

📊 Test Summary:
────────────────────────────────────────────────────────────
✓ OAuth Configuration (5ms)
✓ BBVA API Configuration (2ms)
✓ Database Connection (150ms)
✓ Sandbox Endpoints (1ms)
✓ Transaction Sync (250ms)
✓ Transaction Data Integrity (10ms)
✓ Matching Algorithm (5ms)
────────────────────────────────────────────────────────────
Total: 7 | Passed: 7 | Failed: 0 | Duration: 428ms
```

---

## Validación de Matching Accuracy

### Objetivo

Validar que el algoritmo de matching identifique correctamente las transacciones bancarias que corresponden a facturas específicas.

### Ejecutar Tests

```bash
# Tests unitarios con Jest
npm test -- matching-accuracy

# Script de validación con casos de prueba
npm run test:matching-accuracy
```

### Métricas Evaluadas

- **Precision**: Porcentaje de matches correctos entre todos los matches encontrados
- **Recall**: Porcentaje de matches correctos encontrados entre todos los que deberían haberse encontrado
- **F1-Score**: Media armónica de precision y recall
- **Accuracy**: Porcentaje total de predicciones correctas

### Umbrales Objetivo

- **Accuracy**: ≥ 80%
- **Precision**: ≥ 75%
- **Recall**: ≥ 75%
- **F1-Score**: ≥ 75%

### Casos de Prueba

El script incluye casos de prueba que cubren:

1. **Matches Perfectos**: Transacciones con coincidencia exacta de monto, fecha cercana y descripción que contiene número de factura
2. **Matches Parciales**: Transacciones con solo algunos factores coincidentes
3. **No Matches**: Transacciones que no deberían coincidir
4. **Casos Edge**: Montos cero, fechas faltantes, montos muy grandes

### Resultados Esperados

```
🎯 Testing Matching Algorithm Accuracy

✓ perfect-match-1: Matched (score: 1.00)
✓ perfect-match-2: Matched (score: 0.90)
✗ amount-only-match: Not matched (score: 0.50)
✓ date-only-match: Not matched (score: 0.30)
✓ no-match: Not matched (score: 0.00)

📊 Accuracy Metrics:
────────────────────────────────────────────────────────────
True Positives:  2
False Positives: 0
False Negatives: 0
True Negatives:  3
────────────────────────────────────────────────────────────
Precision: 100.00%
Recall:    100.00%
F1-Score:  100.00%
Accuracy:  100.00%
────────────────────────────────────────────────────────────
✅ Accuracy meets target (≥80%)
✅ Precision and Recall meet targets (≥75%)
```

---

## Pruebas de Performance

### Requisitos Previos

1. **Artillery**: Ya está instalado como dependencia de desarrollo
2. **Servidor en Ejecución**: El servidor Next.js debe estar corriendo en `http://localhost:3000`
3. **Autenticación**: Necesitas un token de sesión válido

### Configurar Variables

Crear archivo `.artillery.env` o exportar variables de entorno:

```bash
export AUTH_TOKEN="your_session_token"
export COMPANY_ID="your_company_id"
export BANK_ACCOUNT_ID="your_bank_account_id"
```

### Ejecutar Tests de Performance

```bash
npm run test:banking-performance
```

### Fases de Carga

El archivo `artillery/banking-performance.yml` define las siguientes fases:

1. **Warm-up** (30s): 2 requests/segundo
2. **Ramp-up** (60s): De 5 a 20 requests/segundo
3. **Sustained Load** (120s): 20 requests/segundo constante
4. **Spike Test** (30s): 50 requests/segundo (prueba de picos)
5. **Cool-down** (30s): 10 requests/segundo

### Endpoints Probados

- **List Bank Transactions** (40%): GET `/api/banking/transactions`
- **Reconciliation Suggestions** (30%): GET `/api/banking/reconciliation/suggestions`
- **Sync Transactions** (10%): POST `/api/banking/sync`
- **Export PDF** (10%): GET `/api/banking/reconciliation/export?format=pdf`
- **Export Excel** (10%): GET `/api/banking/reconciliation/export?format=excel`

### Métricas Esperadas

- **Response Time (p95)**: < 500ms para la mayoría de endpoints
- **Response Time (p99)**: < 1000ms
- **Error Rate**: < 1%
- **Throughput**: Capaz de manejar 20+ requests/segundo

### Interpretar Resultados

Artillery genera un reporte con:

- **Request Rate**: Requests por segundo procesados
- **Response Times**: p50, p95, p99
- **Error Rates**: Porcentaje de requests fallidos
- **Status Codes**: Distribución de códigos HTTP
- **Counters**: Métricas personalizadas (invalid responses, etc.)

### Ejemplo de Salida

```
Phase 1: Warm-up
  ✓ 60 requests completed in 30s (2.0 req/s)
  ✓ 0 errors

Phase 2: Ramp-up
  ✓ 750 requests completed in 60s (12.5 req/s)
  ✓ 0 errors

Phase 3: Sustained Load
  ✓ 2400 requests completed in 120s (20.0 req/s)
  ✓ 0 errors

Phase 4: Spike Test
  ✓ 1500 requests completed in 30s (50.0 req/s)
  ⚠ 5 errors (0.33%)

Summary:
  Total requests: 4710
  Successful: 4705 (99.89%)
  Failed: 5 (0.11%)
  p50: 120ms
  p95: 380ms
  p99: 650ms
```

---

## Troubleshooting

### Error: "BBVA_CLIENT_ID not set"

Asegúrate de tener las variables de entorno configuradas en `.env`.

### Error: "No active bank account with access token found"

Necesitas conectar una cuenta bancaria primero:
1. Ve a Settings > Banking
2. Conecta una cuenta usando OAuth
3. Ejecuta el sync al menos una vez

### Error: "Artillery not found"

Instala Artillery:
```bash
npm install -D artillery
```

### Performance Tests Failing

- Verifica que el servidor esté corriendo
- Aumenta los recursos del servidor si es necesario
- Revisa los logs del servidor para errores
- Considera usar una base de datos de prueba separada

---

## Próximos Pasos

1. **Automatización CI/CD**: Integrar estos tests en el pipeline CI/CD
2. **Monitoreo Continuo**: Configurar alertas basadas en métricas de performance
3. **Expansión de Casos**: Agregar más casos de prueba para edge cases
4. **Benchmarking**: Establecer benchmarks de performance y comparar con el tiempo

