'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Expense, Receipt } from '@/types';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

const expenseFormSchema = z.object({
  receiptIds: z.array(z.string()).optional(),
  category: z.enum(['travel', 'meals', 'office', 'supplies', 'utilities', 'marketing', 'software', 'professional_services', 'other']),
  amount: z.number().min(0),
  taxAmount: z.number().min(0),
  date: z.string(),
  description: z.string().min(1, 'La descripción es requerida'),
  vendor: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  tags: z.string().optional(), // Comma-separated tags
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  readonly initialData?: Partial<Expense>;
  readonly isEditing?: boolean;
  readonly onSuccess?: () => void;
}

const categoryLabels: Record<string, string> = {
  travel: 'Viajes',
  meals: 'Comidas',
  office: 'Oficina',
  supplies: 'Suministros',
  utilities: 'Servicios',
  marketing: 'Marketing',
  software: 'Software',
  professional_services: 'Servicios Profesionales',
  other: 'Otros',
};

export function ExpenseForm({ initialData, isEditing = false, onSuccess }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>(
    initialData?.receiptIds || []
  );

  const { data: receiptsData } = useSWR<{ receipts: Receipt[] }>('/api/receipts?limit=100', fetcher);
  const receipts = receiptsData?.receipts || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      receiptIds: initialData?.receiptIds || [],
      category: initialData?.category || 'other',
      amount: initialData?.amount || 0,
      taxAmount: initialData?.taxAmount || 0,
      date: initialData?.date 
        ? (typeof initialData.date === 'string' 
            ? initialData.date.split('T')[0] 
            : new Date(initialData.date).toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0],
      description: initialData?.description || '',
      vendor: initialData?.vendor || '',
      status: initialData?.status || 'pending',
      tags: initialData?.tags?.join(', ') || '',
      notes: initialData?.notes || '',
    }
  });

  // Pre-fill from selected receipt
  const handleReceiptSelect = (receiptId: string, checked: boolean) => {
    if (checked) {
      setSelectedReceiptIds([...selectedReceiptIds, receiptId]);
      const receipt = receipts.find(r => r._id === receiptId);
      if (receipt && receipt.extractedData) {
        const data = receipt.extractedData;
        if (data.total && !watch('amount')) {
          setValue('amount', data.total);
        }
        if (data.tax && !watch('taxAmount')) {
          setValue('taxAmount', data.tax);
        }
        if (data.date && !watch('date')) {
          setValue('date', data.date);
        }
        if (data.merchant && !watch('vendor')) {
          setValue('vendor', data.merchant);
        }
        if (data.merchant && !watch('description')) {
          setValue('description', data.merchant);
        }
      }
    } else {
      setSelectedReceiptIds(selectedReceiptIds.filter(id => id !== receiptId));
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/expenses/${initialData?._id}` : '/api/expenses';
      const method = isEditing ? 'PATCH' : 'POST';

      const payload = {
        ...data,
        receiptIds: selectedReceiptIds,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al guardar el gasto');
      }

      toast.success(isEditing ? 'Gasto actualizado' : 'Gasto creado');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error al guardar el gasto');
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableReceipts = receipts.filter(r => !r.expenseId || (isEditing && initialData?.receiptIds?.includes(r._id!)));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Receipt Selection */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Recibos Asociados (opcional)</div>
        <p className="text-sm text-muted-foreground">
          Selecciona uno o más recibos para asociar con este gasto. Los datos se pre-llenarán automáticamente.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-64 overflow-y-auto border rounded-md p-4">
          {availableReceipts.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">
              No hay recibos disponibles. <a href="/receipts" className="text-blue-600 hover:underline">Sube recibos primero</a>
            </p>
          ) : (
            availableReceipts.map((receipt) => (
              <Card key={receipt._id} className="relative">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      checked={selectedReceiptIds.includes(receipt._id!)}
                      onCheckedChange={(checked) => 
                        handleReceiptSelect(receipt._id!, checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="relative aspect-video mb-2">
                        <Image
                          src={receipt.imageUrl}
                          alt={receipt.originalFilename}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                      <p className="text-xs font-medium truncate">
                        {receipt.extractedData?.merchant || receipt.originalFilename}
                      </p>
                      {receipt.extractedData?.total && (
                        <p className="text-xs text-muted-foreground">
                          {receipt.extractedData.total.toFixed(2)} €
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="description">Descripción *</Label>
          <Input id="description" {...register('description')} />
          {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor">Proveedor</Label>
          <Input id="vendor" {...register('vendor')} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría *</Label>
          <Select
            value={watch('category')}
            onValueChange={(value) => setValue('category', value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Importe (€) *</Label>
          <Input 
            id="amount" 
            type="number" 
            step="0.01" 
            {...register('amount', { valueAsNumber: true })} 
          />
          {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxAmount">IVA (€) *</Label>
          <Input 
            id="taxAmount" 
            type="number" 
            step="0.01" 
            {...register('taxAmount', { valueAsNumber: true })} 
          />
          {errors.taxAmount && <p className="text-sm text-red-500">{errors.taxAmount.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Fecha *</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
        </div>

        {isEditing && (
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (separados por comas)</Label>
        <Input id="tags" {...register('tags')} placeholder="ej: viaje, cliente, proyecto" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" {...register('notes')} rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar Gasto' : 'Crear Gasto'}
        </Button>
      </div>
    </form>
  );
}

