import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { VeriFactuAeatClient } from '@/lib/verifactu/aeat-client';
import { decryptCertificatePassword, decryptAeatCredentials, isEncrypted } from '@/lib/encryption';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';

export async function GET(
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

    // Verify invoice belongs to the company
    if (invoice.companyId && invoice.companyId.toString() !== companyId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.verifactuId) {
      return NextResponse.json({ error: 'Invoice not sent to AEAT yet' }, { status: 400 });
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
      // Password comes from settings, not hardcoded
      aeatPassword = settings.aeatPassword || '';
    }

    // Validate AEAT credentials before attempting to check status
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

    // Check status with AEAT
    const client = new VeriFactuAeatClient(verifactuConfig);

    const response = await client.checkStatus(invoice.verifactuId);

    // Update invoice if status changed
    if (response.EstadoEnvio === '0') {
      invoice.verifactuStatus = 'verified';
      invoice.verifactuVerifiedAt = new Date();
    } else if (response.EstadoEnvio === '1') {
      invoice.verifactuStatus = 'rejected';
      invoice.verifactuErrorMessage = response.DescripcionErrorRegistro?.join(', ') || 'Rejected by AEAT';
    }
    await invoice.save();

    return NextResponse.json({
      status: invoice.verifactuStatus,
      response,
      invoiceId: invoice._id
    });

  } catch (error) {
    console.error('Error checking AEAT status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}