import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import { requireAuth } from '@/lib/auth';
import jsPDF from 'jspdf';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    await dbConnect();
    
    const invoice = await Invoice.findById(params.id)
      .populate('client', 'name email phone address')
      .populate('items.product', 'name price tax');
    
    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }

    // Generate PDF
    const doc = new jsPDF();
    
    // Add custom font for better Unicode support
    doc.addFont('/fonts/Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
    
    // Header
    doc.setFontSize(20);
    doc.text('Invoice', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 35);
    doc.text(`Date: ${new Date(invoice.issuedDate).toLocaleDateString()}`, 20, 45);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, 55);
    
    // Client Information
    doc.setFontSize(14);
    doc.text('Bill To:', 20, 75);
    doc.setFontSize(12);
    doc.text(invoice.client.name, 20, 85);
    doc.text(invoice.client.email, 20, 95);
    if (invoice.client.phone) {
      doc.text(invoice.client.phone, 20, 105);
    }
    
    if (invoice.client.address) {
      const address = invoice.client.address;
      let addressLine = '';
      if (address.street) addressLine += address.street + ', ';
      if (address.city) addressLine += address.city + ', ';
      if (address.state) addressLine += address.state + ' ';
      if (address.zipCode) addressLine += address.zipCode;
      if (addressLine) {
        doc.text(addressLine, 20, 115);
      }
    }
    
    // Table Headers
    let yPosition = 140;
    doc.setFontSize(12);
    doc.text('Description', 20, yPosition);
    doc.text('Quantity', 80, yPosition);
    doc.text('Price', 120, yPosition);
    doc.text('Tax', 150, yPosition);
    doc.text('Total', 180, yPosition);
    
    // Line
    doc.line(20, yPosition + 5, 190, yPosition + 5);
    yPosition += 15;
    
    // Invoice Items
    invoice.items.forEach((item: { product: { name: string }, quantity: number, price: number, tax: number, total: number }) => {
      doc.text(item.product.name, 20, yPosition);
      doc.text(item.quantity.toString(), 80, yPosition);
      doc.text(`$${item.price.toFixed(2)}`, 120, yPosition);
      doc.text(`$${item.tax.toFixed(2)}`, 150, yPosition);
      doc.text(`$${item.total.toFixed(2)}`, 180, yPosition);
      yPosition += 10;
    });
    
    // Totals
    yPosition += 10;
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 150, yPosition);
    yPosition += 10;
    doc.text(`Tax: $${invoice.tax.toFixed(2)}`, 150, yPosition);
    yPosition += 10;
    doc.setFontSize(14);
    doc.text(`Total: $${invoice.total.toFixed(2)}`, 150, yPosition);
    
    // Notes
    if (invoice.notes) {
      yPosition += 20;
      doc.setFontSize(12);
      doc.text('Notes:', 20, yPosition);
      yPosition += 10;
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 20, yPosition);
    }
    
    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
    
  } catch (error) {
    console.error('Generate PDF error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
