'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface Template {
  _id: string;
  name: string;
  type: 'invoice' | 'email' | 'pdf';
  isDefault?: boolean;
  isShared?: boolean;
  invoiceTemplate?: any;
  emailTemplate?: any;
  metadata?: {
    description?: string;
  };
}

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  isCreating: boolean;
  onSuccess: () => void;
}

const templateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['invoice', 'email', 'pdf']),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
  description: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export function TemplateDialog({
  open,
  onOpenChange,
  template,
  isCreating,
  onSuccess,
}: TemplateDialogProps) {
  const [templateType, setTemplateType] = useState<'invoice' | 'email' | 'pdf'>('invoice');
  const { data: clientsData } = useSWR('/api/clients', fetcher);
  const { data: productsData } = useSWR('/api/products', fetcher);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      type: 'invoice',
      isDefault: false,
      isShared: false,
    },
  });

  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        type: template.type,
        isDefault: template.isDefault,
        isShared: template.isShared,
        description: template.metadata?.description,
      });
      setTemplateType(template.type);
    } else {
      reset({
        name: '',
        type: 'invoice',
        isDefault: false,
        isShared: false,
        description: '',
      });
      setTemplateType('invoice');
    }
  }, [template, reset]);

  const onSubmit = async (data: TemplateFormData) => {
    try {
      const url = isCreating ? '/api/templates' : `/api/templates/${template?._id}`;
      const method = isCreating ? 'POST' : 'PATCH';

      const payload: any = {
        ...data,
        metadata: {
          description: data.description,
        },
      };

      // Por ahora solo soportamos plantillas de factura en el dialog
      // Las de email y PDF requerirían editores más complejos
      if (data.type === 'invoice') {
        // TODO: Agregar items de factura desde UI
        payload.invoiceTemplate = {
          items: [],
          dueDateDays: 30,
          status: 'draft',
        };
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Error al guardar plantilla');

      toast.success(isCreating ? 'Plantilla creada' : 'Plantilla actualizada');
      onSuccess();
    } catch (error) {
      toast.error('Error al guardar plantilla');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? 'Nueva Plantilla' : 'Editar Plantilla'}
          </DialogTitle>
          <DialogDescription>
            {isCreating 
              ? 'Crea una nueva plantilla para agilizar la creación de facturas, emails o PDFs'
              : 'Edita los detalles de la plantilla'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ej: Factura Mensual Servicios"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Tipo *</Label>
            <select
              id="type"
              {...register('type')}
              onChange={(e) => setTemplateType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="invoice">Factura</option>
              <option value="email">Email</option>
              <option value="pdf">PDF</option>
            </select>
            {errors.type && (
              <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descripción de la plantilla..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('isDefault')}
                className="rounded"
              />
              <span className="text-sm">Marcar como predeterminada</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('isShared')}
                className="rounded"
              />
              <span className="text-sm">Compartir entre empresas</span>
            </label>
          </div>

          {templateType === 'invoice' && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Nota: La edición de items de factura se implementará en una versión futura.
                Por ahora, puedes crear la plantilla y editarla después para agregar items.
              </p>
            </div>
          )}

          {templateType === 'email' && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Nota: El editor de plantillas de email se implementará en una versión futura.
              </p>
            </div>
          )}

          {templateType === 'pdf' && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Nota: La personalización de plantillas PDF se implementará en una versión futura.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isCreating ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

