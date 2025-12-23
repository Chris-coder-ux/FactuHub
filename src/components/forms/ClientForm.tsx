'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Client } from '@/types';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  readonly initialData?: Partial<Client>;
  readonly onSubmit: (data: ClientFormData) => Promise<void>;
  readonly isLoading?: boolean;
}

function ClientFormComponent({ initialData, onSubmit, isLoading }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      taxId: initialData?.taxId || '',
      address: {
        street: initialData?.address?.street || '',
        city: initialData?.address?.city || '',
        state: initialData?.address?.state || '',
        zipCode: initialData?.address?.zipCode || '',
        country: initialData?.address?.country || '',
      }
    }
  });

  // Auto-save to localStorage for new clients (drafts)
  const { loadFromLocalStorage, clearSavedData } = useFormAutoSave(watch, {
    formKey: `client-draft-${initialData?._id || 'new'}`,
    enabled: !initialData?._id, // Only auto-save drafts, not when editing existing clients
    debounceMs: 1000,
  });

  // Load from localStorage or reset form when initialData changes
  useEffect(() => {
    if (initialData?._id) {
      // Editing existing client - reset with initialData
      reset({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        taxId: initialData?.taxId || '',
        address: {
          street: initialData?.address?.street || '',
          city: initialData?.address?.city || '',
          state: initialData?.address?.state || '',
          zipCode: initialData?.address?.zipCode || '',
          country: initialData?.address?.country || '',
        }
      });
    } else {
      // New client - try to load from localStorage
      const saved = loadFromLocalStorage();
      if (saved) {
        reset(saved);
      } else {
        reset({
          name: '',
          email: '',
          phone: '',
          taxId: '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
          }
        });
      }
    }
  }, [initialData, reset, loadFromLocalStorage]);

  // Clear saved data on successful submit
  const handleFormSubmit = async (data: ClientFormData) => {
    await onSubmit(data);
    clearSavedData();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre / Razón Social</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" {...register('phone')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxId">ID Fiscal (NIF/CIF)</Label>
          <Input id="taxId" {...register('taxId')} />
        </div>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6 space-y-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Dirección de Facturación</Label>
          <div className="space-y-2">
            <Label htmlFor="address.street">Calle y Número</Label>
            <Input id="address.street" {...register('address.street')} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address.city">Ciudad</Label>
              <Input id="address.city" {...register('address.city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address.state">Provincia/Estado</Label>
              <Input id="address.state" {...register('address.state')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address.zipCode">Código Postal</Label>
              <Input id="address.zipCode" {...register('address.zipCode')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Guardando...' : 'Guardar Cliente'}
      </Button>
    </form>
  );
}

// Memoize ClientForm to prevent unnecessary re-renders
// Note: We use a key-based approach - when initialData changes (new vs edit), 
// the parent should provide a key to force remount, so we don't need strict comparison
export const ClientForm = React.memo(ClientFormComponent, (prevProps, nextProps) => {
  // Compare isLoading (primitive)
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  
  // Compare initialData by ID - if IDs differ, we need to re-render
  const prevId = prevProps.initialData?._id;
  const nextId = nextProps.initialData?._id;
  
  if (prevId !== nextId) return false;
  
  // If both are undefined (new client), allow re-render to reset form
  // This ensures form resets when opening dialog for new client
  if (!prevId && !nextId) {
    // Compare by reference - if reference changes, it's a new form instance
    return prevProps.initialData === nextProps.initialData;
  }
  
  // If IDs match, they're the same client - no need to re-render
  return true;
});
