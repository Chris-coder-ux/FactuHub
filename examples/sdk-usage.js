/**
 * Ejemplos de uso del SDK de AppTrabajo
 * Node.js / Browser compatible
 * 
 * Este archivo contiene ejemplos funcionales del SDK.
 * Para ejecutar, descomenta las llamadas al final del archivo.
 */

/* eslint-disable no-undef, no-unused-vars, no-console */

// IMPORTANTE: Para usar el SDK real, instala y descomenta una de estas opciones:

// Opción 1: Para Node.js/CommonJS
// npm install @apptrabajo/sdk
// const AppTrabajoSDK = require('@apptrabajo/sdk');

// Opción 2: Para ES Modules/TypeScript
// npm install @apptrabajo/sdk
// import AppTrabajoSDK from '@apptrabajo/sdk';

// Opción 3: Para navegador (CDN)
// <script src="https://cdn.apptrabajo.com/sdk/v1.0.0/apptrabajo-sdk.min.js"></script>
// const AppTrabajoSDK = window.AppTrabajoSDK;

// ----------------------------
// CONFIGURACIÓN INICIAL
// ----------------------------

// Crear instancia del SDK (usando mock para demostración)
// Para usar el SDK real, reemplaza con la configuración real
const createMockSDK = () => {
  return {
    register: async (data) => {
      console.log('📝 Register llamado con:', data);
      return { id: 'user_123', email: data.email, token: 'mock-jwt-token' };
    },
    getCompanies: async () => {
      console.log('🏢 getCompanies llamado');
      return { companies: [{ _id: 'comp_123', name: 'Mi Empresa' }] };
    },
    createCompany: async (data) => {
      console.log('🏢 createCompany llamado con:', data);
      return { _id: 'comp_' + Date.now(), ...data };
    },
    switchCompany: async (companyId) => {
      console.log('🔄 switchCompany llamado con:', companyId);
      return { success: true, activeCompany: companyId };
    },
    getClients: async (options = {}) => {
      console.log('👥 getClients llamado con:', options);
      return { 
        data: [
          { _id: 'client_123', name: 'Cliente Ejemplo', email: 'cliente@example.com' }
        ],
        total: 1,
        page: options.page || 1,
        limit: options.limit || 10
      };
    },
    createClient: async (data) => {
      console.log('👥 createClient llamado con:', data);
      return { _id: 'client_' + Date.now(), ...data };
    },
    updateClient: async (id, data) => {
      console.log('✏️ updateClient llamado con:', id, data);
      return { _id: id, ...data, updated: true };
    },
    getProducts: async () => {
      console.log('📦 getProducts llamado');
      return {
        data: [
          { _id: 'prod_123', name: 'Producto A', price: 100, tax: 21 }
        ]
      };
    },
    createInvoice: async (data) => {
      console.log('🧾 createInvoice llamado con:', data);
      const total = data.items.reduce((sum, item) => sum + (item.price * item.quantity * (1 + item.tax/100)), 0);
      return {
        _id: 'inv_' + Date.now(),
        ...data,
        total,
        invoiceNumber: 'INV-' + Date.now(),
        status: 'draft',
        createdAt: new Date().toISOString()
      };
    },
    sendInvoice: async (invoiceId) => {
      console.log('📧 sendInvoice llamado con:', invoiceId);
      return { success: true, message: 'Factura enviada' };
    },
    getInvoicePDF: async (invoiceId) => {
      console.log('📄 getInvoicePDF llamado con:', invoiceId);
      return new Blob(['PDF simulado'], { type: 'application/pdf' });
    },
    generateVeriFactuXML: async (invoiceId) => {
      console.log('📄 generateVeriFactuXML llamado con:', invoiceId);
      return { hash: 'xml_hash_' + Date.now(), xml: '<factura></factura>' };
    },
    signVeriFactuXML: async (invoiceId) => {
      console.log('✍️ signVeriFactuXML llamado con:', invoiceId);
      return { success: true, signed: true };
    },
    sendVeriFactuToAEAT: async (invoiceId) => {
      console.log('📤 sendVeriFactuToAEAT llamado con:', invoiceId);
      return { success: true, aeatCode: 'AEAT-' + Date.now() };
    },
    getVeriFactuStatus: async (invoiceId) => {
      console.log('🔍 getVeriFactuStatus llamado con:', invoiceId);
      return { status: 'sent', lastUpdate: new Date().toISOString() };
    },
    getAnalytics: async (filters) => {
      console.log('📊 getAnalytics llamado con:', filters);
      return {
        clientProfitability: [{ client: 'Cliente A', profit: 5000 }],
        productProfitability: [{ product: 'Producto A', profit: 3000 }],
        cashFlow: { income: 10000, expenses: 3000, net: 7000 },
        trends: { growth: 15, churn: 2 },
        summary: { totalRevenue: 100000, activeClients: 25 }
      };
    },
    getReports: async () => {
      console.log('📈 getReports llamado');
      return {
        totalRevenue: 100000,
        pendingRevenue: 25000,
        paidInvoices: 75,
        pendingInvoices: 10
      };
    }
  };
};

