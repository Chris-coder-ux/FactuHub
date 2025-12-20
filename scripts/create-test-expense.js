/**
 * Script para crear un gasto de prueba
 * Uso: node scripts/create-test-expense.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Importar modelos
const Expense = require('../src/lib/models/Expense').default;
const User = require('../src/lib/models/User').default;
const Company = require('../src/lib/models/Company').default;

async function createTestExpense() {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI no está definida en .env.local');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Obtener el primer usuario y su primera empresa
    const user = await User.findOne();
    if (!user) {
      throw new Error('No se encontró ningún usuario. Crea un usuario primero.');
    }

    console.log(`📋 Usuario encontrado: ${user.email}`);

    // Buscar una empresa del usuario
    const company = await Company.findOne({ 
      $or: [
        { ownerId: user._id },
        { 'members.userId': user._id }
      ]
    });

    if (!company) {
      throw new Error('No se encontró ninguna empresa para el usuario. Crea una empresa primero.');
    }

    console.log(`🏢 Empresa encontrada: ${company.name}`);

    // Crear gasto de prueba
    const testExpense = new Expense({
      userId: user._id,
      companyId: company._id,
      category: 'office',
      amount: 150.50,
      taxAmount: 31.61, // 21% IVA
      date: new Date(),
      description: 'Material de oficina - Papelería y suministros',
      vendor: 'Papelería Central',
      notes: 'Gasto de prueba para verificar funcionalidades',
      status: 'pending', // Estado pendiente para que aparezca la notificación
    });

    await testExpense.save();
    console.log('✅ Gasto de prueba creado exitosamente:');
    console.log(`   - ID: ${testExpense._id}`);
    console.log(`   - Descripción: ${testExpense.description}`);
    console.log(`   - Importe: ${testExpense.amount} €`);
    console.log(`   - IVA: ${testExpense.taxAmount} €`);
    console.log(`   - Estado: ${testExpense.status}`);
    console.log(`   - Categoría: ${testExpense.category}`);

    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
    
    return testExpense;
  } catch (error) {
    console.error('❌ Error al crear gasto de prueba:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTestExpense();
}

module.exports = { createTestExpense };

