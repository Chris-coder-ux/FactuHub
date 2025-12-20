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
    
    // Simulate email sending
    console.log(`
      TO: ${client.email}
      SUBJECT: Factura Vencida: ${invoice.invoiceNumber}
      BODY:
      Hola ${client.name},
      Te informamos que la factura ${invoice.invoiceNumber} con importe de ${invoice.total}€ ha vencido el día ${invoice.dueDate}.
      Por favor, realiza el pago lo antes posible.
      
      Atentamente,
      Facturaly Support
    `);

    // In a real app, you would use Nodemailer, SendGrid, Twilio, etc.
    return true;
  },

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(invoice: Invoice, client: Client) {
    logger.info(`Sending payment confirmation for invoice ${invoice.invoiceNumber} to ${client.email}`);
    
    console.log(`
      TO: ${client.email}
      SUBJECT: Confirmación de Pago: ${invoice.invoiceNumber}
      BODY:
      Hola ${client.name},
      Hemos recibido tu pago de ${invoice.total}€ para la factura ${invoice.invoiceNumber}.
      Gracias por tu preferencia.
      
      Atentamente,
      Facturaly
    `);

    return true;
  }
};
