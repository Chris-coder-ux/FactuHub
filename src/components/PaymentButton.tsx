'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

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
        console.log('Pago iniciado con ID:', paymentId);
        alert('Pago procesado correctamente');
      } else {
        throw new Error('Error al procesar el pago');
      }
    } catch (error) {
      console.error('Error al procesar el pago:', error);
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