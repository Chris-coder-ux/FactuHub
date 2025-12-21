# Guía de Usuario - FacturaHub

## 📖 Bienvenido a FacturaHub

FacturaHub es una plataforma completa de facturación diseñada para empresas españolas. Esta guía te ayudará a aprovechar al máximo todas las funcionalidades disponibles.

## 🚀 Inicio Rápido

### 1. Crear una Cuenta

1. Visita la página de registro
2. Completa el formulario con:
   - Nombre completo
   - Email
   - Contraseña (mínimo 8 caracteres)
3. Verifica tu email (si está habilitado)
4. Inicia sesión

### 2. Configurar tu Empresa

1. Ve a **Configuración > Empresa**
2. Completa la información:
   - Nombre de la empresa
   - NIF/CIF
   - Dirección completa
   - Datos de contacto
3. Guarda los cambios

### 3. Crear tu Primera Factura

1. Ve a **Facturas > Nueva Factura**
2. Selecciona un cliente (o créalo primero)
3. Agrega productos/servicios
4. Revisa el total y los impuestos
5. Guarda la factura

## 📋 Funcionalidades Principales

### Gestión de Clientes

#### Crear un Cliente

1. Ve a **Clientes > Nuevo Cliente**
2. Completa:
   - Nombre completo o razón social
   - Email
   - Teléfono
   - Dirección
   - NIF/CIF
3. Guarda

#### Editar o Eliminar

- **Editar**: Haz clic en el cliente y luego en "Editar"
- **Eliminar**: Haz clic en "Eliminar" (se marca como eliminado, no se borra)

### Gestión de Productos

#### Crear un Producto

1. Ve a **Productos > Nuevo Producto**
2. Completa:
   - Nombre
   - Descripción (opcional)
   - Precio unitario
   - IVA (%)
   - Categoría (opcional)
3. Guarda

#### Productos Compartidos

Los productos pueden ser:
- **Privados**: Solo para tu empresa
- **Compartidos**: Para todas las empresas del grupo (si aplica)

### Facturación

#### Crear una Factura

1. **Información Básica**:
   - Selecciona cliente
   - Fecha de emisión
   - Fecha de vencimiento (opcional)
   - Número de factura (auto-generado)

2. **Agregar Items**:
   - Busca o crea productos
   - Especifica cantidad
   - El sistema calcula automáticamente:
     - Subtotal
     - IVA
     - Total

3. **Opciones Adicionales**:
   - Notas internas
   - Notas para el cliente
   - Descuentos

4. **Guardar y Enviar**:
   - Guarda como borrador
   - Envía por email
   - Genera PDF

#### Estados de Factura

- **Borrador**: En edición
- **Enviada**: Enviada al cliente
- **Pagada**: Marcada como pagada
- **Vencida**: Pasó la fecha de vencimiento
- **Cancelada**: Cancelada

#### VeriFactu (Cumplimiento AEAT)

Si tu empresa está en España:

1. **Configuración Inicial**:
   - Ve a **Configuración > VeriFactu**
   - Sube tu certificado digital FNMT
   - Configura contraseña del certificado
   - Selecciona entorno (sandbox/producción)

2. **Generar XML**:
   - En el detalle de la factura
   - Haz clic en "Generar XML VeriFactu"
   - El sistema genera el XML automáticamente

3. **Enviar a AEAT**:
   - Haz clic en "Enviar a AEAT"
   - El sistema firma y envía automáticamente
   - Verás el estado en tiempo real

4. **Estados VeriFactu**:
   - **Pendiente**: XML generado, esperando envío
   - **Enviado**: Enviado a AEAT
   - **Verificado**: Aceptado por AEAT
   - **Error**: Problema en el envío

### Recibos y Gastos

#### Subir un Recibo

1. Ve a **Gastos > Recibos**
2. Haz clic en "Subir Recibo"
3. Selecciona imagen (JPG, PNG, máximo 10MB)
4. El sistema procesa automáticamente con OCR:
   - Extrae comerciante
   - Extrae fecha
   - Extrae total
   - Extrae IVA

5. **Revisar y Corregir**:
   - Revisa los datos extraídos
   - Corrige si es necesario
   - Guarda

#### Crear un Gasto

1. Ve a **Gastos > Nuevo Gasto**
2. Completa:
   - Descripción
   - Categoría
   - Importe
   - IVA
   - Fecha
   - Recibo asociado (opcional)
3. Guarda

### Reportes y Análisis

#### Dashboard Principal

El dashboard muestra:
- **Ingresos del mes**: Total facturado
- **Facturas pendientes**: Facturas sin pagar
- **Gastos del mes**: Total de gastos
- **Beneficio neto**: Ingresos - Gastos

#### Gráficos

- **Ingresos por período**: Línea temporal
- **Gastos por categoría**: Gráfico de pastel
- **Tendencias**: Comparación mes a mes

#### Exportar Datos

1. Ve a **Reportes**
2. Selecciona período
3. Haz clic en "Exportar"
4. Elige formato (PDF, Excel, CSV)

### Conciliación Bancaria

#### Conectar Cuenta Bancaria

