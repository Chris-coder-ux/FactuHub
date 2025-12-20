import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import { requireAuth } from '@/lib/auth';
import sgMail from '@sendgrid/mail';
import { env } from '@/lib/env';

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY is not configured. Email sending will not work.');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    await dbConnect();
    
    const invoice = await Invoice.findById(params.id)
      .populate('client')
      .populate('items.product');
    
    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }

    // Generate PDF URL
    const pdfUrl = `${process.env.NEXTAUTH_URL}/api/invoices/${params.id}/pdf`;

    // Create email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Invoice ${invoice.invoiceNumber}</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0;"><strong>Bill To:</strong></p>
            <p style="margin: 0 0 5px 0;">${invoice.client.name}</p>
            <p style="margin: 0 0 5px 0;">${invoice.client.email}</p>
            ${invoice.client.phone ? `<p style="margin: 0 0 5px 0;">${invoice.client.phone}</p>` : ''}
            ${invoice.client.address?.street ? `<p style="margin: 0 0 5px 0;">${invoice.client.address.street}</p>` : ''}
            ${invoice.client.address?.city ? `<p style="margin: 0 0 5px 0;">${invoice.client.address.city}, ${invoice.client.address?.state || ''} ${invoice.client.address?.zipCode || ''}</p>` : ''}
          </div>
          
           <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
             <p style="margin: 0 0 10px 0;"><strong>Invoice Details:</strong></p>
             <p style="margin: 0 0 5px 0;">Invoice Number: ${invoice.invoiceNumber}</p>
             <p style="margin: 0 0 5px 0;">Issue Date: ${new Date(invoice.issuedDate).toLocaleDateString()}</p>
             <p style="margin: 0 0 5px 0;">Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
             <p style="margin: 0 0 5px 0;">Status: <span style="color: ${invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'orange'};">${invoice.status.toUpperCase()}</span></p>
           </div>

           ${invoice.verifactuStatus ? `
           <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
             <p style="margin: 0 0 10px 0;"><strong>📋 Cumplimiento VeriFactu (AEAT):</strong></p>
             <p style="margin: 0 0 5px 0;">Estado: <span style="color: ${invoice.verifactuStatus === 'verified' ? 'green' : invoice.verifactuStatus === 'error' || invoice.verifactuStatus === 'rejected' ? 'red' : 'orange'};">${invoice.verifactuStatus.toUpperCase()}</span></p>
             ${invoice.verifactuId ? `<p style="margin: 0 0 5px 0;">ID VeriFactu (CSV): <code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px;">${invoice.verifactuId}</code></p>` : ''}
             ${invoice.verifactuSentAt ? `<p style="margin: 0 0 5px 0;">Enviado a AEAT: ${new Date(invoice.verifactuSentAt).toLocaleString('es-ES')}</p>` : ''}
             ${invoice.verifactuVerifiedAt ? `<p style="margin: 0 0 5px 0;">Verificado por AEAT: ${new Date(invoice.verifactuVerifiedAt).toLocaleString('es-ES')}</p>` : ''}
             ${invoice.verifactuErrorMessage ? `<p style="margin: 0 0 5px 0; color: red;">Error: ${invoice.verifactuErrorMessage}</p>` : ''}
             <p style="margin: 5px 0 0 0; font-size: 12px; color: #6c757d;">
               Esta factura cumple con la normativa VeriFactu de la Agencia Tributaria Española.
             </p>
           </div>
           ` : ''}
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0;"><strong>Amount Due:</strong></p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">$${invoice.total.toFixed(2)}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${pdfUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Download Invoice PDF
            </a>
          </div>
          
          ${invoice.notes ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0 0 10px 0;"><strong>Notes:</strong></p>
            <p style="margin: 0;">${invoice.notes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              This invoice was sent from our invoicing system. If you have any questions, please contact us.
            </p>
          </div>
        </div>
      </div>
    `;

    // Generate PDF content
    const pdfResponse = await fetch(pdfUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    const msg = {
      to: invoice.client.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourcompany.com',
      subject: `Invoice ${invoice.invoiceNumber}`,
      html: emailHtml,
      attachments: [
        {
          filename: `invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBase64,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    await sgMail.send(msg);

    return NextResponse.json({ message: 'Invoice sent successfully' });
    
  } catch (error) {
    console.error('Send invoice email error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
