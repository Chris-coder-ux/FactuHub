'use client';

import { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Invoice } from '@/types';
import { logger } from '@/lib/logger';

interface UseInvoiceActionsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for invoice-related actions (send email, download PDF, etc.)
 * Provides reusable functions for common invoice operations
 */
export function useInvoiceActions(options: UseInvoiceActionsOptions = {}) {
  const { mutate } = useSWRConfig();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  /**
   * Send invoice via email
   */
  const sendEmail = useCallback(async (invoice: Invoice, email?: string) => {
    if (!invoice._id) {
      toast.error('La factura debe estar guardada para enviarla por email');
      return;
    }

    const recipientEmail = email || invoice.client?.email;
    
    if (!recipientEmail) {
      toast.error('No se encontró un email de destinatario');
      return;
    }

    setIsSendingEmail(true);
    
    try {
      const response = await fetch(`/api/invoices/${invoice._id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recipientEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al enviar la factura');
      }

      // Invalidate invoices cache to refresh the list
      mutate('/api/invoices');
      mutate(`/api/invoices/${invoice._id}`);

      toast.success('Factura enviada correctamente');
      options.onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar la factura';
      logger.error('Failed to send invoice email', { error, invoiceId: invoice._id });
      toast.error(errorMessage);
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsSendingEmail(false);
    }
  }, [mutate, options]);

  /**
   * Download invoice PDF
   */
  const downloadPDF = useCallback(async (invoice: Invoice, settings?: any) => {
    if (!invoice._id) {
      toast.error('La factura debe estar guardada para descargar el PDF');
      return;
    }

    setIsDownloadingPDF(true);

    try {
      // Try to use server-generated PDF first (better quality)
      const pdfUrl = `/api/invoices/${invoice._id}/pdf`;
      const response = await fetch(pdfUrl);

      if (!response.ok) {
        throw new Error('Error al generar el PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `factura-${invoice.invoiceNumber || invoice._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF descargado correctamente');
      options.onSuccess?.();
    } catch (error) {
      // Fallback to client-side generation
      try {
        const { generateInvoicePDF } = await import('@/lib/pdf-generator');
        await generateInvoicePDF(invoice, settings || null);
        toast.success('PDF generado correctamente');
        options.onSuccess?.();
      } catch (fallbackError) {
        const errorMessage = error instanceof Error ? error.message : 'Error al descargar el PDF';
        logger.error('Failed to download invoice PDF', { error: fallbackError, invoiceId: invoice._id });
        toast.error(errorMessage);
        options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    } finally {
      setIsDownloadingPDF(false);
    }
  }, [options]);

  /**
   * Preview invoice PDF (opens in new window/tab)
   */
  const previewPDF = useCallback((invoice: Invoice) => {
    if (!invoice._id) {
      toast.error('La factura debe estar guardada para previsualizar el PDF');
      return;
    }

    const pdfUrl = `/api/invoices/${invoice._id}/pdf?preview=true`;
    window.open(pdfUrl, '_blank');
  }, []);

  /**
   * Cancel invoice with optimistic update
   */
  const cancelInvoice = useCallback(async (invoice: Invoice, reason: string) => {
    if (!invoice._id) {
      toast.error('La factura debe estar guardada para cancelarla');
      return;
    }

    // Optimistic update: update invoice status immediately
    const updatedInvoice = { ...invoice, status: 'cancelled' as const };
    
    mutate(
      '/api/invoices',
      (current: any) => {
        if (!current) return current;
        const data = Array.isArray(current) ? current : current.data || [];
        return Array.isArray(current)
          ? data.map((inv: Invoice) => inv._id === invoice._id ? updatedInvoice : inv)
          : { ...current, data: data.map((inv: Invoice) => inv._id === invoice._id ? updatedInvoice : inv) };
      },
      false // Don't revalidate immediately
    );

    mutate(
      `/api/invoices/${invoice._id}`,
      updatedInvoice,
      false
    );

    try {
      const response = await fetch(`/api/invoices/${invoice._id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al cancelar la factura');
      }

      // Revalidate to get server state
      mutate('/api/invoices');
      mutate(`/api/invoices/${invoice._id}`);

      toast.success('Factura cancelada correctamente');
      options.onSuccess?.();
    } catch (error) {
      // Revert optimistic update on error
      mutate('/api/invoices');
      mutate(`/api/invoices/${invoice._id}`);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al cancelar la factura';
      logger.error('Failed to cancel invoice', { error, invoiceId: invoice._id });
      toast.error(errorMessage);
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [mutate, options]);

  /**
   * Delete invoice (soft delete) with optimistic update
   */
  const deleteInvoice = useCallback(async (invoice: Invoice) => {
    if (!invoice._id) {
      toast.error('La factura debe estar guardada para eliminarla');
      return;
    }

    // Optimistic update: remove invoice from list immediately
    let previousData: any;
    
    mutate(
      '/api/invoices',
      (current: any) => {
        if (!current) return current;
        previousData = current; // Store for rollback
        const data = Array.isArray(current) ? current : current.data || [];
        return Array.isArray(current)
          ? data.filter((inv: Invoice) => inv._id !== invoice._id)
          : { ...current, data: data.filter((inv: Invoice) => inv._id !== invoice._id) };
      },
      false // Don't revalidate immediately
    );

    try {
      const response = await fetch(`/api/invoices/${invoice._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al eliminar la factura');
      }

      // Revalidate to get server state
      mutate('/api/invoices');

      toast.success('Factura eliminada correctamente');
      options.onSuccess?.();
    } catch (error) {
      // Revert optimistic update on error
      mutate('/api/invoices', previousData, false);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar la factura';
      logger.error('Failed to delete invoice', { error, invoiceId: invoice._id });
      toast.error(errorMessage);
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [mutate, options]);

  return {
    sendEmail,
    downloadPDF,
    previewPDF,
    cancelInvoice,
    deleteInvoice,
    isSendingEmail,
    isDownloadingPDF,
  };
}

