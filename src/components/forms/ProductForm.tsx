'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { productSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/types';

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  readonly initialData?: Partial<Product>;
  readonly onSubmit: (data: ProductFormData) => Promise<void>;
  readonly isLoading?: boolean;
}

export function ProductForm({ initialData, onSubmit, isLoading }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      tax: initialData?.tax ?? 21,
      stock: initialData?.stock ?? 0,
      alertThreshold: initialData?.alertThreshold ?? 5,
    } as any
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" {...register('description')} />
        {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Precio</Label>
          <Input id="price" type="number" step="0.01" {...register('price', { valueAsNumber: true })} />
          {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax">IVA (%)</Label>
          <Input id="tax" type="number" {...register('tax', { valueAsNumber: true })} />
          {errors.tax && <p className="text-sm text-red-500">{errors.tax.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stock">Stock Actual</Label>
          <Input id="stock" type="number" {...register('stock', { valueAsNumber: true })} />
          {errors.stock && <p className="text-sm text-red-500">{errors.stock.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="alertThreshold">Umbral de Alerta</Label>
          <Input id="alertThreshold" type="number" {...register('alertThreshold', { valueAsNumber: true })} />
          {errors.alertThreshold && <p className="text-sm text-red-500">{errors.alertThreshold.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Guardando...' : 'Guardar Producto'}
      </Button>
    </form>
  );
}
