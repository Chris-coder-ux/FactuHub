import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { VeriFactuAeatClient } from '@/lib/verifactu/aeat-client';
import { decryptCertificatePassword, decryptAeatCredentials, isEncrypted } from '@/lib/encryption';
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

    // Proforma invoices cannot be sent to VeriFactu
    if (invoice.invoiceType === 'proforma') {
      return NextResponse.json(
        { error: 'Proforma invoices cannot be sent to VeriFactu. Proforma invoices have no fiscal validity.' },
        { status: 400 }
      );
    }

    // Verify invoice belongs to the company
    if (invoice.companyId && invoice.companyId.toString() !== companyId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.verifactuSignature) {
      return NextResponse.json({ error: 'XML not signed yet' }, { status: 400 });
    }

    // Filter settings by companyId to prevent data leakage between companies
    const settings = await Settings.findOne({ companyId: toCompanyObjectId(companyId) });
    if (!settings?.verifactuCertificatePath || !settings.verifactuCertificatePassword) {
      return NextResponse.json({ error: 'VeriFactu certificate not configured' }, { status: 400 });
    }

    // Decrypt certificate password if encrypted
    let certificatePassword = settings.verifactuCertificatePassword;
    if (isEncrypted(certificatePassword)) {
      certificatePassword = await decryptCertificatePassword(certificatePassword);
    }

    // Decrypt AEAT credentials if present and encrypted
    let aeatUsername = '';
    let aeatPassword = '';
    if (settings.aeatUsername && isEncrypted(settings.aeatUsername)) {
      const credentials = await decryptAeatCredentials(settings.aeatUsername, settings.aeatPassword || '');
      aeatUsername = credentials.username;
      aeatPassword = credentials.password;
    } else if (settings.aeatUsername) {
      aeatUsername = settings.aeatUsername;
      aeatPassword = settings.aeatPassword || '';
    }

    // Validate AEAT credentials before attempting to send
    if (!aeatUsername || !aeatPassword) {
      return NextResponse.json(
        { error: 'AEAT credentials not configured. Please configure username and password in settings.' },
        { status: 400 }
      );
    }

    // Create VeriFactu config
    const verifactuConfig = {
      enabled: settings.verifactuEnabled || false,
      environment: settings.verifactuEnvironment || 'sandbox',
      certificate: {
        path: settings.verifactuCertificatePath,
        password: certificatePassword,
      },
      aeatUsername, // Decrypted if needed
      aeatPassword, // Decrypted if needed
      autoSend: settings.verifactuAutoSend || false,
      chainHash: settings.verifactuChainHash || '',
    };

    // Send to AEAT
    const client = new VeriFactuAeatClient(verifactuConfig);

    const response = await client.submitXML(invoice.verifactuSignature);

    // Update invoice status
    invoice.verifactuStatus = response.EstadoEnvio === '0' ? 'sent' : 'error';
    invoice.verifactuSentAt = new Date();
    if (response.CSV) {
      invoice.verifactuId = response.CSV; // Store CSV for status checking
    }
    if (response.EstadoEnvio !== '0') {
      invoice.verifactuErrorMessage = response.DescripcionErrorRegistro?.join(', ') || 'Unknown error';
    }
    await invoice.save();

    return NextResponse.json({
      success: response.EstadoEnvio === '0',
      response,
      invoiceId: invoice._id
    });

  } catch (error) {
    console.error('Error sending to AEAT:', error);
    return NextResponse.json(
      { error: 'Failed to send to AEAT' },
      { status: 500 }
    );
  }
}