// Instancia del SDK (cambiar por el real cuando esté disponible)
const sdk = createMockSDK();

// ----------------------------
// FUNCIONES DE EJEMPLO
// ----------------------------

/**
 * Ejemplo 1: Configuración básica del SDK
 */
function setupSDK() {
  console.log('\n=== Configuración del SDK ===');
  
  // Configuración para desarrollo
  const devConfig = {
    baseUrl: 'http://localhost:3000',
    accessToken: 'tu-token-jwt',
    timeout: 30000,
    debug: true
  };
  
  // Configuración para producción
  const prodConfig = {
    baseUrl: 'https://api.apptrabajo.com',
    accessToken: 'tu-token-jwt',
    timeout: 30000,
    debug: false
  };
  
  console.log('Configuración desarrollo:', devConfig);
  console.log('Configuración producción:', prodConfig);
}

/**
 * Ejemplo 2: Registrar nuevo usuario
 */
async function registerUser() {
  console.log('\n=== Registro de Usuario ===');
  
  try {
    const userData = {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'PasswordSeguro123!',
      companyName: 'Empresa de Juan',
      phone: '+34123456789'
    };
    
    console.log('Registrando usuario:', userData.email);
    const result = await sdk.register(userData);
    
    console.log('✅ Usuario registrado exitosamente:');
    console.log('   ID:', result.id);
    console.log('   Email:', result.email);
    console.log('   Token recibido:', result.token?.substring(0, 20) + '...');
    
    return result;
  } catch (error) {
    console.error('❌ Error al registrar usuario:');
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    console.error('   Detalles:', error.details);
    throw error;
  }
}

/**
 * Ejemplo 3: Gestión de empresas
 */
async function manageCompanies() {
  console.log('\n=== Gestión de Empresas ===');
  
  try {
    // 1. Obtener lista de empresas
    console.log('📋 Obteniendo empresas...');
    const companiesResult = await sdk.getCompanies();
    console.log(`   Total empresas: ${companiesResult.companies.length}`);
    
    // 2. Crear nueva empresa (si no hay ninguna)
    if (companiesResult.companies.length === 0) {
      console.log('🏢 Creando nueva empresa...');
      const newCompany = await sdk.createCompany({
        name: 'Mi Empresa SL',
        taxId: 'B12345678',
        legalName: 'Mi Empresa Sociedad Limitada',
        email: 'info@miempresa.es',
        phone: '+34911223344',
        address: {
          street: 'Calle Principal 123',
          city: 'Madrid',
          state: 'Madrid',
          zipCode: '28001',
          country: 'España'
        },
        website: 'https://miempresa.es',
        industry: 'Tecnología'
      });
      
      console.log('✅ Empresa creada:');
      console.log('   ID:', newCompany._id);
      console.log('   Nombre:', newCompany.name);
      console.log('   NIF:', newCompany.taxId);
      
      companiesResult.companies.push(newCompany);
    }
    
    // 3. Cambiar empresa activa
    const firstCompany = companiesResult.companies[0];
    if (firstCompany) {
      console.log('🔄 Cambiando a empresa activa:', firstCompany.name);
      await sdk.switchCompany(firstCompany._id);
      console.log('✅ Empresa activa cambiada');
    }
    
    return companiesResult.companies;
  } catch (error) {
    console.error('❌ Error en gestión de empresas:', error.message);
    throw error;
  }
}

/**
 * Ejemplo 4: CRUD de clientes
 */
