'use client';

import { Button } from '@/components/ui/button';
import { Save, X, Loader2, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Invoice } from '@/types';
import { InvoicePDFPreview } from '@/components/invoices/InvoicePDFPreview';
import { useState } from 'react';

interface InvoiceFormHeaderProps {
  isEditing: boolean;
  isSubmitting: boolean;
  isAutoSaving: boolean;
  onSaveDraft: () => void;
  initialData?: Partial<Invoice>;
  onCancelInvoice?: () => void;
}

export function InvoiceFormHeader({
  isEditing,
  isSubmitting,
  isAutoSaving,
  onSaveDraft,
  initialData,
  onCancelInvoice
}: InvoiceFormHeaderProps) {
  const router = useRouter();
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold">{isEditing ? 'Editar Factura' : 'Nueva Factura'}</h1>
      <div className="flex gap-2">
        {/* PDF Preview Button - only when editing and invoice has _id */}
        {isEditing && initialData?._id && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setShowPDFPreview(true)}
          >
            <FileText className="mr-2 h-4 w-4" /> Vista Previa PDF
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => router.back()}>
          <X className="mr-2 h-4 w-4" /> Cancelar
        </Button>
        <Button type="button" variant="outline" onClick={onSaveDraft} disabled={isAutoSaving}>
          {isAutoSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isAutoSaving ? 'Guardando...' : 'Guardar Borrador'}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? 'Guardando...' : 'Guardar Factura'}
        </Button>

        {/* Cancel Invoice Button - only for non-cancelled, non-paid invoices */}
        {isEditing && initialData && initialData.status !== 'cancelled' && initialData.status !== 'paid' && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onCancelInvoice}
          >
            Cancelar Factura
          </Button>
        )}
      </div>

      {/* PDF Preview Dialog */}
      {isEditing && initialData?._id && (
        <InvoicePDFPreview
          invoice={initialData as Invoice}
          open={showPDFPreview}
          onOpenChange={setShowPDFPreview}
        />
      )}
    </div>
  );
}

