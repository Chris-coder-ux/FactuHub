import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { VeriFactuSigner } from '@/lib/verifactu/signer';
import { decryptCertificatePassword, isEncrypted } from '@/lib/encryption';
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

    // Proforma invoices cannot be signed for VeriFactu
    if (invoice.invoiceType === 'proforma') {
      return NextResponse.json(
        { error: 'Proforma invoices cannot be signed for VeriFactu. Proforma invoices have no fiscal validity.' },
        { status: 400 }
      );
    }

    // Verify invoice belongs to the company
    if (invoice.companyId && invoice.companyId.toString() !== companyId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.verifactuXml) {
      return NextResponse.json({ error: 'XML not generated yet' }, { status: 400 });
    }

    // Filter settings by companyId to prevent data leakage between companies
    const settings = await Settings.findOne({ companyId: toCompanyObjectId(companyId) });
    if (!settings?.verifactuCertificatePath || !settings.verifactuCertificatePassword) {
      return NextResponse.json({ error: 'Certificate not configured' }, { status: 400 });
    }

    // Decrypt certificate password if encrypted
    let certificatePassword = settings.verifactuCertificatePassword;
    if (isEncrypted(certificatePassword)) {
      certificatePassword = await decryptCertificatePassword(certificatePassword);
    }

    // Sign the XML
    const signer = new VeriFactuSigner(
      settings.verifactuCertificatePath,
      certificatePassword
    );

    const signedXml = signer.signXML(invoice.verifactuXml);

    // Update invoice with signature
    invoice.verifactuSignature = signedXml;
    await invoice.save();

    return NextResponse.json({
      success: true,
      signedXml,
      invoiceId: invoice._id
    });

  } catch (error) {
    console.error('Error signing VeriFactu XML:', error);
    return NextResponse.json(
      { error: 'Failed to sign XML' },
      { status: 500 }
    );
  }
}