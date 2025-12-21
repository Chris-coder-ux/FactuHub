'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCheck, QrCode, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Invoice } from '@/types';
import { getVeriFactuBadgeVariant, formatVeriFactuDate, generateVeriFactuQRData } from './utils';
import { toast } from 'sonner';
import { KeyedMutator } from 'swr';

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });

interface InvoiceVeriFactuSectionProps {
  invoice: Partial<Invoice>;
  companyTaxId?: string;
  mutateInvoice: KeyedMutator<Invoice>;
}

export function InvoiceVeriFactuSection({
  invoice,
  companyTaxId,
  mutateInvoice
}: InvoiceVeriFactuSectionProps) {
  // Proforma invoices should not show VeriFactu section
  if (invoice.invoiceType === 'proforma') {
    return (
      <Card className="mt-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-5 w-5" />
            Factura Proforma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
            Las facturas proforma no tienen validez fiscal y no pueden ser enviadas a VeriFactu/AEAT.
            Para enviar a la AEAT, convierta esta proforma en una factura real.
          </p>
          <Button
            onClick={async () => {
              try {
                const response = await fetch(`/api/invoices/${invoice._id}/convert-to-invoice`, {
                  method: 'POST',
                });
                
                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Error al convertir');
                }
                
                const result = await response.json();
                toast.success('Proforma convertida a factura real');
                mutateInvoice();
                window.location.reload();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Error al convertir');
              }
            }}
            className="bg-primary hover:bg-primary/90"
          >
            Convertir a Factura Real
          </Button>
        </CardContent>
      </Card>
    );
  }
  const handleGenerateXML = async () => {
    try {
      await toast.promise(
        fetch(`/api/invoices/${invoice._id}/verifactu/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }),
        {
          loading: 'Generando XML VeriFactu...',
          success: 'XML generado correctamente',
          error: 'Error al generar XML'
        }
      );
      mutateInvoice();
    } catch (error) {
      // Error already handled by toast
    }
  };

  const handleSendToAEAT = async () => {
    try {
      await toast.promise(
        fetch(`/api/invoices/${invoice._id}/verifactu/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }),
        {
          loading: 'Enviando a AEAT...',
          success: 'Enviado a AEAT correctamente',
          error: 'Error al enviar a AEAT'
        }
      );
      mutateInvoice();
    } catch (error) {
      // Error already handled by toast
    }
  };

  const handleCheckStatus = async () => {
    try {
      await toast.promise(
        fetch(`/api/invoices/${invoice._id}/verifactu/status`, {
          method: 'GET'
        }),
        {
          loading: 'Consultando estado...',
          success: 'Estado actualizado',
          error: 'Error al consultar estado'
        }
      );
      mutateInvoice();
    } catch (error) {
      // Error already handled by toast
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Cumplimiento VeriFactu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">Estado VeriFactu</div>
              <div className="mt-1">
                {invoice.verifactuStatus ? (
                  <Badge
                    variant={getVeriFactuBadgeVariant(invoice.verifactuStatus)}
                    className="rounded-full px-3 py-1 text-xs uppercase tracking-wider"
                  >
                    {invoice.verifactuStatus}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">No procesado</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">ID VeriFactu (CSV)</div>
              <div className="mt-1">
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {invoice.verifactuId || 'No disponible'}
                </code>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Fecha de Envío</div>
              <div className="mt-1 text-sm">
                {formatVeriFactuDate(invoice.verifactuSentAt)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">Fecha de Verificación</div>
              <div className="mt-1 text-sm">
                {formatVeriFactuDate(invoice.verifactuVerifiedAt)}
              </div>
            </div>

            {invoice.verifactuErrorMessage && (
              <div>
                <div className="text-sm font-medium text-red-600">Mensaje de Error</div>
                <div className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded border">
                  {invoice.verifactuErrorMessage}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Código QR VeriFactu
              </div>
              <div className="mt-2 p-2 bg-white border rounded-lg inline-block">
                <QRCode
                  value={generateVeriFactuQRData(invoice, companyTaxId)}
                  size={120}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Escanea para verificar la factura
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleGenerateXML}>
                Generar XML
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendToAEAT}>
                Enviar a AEAT
              </Button>
              <Button variant="outline" size="sm" onClick={handleCheckStatus}>
                Consultar Estado
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

