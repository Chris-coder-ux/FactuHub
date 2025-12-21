'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InvoiceFinancialSummaryProps {
  subtotal: number;
  totalTax: number;
  total: number;
  lastSaved?: string | null;
}

export function InvoiceFinancialSummary({
  subtotal,
  totalTax,
  total,
  lastSaved
}: InvoiceFinancialSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen Financiero</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Impuestos:</span>
          <span>${totalTax.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span className="text-primary">${total.toFixed(2)}</span>
        </div>
        {lastSaved && (
          <div className="text-xs text-muted-foreground mt-2">
            Último guardado: {lastSaved}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

