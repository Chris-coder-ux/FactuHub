import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { requireAuth, requireCompanyContext } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { VeriFactuXmlGenerator } from '@/lib/verifactu/xml-generator';
import { VeriFactuSigner } from '@/lib/verifactu/signer';
import { VeriFactuAeatClient } from '@/lib/verifactu/aeat-client';
import { VeriFactuCabecera } from '@/lib/verifactu/types';
import { decryptCertificatePassword, decryptAeatCredentials, isEncrypted } from '@/lib/encryption';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { cacheService, cacheTags } from '@/lib/cache';

const cancelInvoiceSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  cancellationDate: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await request.json();
    const validatedData = cancelInvoiceSchema.parse(body);

    // Require company context for multi-company support
    const { companyId } = await requireCompanyContext();

    await dbConnect();

    const invoice = await Invoice.findById(params.id).populate('client');
    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }

    // Verify invoice belongs to the company
    if (invoice.companyId && invoice.companyId.toString() !== companyId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Only allow cancellation of non-cancelled invoices
    if (invoice.status === 'cancelled') {
      return NextResponse.json({ message: 'Invoice is already cancelled' }, { status: 400 });
    }

    // Only allow cancellation of unpaid invoices
    if (invoice.status === 'paid') {
      return NextResponse.json({ message: 'Cannot cancel paid invoices' }, { status: 400 });
    }

    // Filter settings by companyId to prevent data leakage between companies
    const settings = await Settings.findOne({ companyId: toCompanyObjectId(companyId) });

    // If VeriFactu is enabled and invoice has VeriFactu data, create cancellation record
    if (settings?.verifactuEnabled && invoice.verifactuId) {
      try {
        const generator = new VeriFactuXmlGenerator(settings.verifactuChainHash || '');

        // Create cancellation record (TipoRegistro = 'A' for alta, but we need to handle cancellation)
        // For cancellations, we create a new record with TipoFactura = '14' (corrección)
        const cancellationRegistro = {
          TipoRegistro: 'A' as const,
          IdRegistro: `CANCEL-${invoice._id}-${Date.now()}`,
          NumSerieFactura: invoice.invoiceNumber,
          FechaExpedicionFactura: new Date().toISOString().split('T')[0],
          HoraExpedicionFactura: new Date().toTimeString().split(' ')[0],
          TipoFactura: '14', // Corrección/anulación
          CuotaTotal: '0.00', // Zero for cancellation
          ImporteTotal: '0.00', // Zero for cancellation
          BaseImponibleTotal: '0.00', // Zero for cancellation
          DescripcionOperacion: `Anulación factura ${invoice.invoiceNumber} - ${validatedData.reason}`,
          ContraparteNombreRazon: invoice.client.name,
          ContraparteNIF: invoice.client.taxId || '',
          ContrapartePais: 'ES',
          RefExterna: invoice.verifactuId, // Reference to original invoice
        };

        const cabecera: VeriFactuCabecera = {
          ObligadoEmision: String(settings.taxId),
          ConformeNormativa: 'S',
          Version: '1.0',
          TipoHuella: 'SHA256',
          Intercambio: 'E',
        };

        const cancellationXml = generator.generateXML([cancellationRegistro], cabecera);

        // Validate XML (skip in development)
        if (process.env.NODE_ENV === 'production') {
          const validation = await generator.validateXML(cancellationXml);
          if (!validation.isValid) {
            logger.warn('VeriFactu cancellation XML validation failed', {
              errors: validation.errors,
              invoiceId: invoice._id
            });
          }
        }

        let signedCancellationXml = cancellationXml;

        // Auto-sign if certificate is configured
        if (settings.verifactuCertificatePath && settings.verifactuCertificatePassword) {
          try {
            const signer = new VeriFactuSigner(settings.verifactuCertificatePath, settings.verifactuCertificatePassword);
            signedCancellationXml = signer.signXML(cancellationXml);
            logger.info('VeriFactu cancellation XML auto-signed successfully', { invoiceId: invoice._id });
          } catch (signError) {
            logger.error('VeriFactu cancellation auto-signing failed', { error: signError, invoiceId: invoice._id });
            // Continue without failing cancellation
          }
        }

        // Auto-send to AEAT if configured
        if (settings.verifactuAutoSend && signedCancellationXml !== cancellationXml) {
          try {
            // Decrypt AEAT credentials if needed
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

            // Validate AEAT credentials before attempting to send cancellation
            if (!aeatUsername || !aeatPassword) {
              logger.warn('AEAT credentials not configured, skipping auto-send of cancellation', { 
                companyId,
                invoiceId: invoice._id,
                hasUsername: !!aeatUsername,
                hasPassword: !!aeatPassword
              });
              // Continue without failing cancellation, but mark appropriately
              invoice.verifactuCancellationDate = new Date();
              invoice.verifactuCancellationXml = signedCancellationXml;
              // Status remains as cancelled locally but not sent to AEAT
            } else {
              // Decrypt certificate password if needed
              let certPassword = settings.verifactuCertificatePassword;
              if (isEncrypted(certPassword)) {
                certPassword = await decryptCertificatePassword(certPassword);
              }

              // Create VeriFactu config with decrypted credentials
              const verifactuConfig = {
                enabled: settings.verifactuEnabled || false,
                environment: settings.verifactuEnvironment || 'sandbox',
                certificate: {
                  path: settings.verifactuCertificatePath,
                  password: certPassword,
                },
                aeatUsername,
                aeatPassword,
                autoSend: settings.verifactuAutoSend || false,
                chainHash: settings.verifactuChainHash || '',
              };
              const aeatClient = new VeriFactuAeatClient(verifactuConfig);
              const sendResult = await aeatClient.submitXML(signedCancellationXml);

              if (sendResult.EstadoEnvio === '0') {
                logger.info('VeriFactu cancellation auto-submitted to AEAT successfully', {
                  invoiceId: invoice._id,
                  csv: sendResult.CSV
                });
              } else {
                logger.warn('VeriFactu cancellation auto-submission rejected by AEAT', {
                  invoiceId: invoice._id,
                  error: sendResult.DescripcionErrorRegistro?.[0] || 'Unknown error'
                });
              }
            }
          } catch (sendError) {
            logger.error('VeriFactu cancellation auto-send failed', { error: sendError, invoiceId: invoice._id });
          }
        }

        // Update invoice with cancellation data
        invoice.verifactuCancellationXml = signedCancellationXml;
        invoice.verifactuCancellationDate = new Date(validatedData.cancellationDate || Date.now());
        invoice.verifactuCancellationReason = validatedData.reason;

        // Update chain hash
        settings.verifactuChainHash = generator.getCurrentChainHash();
        await settings.save();

      } catch (verifactuError) {
        logger.error('VeriFactu cancellation failed', { error: verifactuError, invoiceId: invoice._id });
        // Don't fail cancellation for VeriFactu errors
      }
    }

    // Update invoice status
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancellationReason = validatedData.reason;
    await invoice.save();

    // Invalidate invoices cache after cancellation
    await cacheService.invalidateByTags([cacheTags.invoices(companyId)]).catch(err => {
      logger.warn('Failed to invalidate invoices cache', { error: err, companyId });
    });

    logger.info('Invoice cancelled successfully', {
      invoiceId: invoice._id,
      reason: validatedData.reason,
      hasVeriFactu: !!invoice.verifactuId
    });

    return NextResponse.json({
      message: 'Invoice cancelled successfully',
      invoice: {
        id: invoice._id,
        status: invoice.status,
        cancelledAt: invoice.cancelledAt,
        verifactuCancellationProcessed: !!invoice.verifactuCancellationXml
      }
    });

  } catch (error) {
    logger.error('Cancel invoice error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        message: 'Validation error',
        errors: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}