async function manageClients() {
  console.log('\n=== Gestión de Clientes ===');
  
  try {
    // 1. Listar clientes con paginación
    console.log('📋 Listando clientes...');
    const clients = await sdk.getClients({ 
      page: 1, 
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc'
    });
    
    console.log(`   Clientes encontrados: ${clients.data.length}`);
    console.log(`   Total registros: ${clients.total}`);
    console.log(`   Página ${clients.page} de ${Math.ceil(clients.total / clients.limit)}`);
    
    // 2. Crear nuevo cliente si no hay suficientes
    if (clients.data.length < 3) {
      console.log('👥 Creando nuevo cliente...');
      const newClientData = {
        name: 'Cliente Corporativo SL',
        email: 'cliente@corporativo.es',
        phone: '+34987654321',
        address: {
          street: 'Avenida Central 456',
          city: 'Barcelona',
          state: 'Cataluña',
          zipCode: '08001',
          country: 'España'
        },
        taxId: 'A87654321',
        contactPerson: 'Ana García',
        website: 'https://corporativo.es',
        notes: 'Cliente preferente'
      };
      
      const newClient = await sdk.createClient(newClientData);
      console.log('✅ Cliente creado:', newClient.name);
      clients.data.push(newClient);
    }
    
    // 3. Actualizar cliente existente
    if (clients.data.length > 0) {
      const clientToUpdate = clients.data[0];
      console.log('✏️ Actualizando cliente:', clientToUpdate.name);
      
      const updatedClient = await sdk.updateClient(clientToUpdate._id, {
        phone: '+34900112233',
        notes: 'Teléfono actualizado - ' + new Date().toLocaleDateString()
      });
      
      console.log('✅ Cliente actualizado:');
      console.log('   Nuevo teléfono:', updatedClient.phone);
      console.log('   Notas:', updatedClient.notes);
    }
    
    return clients.data;
  } catch (error) {
    console.error('❌ Error en gestión de clientes:', error.message);
    throw error;
  }
}

/**
 * Ejemplo 5: Crear factura completa
 */
async function createInvoice() {
  console.log('\n=== Creación de Factura ===');
  
  try {
    // 1. Obtener datos necesarios
    console.log('📋 Obteniendo datos...');
    const [clients, products] = await Promise.all([
      sdk.getClients({ limit: 1 }),
      sdk.getProducts()
    ]);
    
    if (clients.data.length === 0) {
      throw new Error('No hay clientes disponibles. Crea un cliente primero.');
    }
    
    if (products.data.length === 0) {
      throw new Error('No hay productos disponibles. Crea un producto primero.');
    }
    
    const client = clients.data[0];
    const product = products.data[0];
    
    console.log('   Cliente:', client.name);
    console.log('   Producto:', product.name);
    
    // 2. Calcular items de la factura
    const items = [
      {
        product: product._id,
        name: product.name,
        description: 'Servicio profesional',
        quantity: 2,
        price: product.price,
        tax: product.tax,
        discount: 0,
        total: product.price * 2 * (1 + product.tax / 100)
      },
      {
        product: product._id,
        name: `${product.name} - Adicional`,
        description: 'Servicio adicional',
        quantity: 1,
        price: 50,
        tax: 21,
        discount: 10, // 10% descuento
        total: 50 * 0.9 * 1.21
      }
    ];
    
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxes = items.reduce((sum, item) => sum + (item.price * item.quantity * item.tax / 100), 0);
    const total = subtotal + taxes;
    
    // 3. Crear factura
    console.log('🧾 Creando factura...');
    const invoice = await sdk.createInvoice({
      client: client._id,
      items: items,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      invoiceType: 'invoice',
      paymentMethod: 'transfer',
      currency: 'EUR',
      language: 'es',
      notes: 'Factura generada automáticamente desde el SDK\nGracias por su confianza',
      terms: 'Pago en 30 días\nSin intereses de mora',
      
      // Totales calculados
      subtotal: subtotal,
      taxAmount: taxes,
      total: total,
      paidAmount: 0,
      status: 'draft'
    });
    
    console.log('✅ Factura creada:');
    console.log('   Número:', invoice.invoiceNumber);
    console.log('   Cliente:', client.name);
    console.log('   Total:', invoice.total?.toFixed(2), '€');
    console.log('   Estado:', invoice.status);
    
    // 4. Enviar factura por email (simulado)
    console.log('📧 Enviando factura por email...');
    await sdk.sendInvoice(invoice._id);
    console.log('✅ Factura enviada');
    
    // 5. Generar PDF (simulado)
    console.log('📄 Generando PDF...');
    const pdfBlob = await sdk.getInvoicePDF(invoice._id);
    console.log('✅ PDF generado:', pdfBlob.size, 'bytes');
    
    return invoice;
  } catch (error) {
    console.error('❌ Error creando factura:', error.message);
    throw error;
  }
}

