'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Client } from '@/types';

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  readonly initialData?: Partial<Client>;
  readonly onSubmit: (data: ClientFormData) => Promise<void>;
  readonly isLoading?: boolean;
}

export function ClientForm({ initialData, onSubmit, isLoading }: ClientFormProps) {
  const {
    register,
    handleSubmit,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
