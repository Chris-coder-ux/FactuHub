'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { invoiceSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Trash2, Save, X, Loader2, FileCheck, QrCode } from 'lucide-react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Client, Product, Invoice } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';

// Dynamic import for QR code to avoid SSR issues
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });
// Simple debounce implementation
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

const getVeriFactuBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" | null => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: 'outline',
    sent: 'secondary',
    verified: 'default',
    rejected: 'destructive',
    error: 'destructive'
  };
  return status ? variants[status] || 'outline' : null;
};

const formatVeriFactuDate = (date?: Date | string) => {
  if (!date) return 'No disponible';
  const d = new Date(date);
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const generateVeriFactuQRData = (invoice: Partial<Invoice>, companyNif?: string) => {
  const data = {
    numeroFactura: invoice.invoiceNumber || '',
    fecha: invoice.createdAt ? new Date(invoice.createdAt).toISOString().split('T')[0] : '',
    importe: (invoice.total || 0).toFixed(2),
    nifEmisor: companyNif || '', // Now comes from settings
    csv: invoice.verifactuId || '',
    urlVerificacion: typeof window !== 'undefined' ? `${window.location.origin}/verify/${invoice._id}` : ''
  };

  return JSON.stringify(data);
};

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  readonly initialData?: Readonly<Partial<Invoice>>;
  readonly isEditing?: boolean;
}

