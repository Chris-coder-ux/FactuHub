# Guía de Troubleshooting VeriFactu

## Problemas Comunes y Soluciones

### 1. Error: "Cannot find module './1682.js'" o errores de webpack
**Síntomas**: Servidor se reinicia constantemente, errores de módulos faltantes
**Causa**: Cache corrupto después de builds de producción
**Solución**:
```bash
rm -rf .next
npm run dev
```

### 2. Error: "XML not generated yet"
**Síntomas**: Botón "Enviar a AEAT" falla con este mensaje
**Causa**: Intento de envío sin generar XML primero
**Solución**:
1. Haz clic en "Generar XML" antes de "Enviar a AEAT"
2. Verifica que la factura tenga datos completos (cliente, productos)

### 3. Error: "Certificate not configured"
**Síntomas**: Operaciones VeriFactu fallan con error de certificado
**Causa**: Certificado no subido o configuración incompleta
**Solución**:
1. Ve a Settings > VeriFactu
2. Sube archivo `.p12` de FNMT
3. Configura contraseña correcta
4. Verifica que `VERIFACTU_ENABLED=true`

### 4. Error: "Connection to AEAT failed"
**Síntomas**: Envío a AEAT falla con error de conexión
**Causa**: Problemas de red, AEAT caído, o firewall bloqueando
**Solución**:
1. Verifica conexión a internet
2. Revisa status de AEAT en https://www.agenciatributaria.es
3. Espera y reintenta (cliente tiene reintentos automáticos)
4. Verifica que no haya firewall bloqueando puertos SOAP

### 5. Estado "error" o "rejected" en facturas
**Síntomas**: Factura enviada pero rechazada por AEAT
**Causa**: Datos inválidos, certificado expirado, o formato incorrecto
**Solución**:
1. Revisa mensaje de error específico en la UI
2. Valida datos de factura (NIF cliente, importes)
3. Verifica que certificado no esté expirado
4. Consulta logs del servidor para detalles técnicos

### 6. Auto-envío no funciona para facturas españolas
**Síntomas**: Facturas españolas no se procesan automáticamente
**Causa**: Configuración de auto-envío deshabilitada
**Solución**:
1. Ve a Settings > VeriFactu
2. Habilita "Auto-enviar facturas españolas"
3. Verifica que clientes tengan `country: 'ES'` y `taxId` válido

### 7. Código QR no aparece en PDF
**Síntomas**: PDF generado sin código QR VeriFactu
**Causa**: Estado VeriFactu no generado o error en generación QR
**Solución**:
1. Genera XML VeriFactu primero
2. Re-genera PDF desde el detalle de factura
3. Verifica que `qrcode` package esté instalado

### 8. Tests E2E fallan con "404 Not Found"
**Síntomas**: Cypress tests fallan al cargar páginas
**Causa**: Servidor no corriendo o rutas incorrectas
**Solución**:
1. Inicia `npm run dev` en terminal separada
2. Verifica que puerto coincida con `cypress.config.js`
3. Para tests mockeados, verifica que intercepts estén correctos

### 9. Tests de Performance muestran "ECONNREFUSED"
**Síntomas**: Artillery falla con error de conexión
**Causa**: Servidor no accesible o puerto incorrecto
**Solución**:
1. Inicia servidor: `npm run dev`
2. Verifica `target` en `artillery-verifactu.yml`
3. Para tests con auth, configura token válido en processor

### 10. Memoria alta durante testing
**Síntomas**: Sistema lento o crashes durante tests
**Causa**: Tests no optimizados o muchos escenarios paralelos
**Solución**:
1. Usa Artillery con `arrivalRate: 1`
2. Ejecuta Cypress con `--browser electron`
3. Agrega `cy.wait()` entre operaciones pesadas
4. Monitorea con `htop` y ajusta

## Configuración Avanzada

### Variables de Entorno VeriFactu
```bash
VERIFACTU_ENABLED=true
VERIFACTU_CERTIFICATE_PATH=/path/to/cert.p12
VERIFACTU_CERTIFICATE_PASSWORD=your-password
VERIFACTU_ENVIRONMENT=sandbox  # or 'production'
VERIFACTU_AUTO_SEND=true
VERIFACTU_AUTO_ENABLE_FOR_SPAIN=true
VERIFACTU_CHAIN_HASH=initial-hash
```

### Logs de Debugging
Para más detalles en errores:
1. Revisa consola del navegador (F12 > Console)
2. Revisa logs del servidor Next.js
3. Consulta `report.json` de Artillery para métricas

## Contacto y Soporte
- Documentación AEAT: https://www.agenciatributaria.es
- Certificados FNMT: https://www.fnmt.es
- Issues del proyecto: Reportar en GitHub