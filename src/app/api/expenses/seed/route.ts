import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

/**
 * POST /api/expenses/seed - Create a test expense
 * Temporary endpoint for creating test data
 */
export async function POST(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await connectDB();

    // Create test expense
    const testExpense = new Expense({
      userId: session.user.id,
      companyId: toCompanyObjectId(companyId),
      category: 'office',
      amount: 150.50,
      taxAmount: 31.61, // 21% IVA
      date: new Date(),
      description: 'Material de oficina - Papelería y suministros',
      vendor: 'Papelería Central',
      notes: 'Gasto de prueba para verificar funcionalidades',
      status: 'pending', // Estado pendiente para que aparezca la notificación
      tags: ['oficina', 'prueba'],
    });

    await testExpense.save();

    logger.info('Test expense created', {
      expenseId: testExpense._id,
      companyId,
      userId: session.user.id,
    });

    return NextResponse.json({
      message: 'Gasto de prueba creado exitosamente',
      expense: {
        _id: testExpense._id,
        description: testExpense.description,
        amount: testExpense.amount,
        taxAmount: testExpense.taxAmount,
        status: testExpense.status,
        category: testExpense.category,
      },
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Error creating test expense', error);
    
    if (error.message?.includes('Company context required') || 
        error.message?.includes('No company found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al crear gasto de prueba',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