/**
 * Ejemplo 6: Proceso completo VeriFactu
 */
async function veriFactuProcess() {
  console.log('\n=== Proceso VeriFactu ===');
  
  try {
    // 1. Crear una factura primero (en un caso real ya existiría)
    console.log('1️⃣ Creando factura para VeriFactu...');
    const invoice = await createInvoice();
    
    if (!invoice || !invoice._id) {
      throw new Error('No se pudo crear la factura para VeriFactu');
    }
    
    console.log('   Factura ID:', invoice._id);
    
    // 2. Generar XML de VeriFactu
    console.log('2️⃣ Generando XML...');
    const xmlResult = await sdk.generateVeriFactuXML(invoice._id);
    console.log('   XML generado con hash:', xmlResult.hash);
    
    // 3. Firmar XML (requiere certificado digital)
    console.log('3️⃣ Firmando XML...');
    const signingResult = await sdk.signVeriFactuXML(invoice._id);
    console.log('   Firmado:', signingResult.signed ? '✅' : '❌');
    
    // 4. Enviar a AEAT
    console.log('4️⃣ Enviando a AEAT...');
    const aeatResult = await sdk.sendVeriFactuToAEAT(invoice._id);
    console.log('   Envío AEAT:', aeatResult.success ? '✅' : '❌');
    console.log('   Código AEAT:', aeatResult.aeatCode);
    
    // 5. Consultar estado periódicamente
    console.log('5️⃣ Consultando estado...');
    const status = await sdk.getVeriFactuStatus(invoice._id);
    console.log('   Estado:', status.status);
    console.log('   Última actualización:', new Date(status.lastUpdate).toLocaleString());
    
    return {
      invoiceId: invoice._id,
      xmlHash: xmlResult.hash,
      aeatCode: aeatResult.aeatCode,
      status: status.status
    };
  } catch (error) {
    console.error('❌ Error en proceso VeriFactu:', error.message);
    
    // Manejo específico de errores VeriFactu
    if (error.message.includes('certificado')) {
      console.error('   Verifica que el certificado digital esté instalado correctamente');
    } else if (error.message.includes('AEAT')) {
      console.error('   Error de conexión con AEAT. Intenta nuevamente más tarde');
    } else if (error.message.includes('XML')) {
      console.error('   Error en el formato XML. Revisa los datos de la factura');
    }
    
    throw error;
  }
}

/**
 * Ejemplo 7: Analytics y reportes
 */
async function getAnalytics() {
  console.log('\n=== Analytics y Reportes ===');
  
  try {
    // Definir periodo de análisis
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const filters = {
      startDate: firstDayOfMonth.toISOString().split('T')[0],
      endDate: lastDayOfMonth.toISOString().split('T')[0],
      companyId: 'current',
      groupBy: 'day'
    };
    
    console.log('📊 Obteniendo analytics para:', filters.startDate, 'a', filters.endDate);
    
    // 1. Analytics detallados
    const analytics = await sdk.getAnalytics(filters);
    
    console.log('\n📈 Rentabilidad por cliente:');
    analytics.clientProfitability?.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.client}: ${item.profit?.toFixed(2)}€`);
    });
    
    console.log('\n📦 Rentabilidad por producto:');
    analytics.productProfitability?.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.product}: ${item.profit?.toFixed(2)}€`);
    });
    
    console.log('\n💰 Cash Flow:');
    console.log('   Ingresos:', analytics.cashFlow?.income?.toFixed(2), '€');
    console.log('   Gastos:', analytics.cashFlow?.expenses?.toFixed(2), '€');
    console.log('   Neto:', analytics.cashFlow?.net?.toFixed(2), '€');
    
    console.log('\n📊 Tendencias:');
    console.log('   Crecimiento:', analytics.trends?.growth, '%');
    console.log('   Churn rate:', analytics.trends?.churn, '%');
    
    console.log('\n🎯 Resumen:');
    console.log('   Ingresos totales:', analytics.summary?.totalRevenue?.toFixed(2), '€');
    console.log('   Clientes activos:', analytics.summary?.activeClients);
    
    // 2. Reportes básicos
    console.log('\n📋 Reportes básicos:');
    const reports = await sdk.getReports();
    console.log('   Ingresos totales:', reports.totalRevenue?.toFixed(2), '€');
    console.log('   Ingresos pendientes:', reports.pendingRevenue?.toFixed(2), '€');
    console.log('   Facturas pagadas:', reports.paidInvoices);
    console.log('   Facturas pendientes:', reports.pendingInvoices);
    
    return { analytics, reports };
  } catch (error) {
    console.error('❌ Error obteniendo analytics:', error.message);
    throw error;
  }
}

