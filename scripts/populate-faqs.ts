/**
 * Populate Initial FAQs
 * 
 * This script populates the database with initial FAQ entries
 * 
 * Usage: npx tsx scripts/populate-faqs.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import mongoose from 'mongoose';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  await mongoose.connect(MONGODB_URI);
  return mongoose.connection;
}

import FAQ from '../src/lib/models/FAQ';

const initialFAQs = [
  {
    question: '¿Cómo creo mi primera factura?',
    answer: `Para crear tu primera factura:

1. Ve a la sección "Facturas" en el menú lateral
2. Haz clic en "Nueva Factura"
3. Selecciona un cliente (o créalo primero)
4. Agrega productos o servicios
5. Revisa el total y los impuestos
6. Guarda la factura

El sistema calculará automáticamente los totales, IVA y el número de factura.`,
    category: 'general',
    tags: ['factura', 'inicio', 'tutorial'],
    order: 1,
  },
  {
    question: '¿Cómo configuro VeriFactu?',
    answer: `Para configurar VeriFactu y cumplir con las normativas AEAT:

1. Obtén tu certificado digital FNMT (gratis para particulares)
2. Ve a Configuración > VeriFactu
3. Sube tu certificado .p12
4. Ingresa la contraseña del certificado
5. Selecciona el entorno (sandbox para pruebas, producción para real)
6. Guarda la configuración

Una vez configurado, puedes generar y enviar XMLs automáticamente desde el detalle de cada factura.`,
    category: 'verifactu',
    tags: ['verifactu', 'aeat', 'certificado', 'configuración'],
    order: 2,
  },
  {
    question: '¿Cómo funciona el OCR de recibos?',
    answer: `El OCR (Reconocimiento Óptico de Caracteres) extrae automáticamente datos de imágenes de recibos:

1. Sube una imagen del recibo (JPG, PNG, máximo 10MB)
2. El sistema procesa la imagen con IA
3. Extrae automáticamente:
   - Nombre del comerciante
   - Fecha de emisión
   - Importe total
   - IVA (si aplica)
   - Items individuales
4. Revisa y corrige los datos si es necesario
5. Guarda el recibo

La precisión es >90% con imágenes de buena calidad. Si el OCR falla, puedes corregir manualmente.`,
    category: 'ocr',
    tags: ['ocr', 'recibos', 'gastos', 'ia'],
    order: 3,
  },
  {
    question: '¿Puedo gestionar múltiples empresas?',
    answer: `Sí, FacturaHub soporta multi-empresa:

1. Crea múltiples empresas desde Configuración > Empresas
2. Cambia entre empresas usando el selector en la barra superior
3. Cada empresa tiene sus propios:
   - Clientes
   - Productos
   - Facturas
   - Gastos
   - Configuraciones

Los datos están completamente aislados entre empresas para garantizar la privacidad.`,
    category: 'general',
    tags: ['multi-empresa', 'empresas', 'organización'],
    order: 4,
  },
  {
    question: '¿Cómo cambio mi contraseña?',
    answer: `Para cambiar tu contraseña:

1. Ve a Configuración > Seguridad
2. Haz clic en "Cambiar Contraseña"
3. Ingresa tu contraseña actual
4. Ingresa la nueva contraseña (mínimo 8 caracteres)
5. Confirma la nueva contraseña
6. Guarda los cambios

Recomendamos usar una contraseña fuerte y única.`,
    category: 'general',
    tags: ['contraseña', 'seguridad', 'cuenta'],
    order: 5,
  },
  {
    question: '¿Qué hago si VeriFactu falla al enviar?',
    answer: `Si VeriFactu falla al enviar una factura:

1. Verifica que tu certificado digital esté vigente
2. Revisa que la factura tenga todos los datos requeridos
3. Verifica tu conexión a internet
4. Revisa los logs en la consola del navegador (F12)
5. Intenta nuevamente desde el detalle de la factura

Si el problema persiste:
- Verifica que el certificado no haya expirado
- Asegúrate de estar en el entorno correcto (sandbox/producción)
- Contacta a soporte con el número de ticket de error`,
    category: 'verifactu',
    tags: ['verifactu', 'error', 'troubleshooting', 'aeat'],
    order: 6,
  },
  {
    question: '¿Cómo activo la autenticación de dos factores (MFA)?',
    answer: `Para activar MFA y aumentar la seguridad de tu cuenta:

1. Ve a Configuración > Seguridad
2. Haz clic en "Activar Autenticación de Dos Factores"
3. Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.)
4. Ingresa el código de verificación de 6 dígitos
5. Guarda los códigos de respaldo en un lugar seguro
6. Confirma la activación

A partir de ese momento, necesitarás tu contraseña y el código MFA para iniciar sesión.`,
    category: 'technical',
    tags: ['mfa', 'seguridad', 'autenticación', '2fa'],
    order: 7,
  },
  {
    question: '¿Puedo exportar mis datos?',
    answer: `Sí, puedes exportar todos tus datos en cualquier momento:

1. Ve a Configuración > Privacidad
2. Haz clic en "Exportar mis Datos"
3. Recibirás un email con un archivo JSON que contiene:
   - Información de tu cuenta
   - Todas tus facturas
   - Clientes y productos
   - Gastos y recibos
   - Configuraciones

El proceso puede tardar unos minutos dependiendo del volumen de datos. Esto cumple con el derecho de portabilidad de datos del GDPR.`,
    category: 'general',
    tags: ['exportar', 'datos', 'gdpr', 'privacidad'],
    order: 8,
  },
  {
    question: '¿Hay límite de facturas que puedo crear?',
    answer: `No, no hay límite de facturas en ningún plan. Puedes crear tantas facturas como necesites.

Los límites del plan se aplican a:
- Número de usuarios
- Almacenamiento de archivos
- Funcionalidades avanzadas (OCR, VeriFactu, etc.)

Consulta la página de precios para ver los detalles de cada plan.`,
    category: 'billing',
    tags: ['facturas', 'límites', 'planes', 'precios'],
    order: 9,
  },
  {
    question: '¿Cómo cancelo una factura?',
    answer: `Para cancelar una factura:

1. Ve a la lista de facturas
2. Abre el detalle de la factura que quieres cancelar
3. Haz clic en "Cancelar Factura"
4. Confirma la acción

Nota: Una factura cancelada se mantiene en el historial pero no se puede editar ni enviar. Si necesitas corregir una factura, es mejor crear una nueva factura rectificativa.`,
    category: 'general',
    tags: ['factura', 'cancelar', 'historial'],
    order: 10,
  },
];

async function populateFAQs() {
  try {
    console.log('🔄 Starting FAQ population...\n');
    await connectDB();

    let created = 0;
    let skipped = 0;

    for (const faqData of initialFAQs) {
      const existing = await FAQ.findOne({ question: faqData.question });
      if (existing) {
        console.log(`⏭️  Skipping: "${faqData.question}" (already exists)`);
        skipped++;
        continue;
      }

      const faq = new FAQ(faqData);
      await faq.save();
      console.log(`✅ Created: "${faqData.question}"`);
      created++;
    }

    console.log(`\n✅ FAQ population completed!`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Total: ${await FAQ.countDocuments()}`);

  } catch (error) {
    console.error('❌ FAQ population failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

if (require.main === module) {
  populateFAQs()
    .then(() => {
      console.log('\n✨ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export default populateFAQs;

