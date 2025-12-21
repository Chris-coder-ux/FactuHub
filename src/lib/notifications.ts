import { Invoice, Client } from '@/types';
import { logger } from '@/lib/logger';
import { emailService } from './services/email-service';

/**
 * Service to handle automated notifications
 */
export const notificationService = {
  /**
   * Send overdue notification to a client
   */
  async sendOverdueNotification(invoice: Invoice, client: Client, companyId: string) {
    if (!invoice.companyId && !companyId) {
      logger.warn('Company ID required for sending overdue notification');
      return false;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #dc3545; margin-bottom: 20px;">Factura Vencida</h2>
          <p>Hola ${client.name},</p>
          <p>Te informamos que la factura <strong>${invoice.invoiceNumber}</strong> está vencida.</p>
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Número de Factura:</strong> ${invoice.invoiceNumber}</p>
            <p style="margin: 5px 0;"><strong>Fecha de Vencimiento:</strong> ${new Date(invoice.dueDate).toLocaleDateString('es-ES')}</p>
            <p style="margin: 5px 0;"><strong>Importe Total:</strong> ${invoice.total.toFixed(2)} €</p>
          </div>
          <p>Por favor, realiza el pago lo antes posible para evitar cargos adicionales.</p>
          <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
            Si ya realizaste el pago, puedes ignorar este mensaje.
          </p>
        </div>
      </div>
    `;

    const result = await emailService.sendEmail({
      to: client.email,
      subject: `Factura Vencida: ${invoice.invoiceNumber}`,
      html,
      companyId: companyId || invoice.companyId || '',
      type: 'overdue',
      metadata: {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: client._id,
      },
    });

    return result.success;
  },

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(invoice: Invoice, client: Client, companyId: string) {
    if (!invoice.companyId && !companyId) {
      logger.warn('Company ID required for sending payment confirmation');
      return false;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #28a745; margin-bottom: 20px;">Confirmación de Pago</h2>
          <p>Hola ${client.name},</p>
          <p>Confirmamos que hemos recibido el pago de la factura <strong>${invoice.invoiceNumber}</strong>.</p>
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Número de Factura:</strong> ${invoice.invoiceNumber}</p>
            <p style="margin: 5px 0;"><strong>Importe Pagado:</strong> ${invoice.total.toFixed(2)} €</p>
            <p style="margin: 5px 0;"><strong>Fecha de Pago:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
          </div>
          <p>¡Gracias por tu pago!</p>
          <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
            Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
        </div>
      </div>
    `;

    const result = await emailService.sendEmail({
      to: client.email,
      subject: `Confirmación de Pago: ${invoice.invoiceNumber}`,
      html,
      companyId: companyId || invoice.companyId || '',
      type: 'payment',
      metadata: {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: client._id,
      },
    });

    return result.success;
  }
};
