'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Loader2 } from 'lucide-react';
import { Invoice } from '@/types';

interface InvoicePDFPreviewProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoicePDFPreview({ invoice, open, onOpenChange }: InvoicePDFPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = `/api/invoices/${invoice._id}/pdf`;
  const downloadUrl = `/api/invoices/${invoice._id}/pdf`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `factura-${invoice.invoiceNumber || invoice._id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-full p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>
              Vista Previa - Factura {invoice.invoiceNumber || 'Borrador'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="relative w-full h-[calc(90vh-100px)] bg-gray-100">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando PDF...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center p-6">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => {
                  setError(null);
                  setIsLoading(true);
                }}>
                  Reintentar
                </Button>
              </div>
            </div>
          )}
          
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full border-0"
            title={`Vista previa de factura ${invoice.invoiceNumber}`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Error al cargar el PDF. Intenta descargarlo directamente.');
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

