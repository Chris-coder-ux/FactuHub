import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { notificationService } from '@/lib/notifications';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';

async function getStripeClient(companyId?: string) {
  await dbConnect();
  
  // If companyId is provided, filter by it to prevent data leakage
  const filter = companyId ? { companyId: toCompanyObjectId(companyId) } : {};
  const settings = await Settings.findOne(filter);
  
  if (!settings?.stripeSecretKey) {
    throw new Error('Stripe not configured');
  }

  return new Stripe(settings.stripeSecretKey, {
    apiVersion: '2023-10-16' as any,
  });
}

const constructStripeEvent = (stripe: Stripe, body: string, signature: string): Stripe.Event => {
  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET missing, parsing JSON manually for dev/test.');
      return JSON.parse(body);
    }
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
};

const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session) => {
  const invoiceId = session.metadata?.invoiceId;

  if (invoiceId) {
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      { status: 'paid', paidAt: new Date() },
      { new: true }
    ).populate('client');

    if (invoice) {
        console.log(`Invoice ${invoice.invoiceNumber} marked as PAID via Stripe`);
        if (invoice.client) {
            await notificationService.sendPaymentConfirmation(invoice, invoice.client);
        }
        // Return companyId for use in getStripeClient if needed
        return invoice.companyId?.toString();
    }
  }
  return undefined;
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  try {
    // First, try to get companyId from the invoice if available
    let companyId: string | undefined;
    try {
      const eventData = JSON.parse(body);
      if (eventData.type === 'checkout.session.completed' && eventData.data?.object?.metadata?.invoiceId) {
        const invoice = await Invoice.findById(eventData.data.object.metadata.invoiceId);
        companyId = invoice?.companyId?.toString();
      }
    } catch {
      // If parsing fails, continue without companyId (will use first available settings)
    }

    const stripe = await getStripeClient(companyId);
    const event = constructStripeEvent(stripe, body, signature);

    if (event.type === 'checkout.session.completed') {
      const invoiceCompanyId = await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      // If we got companyId from invoice, we could use it for future operations
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing failed:', error.message);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 400 } // Use 400 for bad requests (like signature failure)
    );
  }
}

// Next.js 14 App Router config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