export function InvoiceForm({ initialData, isEditing = false }: InvoiceFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const { data: clientsData } = useSWR<{ data: Client[] }>('/api/clients', fetcher);
  const { data: productsData } = useSWR<{ data: Product[] }>('/api/products', fetcher);
  const { data: settingsData } = useSWR<{ data: { taxId: string } }>('/api/settings', fetcher);
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
      dueDate: initialData?.dueDate 
        ? new Date(initialData.dueDate).toISOString().split('T')[0] 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: initialData?.notes || '',
    } as any // Use any temporarily to bypass the deep nested type mismatch if it persists
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch("items") || [];

  // Auto-save to localStorage
  const saveToLocalStorage = useCallback(
    debounce((data: any) => {
      localStorage.setItem(`invoice-draft-${isEditing ? initialData?._id : 'new'}`, JSON.stringify(data));
      setLastSaved(new Date().toLocaleTimeString());
    }, 1000),
    [isEditing, initialData?._id]
  );

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`invoice-draft-${isEditing ? initialData?._id : 'new'}`);
    if (saved && !initialData) {
      try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(key => {
          setValue(key as any, parsed[key]);
        });
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, [setValue, isEditing, initialData]);

  // Watch for changes and auto-save
  useEffect(() => {
    const subscription = watch((data) => {
      saveToLocalStorage(data);
    });
    return () => subscription.unsubscribe();
  }, [watch, saveToLocalStorage]);

  // Calculate totals
  const subtotal = watchedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalTax = watchedItems.reduce((acc, item) => acc + (item.price * item.quantity * ((item.tax || 0) / 100)), 0);
  const total = subtotal + totalTax;

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/invoices/${initialData?._id}` : '/api/invoices';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          subtotal,
          tax: totalTax,
          total
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error saving invoice');
      }

      toast.success(isEditing ? 'Factura actualizada' : 'Factura creada');
      router.push('/invoices');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error al guardar la factura');
      console.error('Submit error:', error);
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
      localStorage.removeItem(`invoice-draft-${isEditing ? initialData?._id : 'new'}`);
    } catch (error) {
      toast.error('Error guardando borrador');
    } finally {
      setIsAutoSaving(false);
    }
  };

  return (
    <div>
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{isEditing ? 'Editar Factura' : 'Nueva Factura'}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button type="button" variant="outline" onClick={saveDraft} disabled={isAutoSaving}>
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
              onClick={async () => {
                const reason = prompt('Razón de la cancelación:');
                if (!reason || !reason.trim()) return;

                try {
                  await toast.promise(
                    fetch(`/api/invoices/${initialData._id}/cancel`, {
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
              }}
            >
              Cancelar Factura
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Detalles del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select 
                onValueChange={(value) => setValue('client', value)}
                defaultValue={initialData?.client?._id || ''}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientsData?.data.map((client) => (
                    <SelectItem key={client._id} value={client._id!}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client && <p className="text-sm text-red-500">{errors.client.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Vencimiento</Label>
                <Input type="date" {...register('dueDate')} />
                {errors.dueDate && <p className="text-sm text-red-500">{errors.dueDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select 
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={initialData?.status || 'draft'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="paid">Pagada</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isEditing && (
              <div className="pt-4 space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Enlace Público / Pago</Label>
                <div className="p-2 bg-slate-100 rounded border text-xs font-mono break-all text-slate-600">
                  {`${globalThis.location?.origin || ''}/public/invoices/${initialData?._id}`}
                </div>
                <p className="text-[10px] text-muted-foreground italic">Comparte este enlace con tu cliente para que visualice y pague la factura.</p>
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Artículos / Servicios</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ product: '', quantity: 1, price: 0, tax: 21, total: 0 })}>
            <Plus className="mr-2 h-4 w-4" /> Agregar Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.map((field, index) => (
               <div key={field.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end border-b pb-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Producto/Servicio</Label>
                  <Select 
                    onValueChange={(val) => handleProductChange(index, val)}
                    defaultValue={field.product}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {productsData?.data.map((product) => (
                        <SelectItem key={product._id} value={product._id!}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cant.</Label>
                  <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Precio Unit.</Label>
                  <Input type="number" step="0.01" {...register(`items.${index}.price`, { valueAsNumber: true })} />
                </div>
                 <div className="space-y-2">
                   <Label>Impuesto (%)</Label>
                   <Input type="number" step="0.01" {...register(`items.${index}.tax`, { valueAsNumber: true })} />
                 </div>
                 <div className="space-y-2">
                   <Label>Total Item</Label>
                   <div className="h-10 flex items-center px-3 rounded-md bg-muted text-sm font-medium">
                     ${(watchedItems[index]
                       ? watchedItems[index].price * watchedItems[index].quantity * (1 + (watchedItems[index].tax || 0) / 100)
                       : 0).toFixed(2)}
                   </div>
                 </div>
                <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => remove(index)} disabled={fields.length === 1}>
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
       </Card>

       <div className="space-y-2">
         <Label>Notas / Términos</Label>
         <Input {...register('notes')} placeholder="Gracias por su confianza..." />
       </div>
     </form>

     {/* VeriFactu Compliance Section - Only shown when editing */}
     {isEditing && initialData && (
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
                 <Label className="text-sm font-medium">Estado VeriFactu</Label>
                 <div className="mt-1">
                    {initialData!.verifactuStatus ? (
                      <Badge
                        variant={getVeriFactuBadgeVariant(initialData!.verifactuStatus)}
                        className="rounded-full px-3 py-1 text-xs uppercase tracking-wider"
                      >
                        {initialData!.verifactuStatus}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">No procesado</span>
                    )}
                 </div>
               </div>

               <div>
                 <Label className="text-sm font-medium">ID VeriFactu (CSV)</Label>
                 <div className="mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {initialData!.verifactuId || 'No disponible'}
                    </code>
                 </div>
               </div>

               <div>
                 <Label className="text-sm font-medium">Fecha de Envío</Label>
                 <div className="mt-1 text-sm">
                    {formatVeriFactuDate(initialData!.verifactuSentAt)}
                 </div>
               </div>
             </div>

             <div className="space-y-4">
               <div>
                 <Label className="text-sm font-medium">Fecha de Verificación</Label>
                 <div className="mt-1 text-sm">
                    {formatVeriFactuDate(initialData!.verifactuVerifiedAt)}
                 </div>
               </div>

                {initialData!.verifactuErrorMessage && (
                  <div>
                    <Label className="text-sm font-medium text-red-600">Mensaje de Error</Label>
                    <div className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded border">
                      {initialData!.verifactuErrorMessage}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Código QR VeriFactu
                  </Label>
                  <div className="mt-2 p-2 bg-white border rounded-lg inline-block">
                     <QRCode
                       value={generateVeriFactuQRData(initialData!, settingsData?.data?.taxId)}
                       size={120}
                       style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                     />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escanea para verificar la factura
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                         await toast.promise(
                           fetch(`/api/invoices/${initialData!._id}/verifactu/generate`, {
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
                    }}
                  >
                    Generar XML
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                         await toast.promise(
                           fetch(`/api/invoices/${initialData!._id}/verifactu/send`, {
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
                    }}
                  >
                    Enviar a AEAT
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                         await toast.promise(
                           fetch(`/api/invoices/${initialData!._id}/verifactu/status`, {
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
                    }}
                  >
                    Consultar Estado
                  </Button>
                </div>
             </div>
           </div>
         </CardContent>
       </Card>
      )}
    </div>
    );
  }


