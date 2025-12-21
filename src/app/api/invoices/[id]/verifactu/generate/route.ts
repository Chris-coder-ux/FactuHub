import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { VeriFactuXmlGenerator } from '@/lib/verifactu/xml-generator';
import { VeriFactuCabecera } from '@/lib/verifactu/types';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Require company context for multi-company support
    const { companyId } = await requireCompanyContext();

    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Proforma invoices cannot be processed with VeriFactu
    if (invoice.invoiceType === 'proforma') {
      return NextResponse.json(
        { error: 'Proforma invoices cannot be processed with VeriFactu. Proforma invoices have no fiscal validity.' },
        { status: 400 }
      );
    }

    // Verify invoice belongs to the company
    if (invoice.companyId && invoice.companyId.toString() !== companyId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Filter settings by companyId to prevent data leakage between companies
    const settings = await Settings.findOne({ companyId: toCompanyObjectId(companyId) });
    if (!settings?.verifactuEnabled) {
      return NextResponse.json({ error: 'VeriFactu not enabled' }, { status: 400 });
    }

    // Generate XML
    const generator = new VeriFactuXmlGenerator(settings.verifactuChainHash);

    // Create registro alta for the invoice
    const registro = {
      TipoRegistro: 'A' as const,
      IdRegistro: `VERI-${invoice._id}`,
      NumSerieFactura: invoice.invoiceNumber,
      FechaExpedicionFactura: invoice.issuedDate.toISOString().split('T')[0],
      HoraExpedicionFactura: new Date().toTimeString().split(' ')[0],
      TipoFactura: 'F1', // Standard invoice
      CuotaTotal: invoice.tax.toFixed(2),
      ImporteTotal: invoice.total.toFixed(2),
      BaseImponibleTotal: invoice.subtotal.toFixed(2),
      DescripcionOperacion: `Factura ${invoice.invoiceNumber}`,
      ContraparteNombreRazon: invoice.client.name,
      ContraparteNIF: invoice.client.taxId || '',
      ContrapartePais: 'ES',
    };

    const cabecera: VeriFactuCabecera = {
      ObligadoEmision: String(settings.taxId),
      ConformeNormativa: 'S',
      Version: '1.0',
      TipoHuella: 'SHA256',
      Intercambio: 'E',
    };

    const xmlContent = generator.generateXML([registro], cabecera);

    // Update invoice with XML
    invoice.verifactuXml = xmlContent;
    invoice.verifactuStatus = 'pending';
    await invoice.save();

    return NextResponse.json({
      success: true,
      xml: xmlContent,
      invoiceId: invoice._id
    });

  } catch (error) {
    console.error('Error generating VeriFactu XML:', error);
    return NextResponse.json(
      { error: 'Failed to generate XML' },
      { status: 500 }
    );
  }
}