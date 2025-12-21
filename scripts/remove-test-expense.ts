/**
 * Script para eliminar el gasto de prueba "Material de oficina"
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no está definido en las variables de entorno');
  process.exit(1);
}

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Conectado a MongoDB');
    }
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

interface IExpense extends mongoose.Document {
  description: string;
  category: string;
  companyId: mongoose.Types.ObjectId;
}

const ExpenseSchema = new mongoose.Schema({
  description: String,
  category: String,
  companyId: mongoose.Types.ObjectId,
}, { collection: 'expenses' });

const Expense = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

async function removeTestExpense() {
  try {
    await connectDB();

    // Buscar gastos que contengan "Material de oficina" o variaciones
    const searchPatterns = [
      /material de oficina/i,
      /Material de oficina/i,
      /material.*oficina/i,
    ];

    let deletedCount = 0;

    for (const pattern of searchPatterns) {
      const expenses = await Expense.find({
        description: { $regex: pattern }
      });

      if (expenses.length > 0) {
        console.log(`\n📋 Encontrados ${expenses.length} gasto(s) con patrón: ${pattern}`);
        
        for (const expense of expenses) {
          console.log(`  - ID: ${expense._id}`);
          console.log(`    Descripción: ${expense.description}`);
          console.log(`    Categoría: ${expense.category}`);
          
          await Expense.deleteOne({ _id: expense._id });
          deletedCount++;
          console.log(`    ✅ Eliminado`);
        }
      }
    }

    if (deletedCount === 0) {
      console.log('\n⚠️  No se encontraron gastos con "Material de oficina"');
      console.log('   Verificando todos los gastos de categoría "office"...\n');
      
      const officeExpenses = await Expense.find({ category: 'office' });
      console.log(`   Encontrados ${officeExpenses.length} gasto(s) de categoría "office":`);
      
      officeExpenses.forEach((expense, index) => {
        console.log(`   ${index + 1}. ${expense.description} (ID: ${expense._id})`);
      });
    } else {
      console.log(`\n✅ Total eliminados: ${deletedCount} gasto(s)`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar el script
removeTestExpense();