1. Ve a **Bancario > Cuentas**
2. Haz clic en "Conectar Cuenta"
3. Selecciona banco
4. Autoriza la conexión
5. El sistema sincroniza transacciones automáticamente

#### Conciliar Transacciones

1. Ve a **Bancario > Conciliación**
2. El sistema muestra:
   - Transacciones bancarias
   - Facturas pagadas
   - Gastos registrados
3. Haz clic en "Conciliar Automáticamente"
4. Revisa las coincidencias
5. Confirma o corrige manualmente

### Configuración

#### Configuración de Empresa

- **Datos básicos**: Nombre, NIF, dirección
- **Contacto**: Email, teléfono
- **Branding**: Logo, colores (próximamente)

#### Configuración de Facturación

- **Moneda**: EUR (por defecto)
- **IVA por defecto**: 21% (configurable)
- **Formato de número**: Auto-incremental
- **Plantillas**: Personaliza emails y PDFs

#### VeriFactu

- **Certificado digital**: Sube y configura
- **Entorno**: Sandbox (pruebas) o Producción
- **Auto-envío**: Enviar automáticamente al crear facturas

#### Seguridad

- **Autenticación de dos factores (MFA)**: Activa para mayor seguridad
- **Códigos de respaldo**: Guarda en lugar seguro
- **Sesiones activas**: Revisa y cierra sesiones

## 🔒 Seguridad y Privacidad

### Autenticación de Dos Factores (MFA)

1. Ve a **Configuración > Seguridad**
2. Haz clic en "Activar MFA"
3. Escanea el código QR con tu app de autenticación (Google Authenticator, Authy)
4. Ingresa el código de verificación
5. Guarda los códigos de respaldo

### Gestión de Datos Personales (GDPR)

#### Acceder a tus Datos

1. Ve a **Configuración > Privacidad**
2. Haz clic en "Exportar mis Datos"
3. Recibirás un email con todos tus datos en JSON

#### Rectificar Datos

1. Ve a **Configuración > Privacidad**
2. Haz clic en "Solicitar Rectificación"
3. Completa el formulario
4. El equipo revisará tu solicitud

#### Eliminar Cuenta

1. Ve a **Configuración > Privacidad**
2. Haz clic en "Eliminar mi Cuenta"
3. Confirma la acción
4. **⚠️ ADVERTENCIA**: Esta acción no se puede deshacer

## 💡 Consejos y Mejores Prácticas

### Organización

- **Usa categorías**: Organiza productos y gastos por categorías
- **Etiquetas**: Usa etiquetas para búsquedas rápidas
- **Plantillas**: Crea plantillas para facturas recurrentes

### Facturación

- **Numera correctamente**: El sistema auto-numera, pero puedes personalizar
- **Fechas claras**: Usa fechas de vencimiento para seguimiento
- **Notas útiles**: Agrega notas para contexto futuro

### VeriFactu

- **Prueba primero**: Usa sandbox antes de producción
- **Certificados actualizados**: Renueva certificados antes de expirar
- **Revisa estados**: Verifica que las facturas se envían correctamente

### Gastos

- **Sube recibos**: El OCR extrae datos automáticamente
- **Revisa extracciones**: Corrige errores del OCR
- **Categoriza**: Organiza gastos por categorías para reportes

## ❓ Preguntas Frecuentes (FAQ)

### ¿Cómo cambio mi contraseña?

Ve a **Configuración > Seguridad > Cambiar Contraseña**

### ¿Puedo tener múltiples empresas?

Sí, puedes crear múltiples empresas y cambiar entre ellas desde el menú superior.

### ¿Cómo cancelo una factura?

En el detalle de la factura, haz clic en "Cancelar". La factura se marca como cancelada pero se mantiene en el historial.

### ¿Qué hago si VeriFactu falla?

1. Verifica que el certificado esté vigente
2. Revisa los logs en la consola del navegador
3. Contacta a soporte si el problema persiste

### ¿Puedo exportar todas mis facturas?

Sí, ve a **Reportes > Exportar** y selecciona el formato deseado.

### ¿Cómo funciona el OCR de recibos?

El sistema usa IA para extraer datos de imágenes de recibos. La precisión es >90% con imágenes de buena calidad.

### ¿Puedo personalizar las facturas?

Sí, puedes personalizar:
- Logo de empresa
- Colores (próximamente)
- Plantillas de email
- Formato de PDF

## 🆘 Soporte

### Contactar Soporte

- **Email**: support@facturahub.com
- **Chat en vivo**: Disponible en la aplicación (próximamente)
- **Documentación**: https://docs.facturahub.com

### Reportar un Problema

1. Ve a **Ayuda > Reportar Problema**
2. Describe el problema detalladamente
3. Incluye capturas de pantalla si es posible
4. El equipo te responderá en 24-48 horas

## 📚 Recursos Adicionales

- **Video Tutoriales**: https://youtube.com/facturahub
- **Blog**: https://blog.facturahub.com
- **API Documentation**: https://api.facturahub.com/docs
- **Changelog**: https://facturahub.com/changelog

---

**Última actualización**: Diciembre 2024

