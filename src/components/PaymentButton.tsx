'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface PaymentButtonProps {
  invoiceId: string;
  amount: number;
}

export default function PaymentButton({ invoiceId, amount }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Simular procesamiento de pago
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, amount }),
      });

      if (response.ok) {
        const { paymentId } = await response.json();
        logger.info('Payment initiated', { paymentId, invoiceId });
        alert('Pago procesado correctamente');
      } else {
        throw new Error('Error al procesar el pago');
      }
    } catch (error) {
      logger.error('Payment processing error', { error, invoiceId, amount });
      alert('Error al procesar el pago');
    }

    setLoading(false);
  };

  return (
    <Button onClick={handlePayment} disabled={loading}>
      {loading ? 'Procesando...' : `Pagar $${amount}`}
    </Button>
  );
}