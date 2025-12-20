import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';

/**
 * GET /api/public/invoices/[id] - Public access to invoice details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const invoice = await Invoice.findById(params.id)
      .populate('client')
      .populate('items.product');
      
    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    // We allow public access if the ID is known (security by obscurity in this simple MVP, 
    // real systems would use a secure hash/token)
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Public get invoice error:', error);
    return NextResponse.json(
      { error: 'Error al obtener la factura' },
      { status: 500 }
    );
  }
}
