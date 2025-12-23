'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { productSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/types';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  readonly initialData?: Partial<Product>;
  readonly onSubmit: (data: ProductFormData) => Promise<void>;
  readonly isLoading?: boolean;
}

function ProductFormComponent({ initialData, onSubmit, isLoading }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
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

  // Auto-save to localStorage for new products (drafts)
  const { loadFromLocalStorage, clearSavedData } = useFormAutoSave(watch, {
    formKey: `product-draft-${initialData?._id || 'new'}`,
    enabled: !initialData?._id, // Only auto-save drafts, not when editing existing products
    debounceMs: 1000,
  });

  // Load from localStorage or reset form when initialData changes
  useEffect(() => {
    if (initialData?._id) {
      // Editing existing product - reset with initialData
      reset({
        name: initialData?.name || '',
        description: initialData?.description || '',
        price: initialData?.price || 0,
        tax: initialData?.tax ?? 21,
        stock: initialData?.stock ?? 0,
        alertThreshold: initialData?.alertThreshold ?? 5,
      } as any);
    } else {
      // New product - try to load from localStorage
      const saved = loadFromLocalStorage();
      if (saved) {
        reset(saved as any);
      } else {
        reset({
          name: '',
          description: '',
          price: 0,
          tax: 21,
          stock: 0,
          alertThreshold: 5,
        } as any);
      }
    }
  }, [initialData, reset, loadFromLocalStorage]);

  // Clear saved data on successful submit
  const handleFormSubmit = async (data: ProductFormData) => {
    await onSubmit(data);
    clearSavedData();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-4">
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

// Memoize ProductForm to prevent unnecessary re-renders
// Note: We use a key-based approach - when initialData changes (new vs edit), 
// the parent should provide a key to force remount, so we don't need strict comparison
export const ProductForm = React.memo(ProductFormComponent, (prevProps, nextProps) => {
  // Compare isLoading (primitive)
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  
  // Compare initialData by ID - if IDs differ, we need to re-render
  const prevId = prevProps.initialData?._id;
  const nextId = nextProps.initialData?._id;
  
  if (prevId !== nextId) return false;
  
  // If both are undefined (new product), allow re-render to reset form
  // This ensures form resets when opening dialog for new product
  if (!prevId && !nextId) {
    // Compare by reference - if reference changes, it's a new form instance
    return prevProps.initialData === nextProps.initialData;
  }
  
  // If IDs match, they're the same product - no need to re-render
  return true;
});
