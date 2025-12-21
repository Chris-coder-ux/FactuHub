import { Invoice, Client } from '@/types';
import { logger } from '@/lib/logger';

/**
 * Service to handle automated notifications
 */
export const notificationService = {
  /**
   * Send overdue notification to a client
   */
  async sendOverdueNotification(invoice: Invoice, client: Client) {
    logger.info(`Sending overdue notification for invoice ${invoice.invoiceNumber} to ${client.email}`);
    
    // Simulate email sending (in production, use SendGrid or similar)
    logger.info('Email notification (simulated)', {
      to: client.email,
      subject: `Factura Vencida: ${invoice.invoiceNumber}`,
      invoiceNumber: invoice.invoiceNumber
    });

    // In a real app, you would use Nodemailer, SendGrid, Twilio, etc.
    return true;
  },

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(invoice: Invoice, client: Client) {
    logger.info(`Sending payment confirmation for invoice ${invoice.invoiceNumber} to ${client.email}`);
    
    // Simulate email sending (in production, use SendGrid or similar)
    logger.info('Payment confirmation email (simulated)', {
      to: client.email,
      subject: `Confirmación de Pago: ${invoice.invoiceNumber}`,
      invoiceNumber: invoice.invoiceNumber
    });

    return true;
  }
};
