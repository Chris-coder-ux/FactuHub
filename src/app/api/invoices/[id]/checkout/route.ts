import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    // 1. Get Invoice
    const invoice = await Invoice.findById(params.id).populate('client');
    if (!invoice) {
       return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    // Verify invoice has companyId
    if (!invoice.companyId) {
      return NextResponse.json({ error: 'Factura no válida' }, { status: 400 });
    }

    // 2. Get Stripe Settings - Filter by companyId to prevent data leakage
    const settings = await Settings.findOne({ companyId: invoice.companyId });
    if (!settings || !settings.stripeEnabled || !settings.stripeSecretKey) {
      return NextResponse.json({ error: 'El pago online no está habilitado' }, { status: 400 });
    }

    const stripe = new Stripe(settings.stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: settings.currency.toLowerCase(),
            product_data: {
              name: `Factura ${invoice.invoiceNumber}`,
              description: `Pago de factura emitida el ${new Date(invoice.issuedDate || Date.now()).toLocaleDateString()}`,
            },
            unit_amount: Math.round(invoice.total * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/invoices/${invoice._id}/payment-success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/invoices/${invoice._id}`,
      metadata: {
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
      },
      customer_email: invoice.client?.email,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe session error:', error);
    return NextResponse.json(
      { error: 'Error al crear la sesión de pago' },
      { status: 500 }
    );
  }
}