/**
 * Ejemplo 8: Manejo avanzado de errores
 */
async function errorHandling() {
  console.log('\n=== Manejo de Errores ===');
  
  // Escenarios comunes de error
  const errorScenarios = [
    {
      name: 'Error 401 - No autorizado',
      test: async () => {
        try {
          // Simular error de autenticación
          console.log('🔐 Probando autenticación...');
          throw { 
            code: 401, 
            message: 'No autorizado - Token inválido o expirado',
            details: { hint: 'Renueva tu token de acceso' }
          };
        } catch (error) {
          handleError(error);
        }
      }
    },
    {
      name: 'Error 404 - Recurso no encontrado',
      test: async () => {
        try {
          console.log('🔍 Buscando recurso inexistente...');
          throw {
            code: 404,
            message: 'Cliente no encontrado',
            details: { clientId: 'inexistente' }
          };
        } catch (error) {
          handleError(error);
        }
      }
    },
    {
      name: 'Error 429 - Límite de tasa excedido',
      test: async () => {
        try {
          console.log('⚡ Probando límite de tasa...');
          throw {
            code: 429,
            message: 'Límite de solicitudes excedido',
            details: { 
              limit: 100,
              remaining: 0,
              resetAt: new Date(Date.now() + 3600000).toISOString()
            }
          };
        } catch (error) {
          handleError(error);
        }
      }
    },
    {
      name: 'Error 422 - Validación fallida',
      test: async () => {
        try {
          console.log('📝 Probando validación...');
          throw {
            code: 422,
            message: 'Error de validación',
            details: {
              errors: [
                { field: 'email', message: 'Email inválido' },
                { field: 'taxId', message: 'NIF incorrecto' }
              ]
            }
          };
        } catch (error) {
          handleError(error);
        }
      }
    }
  ];
  
  // Función para manejar errores consistentemente
  function handleError(error) {
    console.log(`\n❌ ${error.code}: ${error.message}`);
    
    if (error.details) {
      console.log('   Detalles:', error.details);
    }
    
    // Estrategias de recuperación según el tipo de error
    switch (error.code) {
      case 401:
        console.log('   Acción: Renovar token de acceso');
        // En una app real: refreshToken() o redirigir a login
        break;
      case 404:
        console.log('   Acción: Verificar ID del recurso');
        break;
      case 429:
        console.log('   Acción: Esperar antes de reintentar');
        const resetTime = error.details?.resetAt;
        if (resetTime) {
          console.log(`   Puedes reintentar después: ${new Date(resetTime).toLocaleTimeString()}`);
        }
        break;
      case 422:
        console.log('   Acción: Corregir datos del formulario');
        error.details?.errors?.forEach(err => {
          console.log(`   - ${err.field}: ${err.message}`);
        });
        break;
      default:
        console.log('   Acción: Contactar con soporte');
    }
  }
  
  // Ejecutar todos los escenarios de error
  for (const scenario of errorScenarios) {
    console.log(`\n--- ${scenario.name} ---`);
    await scenario.test();
  }
  
  // Ejemplo de reintento automático
  console.log('\n🔄 Ejemplo de reintento automático:');
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`   Intento ${attempts}/${maxAttempts}...`);
      
      if (attempts < maxAttempts) {
        throw { code: 503, message: 'Servicio temporalmente no disponible' };
      }
      
      console.log('   ✅ Operación exitosa');
      break;
    } catch (error) {
      if (attempts === maxAttempts) {
        console.log(`   ❌ Fallo después de ${maxAttempts} intentos`);
        console.log('   Considera implementar:');
        console.log('     • Backoff exponencial');
        console.log('     • Circuit breaker pattern');
        console.log('     • Queue de reintentos');
      } else {
        const delay = Math.pow(2, attempts) * 1000; // Backoff exponencial
        console.log(`   ⏸️ Esperando ${delay}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

/**
 * Ejemplo 9: Flujo completo de trabajo
 */
async function completeWorkflow() {
  console.log('\n=== Flujo Completo de Trabajo ===');
  
  try {
    console.log('🚀 Iniciando flujo completo...\n');
    
    // 1. Configuración
    setupSDK();
    
    // 2. Gestión de empresas
    const companies = await manageCompanies();
    
    // 3. Gestión de clientes
    const clients = await manageClients();
    
    // 4. Crear factura
    const invoice = await createInvoice();
    
    // 5. Proceso VeriFactu
    const veriFactuResult = await veriFactuProcess();
    
    // 6. Analytics
    const analytics = await getAnalytics();
    
    console.log('\n🎉 Flujo completado exitosamente!');
    console.log('📊 Resumen del flujo:');
    console.log(`   • Empresas gestionadas: ${companies.length}`);
    console.log(`   • Clientes gestionados: ${clients.length}`);
    console.log(`   • Factura creada: ${invoice.invoiceNumber}`);
    console.log(`   • VeriFactu enviado: ${veriFactuResult.aeatCode}`);
    
    return {
      companies,
      clients,
      invoice,
      veriFactuResult,
      analytics
    };
  } catch (error) {
    console.error('\n💥 Error en el flujo completo:', error.message);
    console.error('   Implementa rollback o compensación según sea necesario');
    throw error;
  }
}

// ----------------------------
// EJECUCIÓN DE EJEMPLOS
// ----------------------------

/**
 * Ejecuta un ejemplo específico
 * @param {string} exampleName - Nombre del ejemplo a ejecutar
 */
async function runExample(exampleName) {
  const examples = {
    setup: () => setupSDK(),
    register: () => registerUser(),
    companies: () => manageCompanies(),
    clients: () => manageClients(),
    invoice: () => createInvoice(),
    verifactu: () => veriFactuProcess(),
    analytics: () => getAnalytics(),
    errors: () => errorHandling(),
    workflow: () => completeWorkflow(),
    all: async () => {
      await setupSDK();
      await manageCompanies();
      await manageClients();
      await createInvoice();
      await veriFactuProcess();
      await getAnalytics();
      await errorHandling();
    }
  };
  
  if (examples[exampleName]) {
    console.log(`\n▶️ Ejecutando ejemplo: ${exampleName.toUpperCase()}`);
    console.log('='.repeat(50));
    await examples[exampleName]();
    console.log('='.repeat(50));
  } else {
    console.error(`❌ Ejemplo "${exampleName}" no encontrado. Opciones disponibles:`);
    console.log(Object.keys(examples).map(key => `  - ${key}`).join('\n'));
  }
}

// ----------------------------
// INSTRUCCIONES DE USO
// ----------------------------

console.log(`
📚 EJEMPLOS DEL SDK APP TRABAJO
================================

Para ejecutar un ejemplo, descomenta la línea correspondiente abajo.

Ejemplos disponibles:
  1. setup      - Configuración básica
  2. register   - Registro de usuario
  3. companies  - Gestión de empresas
  4. clients    - Gestión de clientes
  5. invoice    - Creación de factura
  6. verifactu  - Proceso VeriFactu completo
  7. analytics  - Analytics y reportes
  8. errors     - Manejo de errores
  9. workflow   - Flujo completo de trabajo
  10. all       - Todos los ejemplos (excepto workflow)

Instrucciones:
  1. Instala el SDK: npm install @apptrabajo/sdk
  2. Reemplaza createMockSDK() con el SDK real
  3. Configura tu token de acceso
  4. Ejecuta el ejemplo deseado
`);

// ----------------------------
// DESCOMENTA PARA EJECUTAR
// ----------------------------

// Ejecutar un ejemplo específico:
// runExample('setup');
// runExample('register');
// runExample('companies');
// runExample('clients');
// runExample('invoice');
// runExample('verifactu');
// runExample('analytics');
// runExample('errors');
// runExample('workflow');

// O ejecutar todos secuencialmente:
// runExample('all');

// ----------------------------
// EXPORTACIONES PARA MÓDULOS
// ----------------------------

// Para uso en entornos de módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runExample,
    setupSDK,
    registerUser,
    manageCompanies,
    manageClients,
    createInvoice,
    veriFactuProcess,
    getAnalytics,
    errorHandling,
    completeWorkflow,
    sdk: createMockSDK() // Exporta el mock para pruebas
  };
}

// Para uso en navegador
if (typeof window !== 'undefined') {
  window.AppTrabajoExamples = {
    runExample,
    setupSDK,
    registerUser,
    manageCompanies,
    manageClients,
    createInvoice,
    veriFactuProcess,
    getAnalytics,
    errorHandling,
    completeWorkflow
  };
}