'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Invoice, Settings } from '@/types';
import { Card, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Building2, 
  User,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';

export default function PublicInvoicePage() {
  const params = useParams();
  const { data: invoice, error: invoiceError } = useSWR<Invoice>(`/api/public/invoices/${params.id}`, fetcher);
  const { data: settings } = useSWR<{ data: Settings }>('/api/settings', fetcher);
  
  const [isPaying, setIsPaying] = useState(false);
  
  // Use invoice actions hook for PDF download
  const { downloadPDF, isDownloadingPDF } = useInvoiceActions();

  if (invoiceError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-2xl mb-2">Factura no encontrada</CardTitle>
          <p className="text-muted-foreground">El enlace es inválido o la factura ha sido eliminada.</p>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handlePayment = async () => {
    setIsPaying(true);
    try {
      const response = await fetch(`/api/invoices/${invoice._id}/checkout`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.url) {
        globalThis.location.href = data.url;
      } else {
        throw new Error(data.error || 'Error al iniciar el pago');
      }
    } catch (err) {
      console.error(err);
      alert('Error al procesar el pago. Por favor, inténtelo de nuevo.');
    } finally {
      setIsPaying(false);
    }
  };

  const statusInfo = {
    draft: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Borrador' },
    sent: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Pendiente' },
    paid: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Pagada' },
    overdue: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Vencida' },
    cancelled: { color: 'bg-slate-100 text-slate-700', icon: XCircle, label: 'Anulada' }
  };

  const status = (statusInfo as any)[invoice.status] || statusInfo.sent;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Badge className={`${status.color} border-none px-3 py-1 rounded-full flex items-center gap-1.5 font-medium`}>
              <status.icon className="h-3.5 w-3.5" />
              {status.label}
            </Badge>
            {invoice.status === 'paid' && (
              <span className="text-sm text-muted-foreground italic">
                Pagada el {format(new Date(invoice.updatedAt || Date.now()), 'dd/MM/yyyy')}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadPDF(invoice, settings?.data || null)}
              disabled={isDownloadingPDF}
            >
              <Download className="mr-2 h-4 w-4" /> 
              {isDownloadingPDF ? 'Descargando...' : 'PDF'}
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-xl overflow-hidden">
          {/* Header Graphic */}
          <div className="h-2 bg-primary" />
          
          <CardContent className="p-8 sm:p-12 space-y-12">
            {/* Logo & Company Info */}
            <div className="flex flex-col sm:flex-row justify-between gap-8">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center">
                  <Building2 className="text-white h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{settings?.data.companyName || 'Empresa Emisora'}</h2>
                  <p className="text-sm text-muted-foreground">{settings?.data.email}</p>
                  <p className="text-sm text-muted-foreground">NIF: {settings?.data.taxId}</p>
                </div>
              </div>
              <div className="text-right space-y-1">
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                  {invoice.invoiceType === 'proforma' ? 'Factura Proforma' : 'Factura'}
                </h1>
                <p className="text-xl font-medium text-primary">{invoice.invoiceNumber}</p>
                {invoice.invoiceType === 'proforma' && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 mt-2">
                    PROFORMA - Sin validez fiscal
                  </Badge>
                )}
              </div>
            </div>

            {/* Client & Date Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
              <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                <h3 className="font-semibold text-slate-500 uppercase tracking-wider text-xs flex items-center gap-2">
                  <User className="h-3.5 w-3.5" /> Facturado a
                </h3>
                <div>
                  <p className="font-bold text-lg text-slate-900">{invoice.client.name}</p>
                  <p className="text-slate-600">{invoice.client.email}</p>
                  <p className="text-slate-600">{invoice.client.address?.street}</p>
                  <p className="text-slate-600">{invoice.client.address?.zipCode} {invoice.client.address?.city}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 px-2">
                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Fecha Emisión</p>
                  <p className="font-bold">{format(new Date(invoice.issuedDate || Date.now()), 'dd MMM yyyy', { locale: es })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Fecha Vencimiento</p>
                  <p className={`font-bold ${invoice.status === 'overdue' ? 'text-red-600' : ''}`}>
                    {format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Descripción</th>
                    <th className="px-6 py-4 text-center">Cant.</th>
                    <th className="px-6 py-4 text-right">Precio</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={`${(item.product as any)._id || item.product}-${idx}`} className="text-sm">
                      <td className="px-6 py-4 font-medium text-slate-900">{(item.product as any).name || item.product}</td>
                      <td className="px-6 py-4 text-center text-slate-600">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-slate-600 font-mono">{item.price.toFixed(2)}€</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">{item.total.toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end pt-6">
              <div className="w-full sm:w-64 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{invoice.subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Impuestos ({invoice.items[0]?.tax || 0}%)</span>
                  <span className="font-mono">{invoice.tax.toFixed(2)}€</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold text-slate-900">Total a Pagar</span>
                  <span className="text-2xl font-black text-primary font-mono">{invoice.total.toFixed(2)}€</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                <h4 className="text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">Notas / Instrucciones</h4>
                <p className="text-amber-900/80 text-sm italic">&quot;{invoice.notes}&quot;</p>
              </div>
            )}
          </CardContent>

          {/* Payment CTA */}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && settings?.data.stripeEnabled && (
            <CardFooter className="bg-slate-900 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <p className="text-slate-400 text-sm font-medium">Pago seguro mediante tarjeta</p>
                <p className="text-white text-lg font-bold">Paga esta factura online ahora</p>
              </div>
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 h-14 px-8 text-lg font-bold shadow-2xl transition-all hover:scale-105 active:scale-95"
                onClick={handlePayment}
                disabled={isPaying}
              >
                {isPaying ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-5 w-5" />
                )}
                Pagar {invoice.total.toFixed(2)}€
              </Button>
            </CardFooter>
          )}

          {invoice.status === 'paid' && (
            <CardFooter className="bg-green-600 p-8 justify-center">
              <div className="flex items-center gap-2 text-white font-bold text-xl">
                <CheckCircle2 className="h-6 w-6" />
                Esta factura ha sido pagada
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} {settings?.data.companyName} - Generado por Facturaly</p>
        </div>
      </div>
    </div>
  );
}

function XCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
