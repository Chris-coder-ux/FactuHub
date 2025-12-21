/**
 * Create Ticket Form Component
 */

'use client';

import { useState } from 'react';
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
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const createTicketSchema = z.object({
  subject: z.string().min(1, 'El asunto es requerido').max(200),
  description: z.string().min(1, 'La descripción es requerida').max(5000),
  category: z.enum(['technical', 'billing', 'feature', 'bug', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

interface CreateTicketFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateTicketForm({ onSuccess, onCancel }: CreateTicketFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      category: 'other',
      priority: 'medium',
    },
  });

  const category = watch('category');
  const priority = watch('priority');

  const onSubmit = async (data: CreateTicketFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear el ticket');
      }

      const result = await response.json();
      toast.success('Ticket creado exitosamente', {
        description: `Número de ticket: ${result.data.ticketNumber}`,
      });
      onSuccess?.();
    } catch (error) {
      toast.error('Error al crear el ticket', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="subject">Asunto *</Label>
        <Input
          id="subject"
          {...register('subject')}
          placeholder="Describe brevemente tu problema o consulta"
          maxLength={200}
        />
        {errors.subject && (
          <p className="text-sm text-destructive">{errors.subject.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción *</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Proporciona detalles sobre tu problema o consulta..."
          rows={6}
          maxLength={5000}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría *</Label>
          <Select
            value={category}
            onValueChange={(value) => setValue('category', value as CreateTicketFormData['category'])}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technical">Técnico</SelectItem>
              <SelectItem value="billing">Facturación</SelectItem>
              <SelectItem value="feature">Solicitud de Funcionalidad</SelectItem>
              <SelectItem value="bug">Reporte de Error</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Prioridad *</Label>
          <Select
            value={priority}
            onValueChange={(value) => setValue('priority', value as CreateTicketFormData['priority'])}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="Selecciona una prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Crear Ticket
        </Button>
      </div>
    </form>
  );
}

