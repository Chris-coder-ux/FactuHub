import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Payment from '@/lib/models/Payment';
import { requireAuth } from '@/lib/auth';
import { env, isStripeConfigured } from '@/lib/env';

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured. Please add it to your .env.local file.');
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { invoiceId, amount } = body;

    if (!invoiceId || !amount) {
      return NextResponse.json({ message: 'Invoice ID and amount are required' }, { status: 400 });
    }

    await dbConnect();
    
    const invoice = await Invoice.findById(invoiceId).populate('client');
    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        invoiceId: invoiceId.toString(),
      },
    });

    const payment = new Payment({
      invoice: invoiceId,
      amount,
      method: 'stripe',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
    });

    await payment.save();

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
