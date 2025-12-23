'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { invoiceSchema } from '@/lib/validations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Client, Product, Invoice } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { InvoiceFormHeader } from './invoice/InvoiceFormHeader';
import { InvoiceClientDetails } from './invoice/InvoiceClientDetails';
import { InvoiceFinancialSummary } from './invoice/InvoiceFinancialSummary';
import { InvoiceItemsList } from './invoice/InvoiceItemsList';
import { InvoiceVeriFactuSection } from './invoice/InvoiceVeriFactuSection';
import { InvoiceFormDetailed } from './invoice/InvoiceFormDetailed';
import { InvoiceFormData } from './invoice/types';
import { debounce } from './invoice/utils';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { useSWRConfig } from 'swr';

interface InvoiceFormProps {
  readonly initialData?: Readonly<Partial<Invoice>>;
  readonly isEditing?: boolean;
  readonly templateData?: any; // Datos de plantilla aplicada
}

function InvoiceFormComponent({ initialData, isEditing = false, templateData }: InvoiceFormProps) {
  const router = useRouter();
  const { mutate: mutateGlobal } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const { data: clientsData } = useSWR<{ data: Client[] }>('/api/clients', fetcher);
  const { data: productsData } = useSWR<{ data: Product[] }>('/api/products', fetcher);
  const { data: settingsData } = useSWR<{ data: { taxId: string } }>('/api/settings', fetcher);
  const { data: templatesData } = useSWR<{ data: any[] }>('/api/templates?type=invoice', fetcher);
  const { data: invoiceData, mutate: mutateInvoice } = useSWR<Invoice>(
    isEditing && initialData ? `/api/invoices/${initialData._id}` : null,
    fetcher
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      client: initialData?.client?._id || '',
      items: initialData?.items?.map(it => ({
        product: typeof it.product === 'object' && it.product !== null ? (it.product as any)._id : it.product as string,
        quantity: it.quantity,
        price: it.price,
        tax: it.tax ?? 21,
        total: it.total
      })) || [{ product: '', quantity: 1, price: 0, tax: 21, total: 0 }],
      status: initialData?.status || 'draft',
      invoiceType: (initialData as any)?.invoiceType || 'invoice',
      dueDate: initialData?.dueDate 
        ? new Date(initialData.dueDate).toISOString().split('T')[0] 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: initialData?.notes || '',
      fromAddress: (initialData as any)?.fromAddress || '',
      billingAddress: (initialData as any)?.billingAddress || '',
      shippingAddress: (initialData as any)?.shippingAddress || '',
      paymentTerms: (initialData as any)?.paymentTerms || 'El pago se efectuará en 15 días',
      invoiceNumber: initialData?.invoiceNumber || '',
      invoiceDate: (initialData as any)?.invoiceDate || new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'),
      orderNumber: (initialData as any)?.orderNumber || '',
      currency: (initialData as any)?.currency || 'EUR',
    } as any
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch("items") || [];

  // Auto-save to localStorage using custom hook
  const { loadFromLocalStorage, clearSavedData, lastSaved: autoSavedTime } = useFormAutoSave(
    watch,
    {
      formKey: `invoice-draft-${isEditing ? initialData?._id : 'new'}`,
      enabled: !isEditing || !initialData, // Only auto-save drafts, not when editing existing invoices
      debounceMs: 1000,
      onSave: (data) => {
        setLastSaved(new Date().toLocaleTimeString());
      },
    }
  );

  // Load from template or localStorage
  useEffect(() => {
    if (templateData && !initialData) {
      // Aplicar datos de plantilla
      if (templateData.client) setValue('client', templateData.client);
      if (templateData.dueDate) setValue('dueDate', new Date(templateData.dueDate).toISOString().split('T')[0]);
      if (templateData.status) setValue('status', templateData.status);
      if (templateData.notes) setValue('notes', templateData.notes);
      if (templateData.items && templateData.items.length > 0) {
        // Limpiar items actuales y agregar los de la plantilla
        setValue('items', templateData.items.map((item: any) => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          tax: item.tax,
          total: item.price * item.quantity * (1 + (item.tax || 0) / 100),
        })));
      }
    } else {
      // Load from localStorage
      const saved = loadFromLocalStorage();
      if (saved && !initialData) {
        try {
          Object.keys(saved).forEach(key => {
            setValue(key as any, saved[key as keyof typeof saved]);
          });
        } catch (error) {
          logger.error('Error loading draft', error);
        }
      }
    }
  }, [templateData, setValue, isEditing, initialData, loadFromLocalStorage]);

  // Calculate totals
  const subtotal = watchedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalTax = watchedItems.reduce((acc, item) => acc + (item.price * item.quantity * ((item.tax || 0) / 100)), 0);
  const total = subtotal + totalTax;

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    
    const invoicePayload = {
      ...data,
      subtotal,
      tax: totalTax,
      total
    };

    // Optimistic update for editing existing invoice
    if (isEditing && initialData?._id) {
      const updatedInvoice = { ...initialData, ...invoicePayload } as unknown as Invoice;
      
      mutateInvoice(
        updatedInvoice,
        false // Don't revalidate immediately
      );

      // Also update in the list
      mutateGlobal(
        '/api/invoices',
        (current: any) => {
          if (!current) return current;
          const data = Array.isArray(current) ? current : current.data || [];
          return Array.isArray(current)
            ? data.map((inv: Invoice) => inv._id === initialData._id ? updatedInvoice : inv)
            : { ...current, data: data.map((inv: Invoice) => inv._id === initialData._id ? updatedInvoice : inv) };
        },
        false
      );
    }

    try {
      const url = isEditing ? `/api/invoices/${initialData?._id}` : '/api/invoices';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la factura');
      }

      const result = await response.json();
      
      // Revalidate to get server state
      if (isEditing) {
        mutateInvoice();
        mutateGlobal('/api/invoices');
      }

      toast.success(isEditing ? 'Factura actualizada correctamente' : 'Factura creada correctamente');
      clearSavedData(); // Use hook method to clear saved data
      router.push('/invoices');
      router.refresh();
    } catch (error) {
      // Revert optimistic update on error
      if (isEditing && initialData?._id) {
        mutateInvoice();
        mutateGlobal('/api/invoices');
      }
      
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error al guardar la factura');
      logger.error('Submit error', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = productsData?.data.find(p => p._id === productId);
    if (product) {
      setValue(`items.${index}.price`, product.price);
      setValue(`items.${index}.tax`, product.tax);

      const quantity = watch(`items.${index}.quantity`);
      const itemTotal = product.price * quantity * (1 + product.tax / 100);
      setValue(`items.${index}.total`, itemTotal);
    }
    setValue(`items.${index}.product`, productId);
  };

  const saveDraft = async () => {
    setIsAutoSaving(true);
    try {
      const data = watch();
      const url = isEditing ? `/api/invoices/${initialData?._id}` : '/api/invoices';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          status: 'draft',
          subtotal,
          tax: totalTax,
          total
        }),
      });

      if (!response.ok) {
        throw new Error('Error saving draft');
      }

      setLastSaved(new Date().toLocaleTimeString());
      toast.success('Borrador guardado');
      clearSavedData(); // Use hook method to clear saved data
    } catch (error) {
      toast.error('Error guardando borrador');
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleCancelInvoice = async () => {
    const reason = prompt('Razón de la cancelación:');
    if (!reason || !reason.trim()) return;

    try {
      await toast.promise(
        fetch(`/api/invoices/${initialData!._id}/cancel`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() })
        }),
        {
          loading: 'Cancelando factura...',
          success: 'Factura cancelada correctamente',
          error: 'Error al cancelar factura'
        }
      );
      window.location.reload();
    } catch (error) {
      // Error handled by toast
    }
  };

  const currentInvoice = invoiceData || initialData;

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8 max-w-5xl mx-auto">
        <InvoiceFormHeader
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          isAutoSaving={isAutoSaving}
          onSaveDraft={saveDraft}
          initialData={initialData}
          onCancelInvoice={handleCancelInvoice}
        />

        {/* Formulario Detallado con diseño de la imagen */}
        <InvoiceFormDetailed
          register={register}
          setValue={setValue}
          watch={watch}
          control={control}
          fields={fields}
          append={append}
          remove={remove}
          products={productsData?.data || []}
          onProductChange={handleProductChange}
          subtotal={subtotal}
          totalTax={totalTax}
          total={total}
          invoiceNumber={currentInvoice?.invoiceNumber || watch('invoiceNumber')}
          orderNumber={watch('orderNumber')}
          clients={clientsData?.data || []}
        />
      </form>

      {/* VeriFactu Compliance Section - Only shown when editing */}
      {isEditing && currentInvoice && (
        <InvoiceVeriFactuSection
          invoice={currentInvoice}
          companyTaxId={settingsData?.data?.taxId}
          mutateInvoice={mutateInvoice}
        />
      )}
    </div>
  );
}

// Memoize InvoiceForm to prevent unnecessary re-renders
// Only re-render if initialData or isEditing changes
export const InvoiceForm = React.memo(InvoiceFormComponent, (prevProps, nextProps) => {
  // Compare isEditing (primitive)
  if (prevProps.isEditing !== nextProps.isEditing) return false;
  
  // Compare initialData by reference (if same object, no need to re-render)
  if (prevProps.initialData !== nextProps.initialData) {
    // Deep comparison only if references differ
    if (!prevProps.initialData || !nextProps.initialData) return false;
    
    // Compare key fields that would affect form rendering
    const prevId = prevProps.initialData._id;
    const nextId = nextProps.initialData._id;
    if (prevId !== nextId) return false;
    
    // If IDs match, assume it's the same invoice (reference check is sufficient)
    // For new invoices, initialData will be undefined or different reference
  }
  
  // Compare templateData by reference
  if (prevProps.templateData !== nextProps.templateData) return false;
  
  return true;
});
