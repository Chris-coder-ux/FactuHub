'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Client } from '@/types';
import { FieldErrors } from 'react-hook-form';
import { InvoiceFormData } from './types';

interface InvoiceClientDetailsProps {
  clients: Client[];
  errors: FieldErrors<InvoiceFormData>;
  register: any;
  setValue: any;
  initialData?: Partial<{
    client?: { _id?: string } | string;
    status?: string;
    dueDate?: string | Date;
    _id?: string;
  }>;
  isEditing: boolean;
}

export function InvoiceClientDetails({
  clients,
  errors,
  register,
  setValue,
  initialData,
  isEditing
}: InvoiceClientDetailsProps) {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Detalles del Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label id="invoice-client-label">Cliente</Label>
          <Select 
            onValueChange={(value) => {
              (setValue as any)('client', value);
            }}
            defaultValue={
              typeof initialData?.client === 'object' && initialData?.client?._id
                ? initialData.client._id
                : typeof initialData?.client === 'string'
                ? initialData.client
                : ''
            }
          >
            <SelectTrigger aria-labelledby="invoice-client-label" id="invoice-client">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
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
            <Label htmlFor="invoice-dueDate">Fecha de Vencimiento</Label>
            <Input id="invoice-dueDate" type="date" {...register('dueDate')} />
            {errors.dueDate && <p className="text-sm text-red-500">{errors.dueDate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label id="invoice-status-label">Estado</Label>
            <Select 
              onValueChange={(value) => {
                (setValue as any)('status', value);
              }}
              defaultValue={initialData?.status || 'draft'}
            >
              <SelectTrigger aria-labelledby="invoice-status-label" id="invoice-status">
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
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Enlace Público / Pago</div>
            <div className="p-2 bg-slate-100 rounded border text-xs font-mono break-all text-slate-600">
              {`${globalThis.location?.origin || ''}/public/invoices/${initialData?._id}`}
            </div>
            <p className="text-[10px] text-muted-foreground italic">Comparte este enlace con tu cliente para que visualice y pague la factura.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

