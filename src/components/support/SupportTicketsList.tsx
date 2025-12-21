/**
 * Support Tickets List Component
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetcher } from '@/lib/fetcher';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  open: { label: 'Abierto', color: 'bg-blue-500', icon: MessageSquare },
  'in-progress': { label: 'En Progreso', color: 'bg-yellow-500', icon: Clock },
  resolved: { label: 'Resuelto', color: 'bg-green-500', icon: CheckCircle2 },
  closed: { label: 'Cerrado', color: 'bg-gray-500', icon: XCircle },
};

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-gray-500' },
  medium: { label: 'Media', color: 'bg-blue-500' },
  high: { label: 'Alta', color: 'bg-orange-500' },
  urgent: { label: 'Urgente', color: 'bg-red-500' },
};

const categoryConfig = {
  technical: 'Técnico',
  billing: 'Facturación',
  feature: 'Funcionalidad',
  bug: 'Error',
  other: 'Otro',
};

interface SupportTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'feature' | 'bug' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  messages?: Array<{
    userId: string | { _id: string; name: string; email: string };
    message: string;
    attachments?: string[];
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt?: Date;
}

interface SupportTicketsResponse {
  data: SupportTicket[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function SupportTicketsList() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const queryParams = new URLSearchParams();
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (categoryFilter !== 'all') queryParams.set('category', categoryFilter);

  const { data, error, isLoading, mutate } = useSWR<SupportTicketsResponse>(
    `/api/support/tickets?${queryParams.toString()}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Error al cargar los tickets. Intenta nuevamente.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tickets = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="open">Abierto</SelectItem>
            <SelectItem value="in-progress">En Progreso</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="technical">Técnico</SelectItem>
            <SelectItem value="billing">Facturación</SelectItem>
            <SelectItem value="feature">Funcionalidad</SelectItem>
            <SelectItem value="bug">Error</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay tickets con los filtros seleccionados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket: SupportTicket) => {
            const StatusIcon = statusConfig[ticket.status as keyof typeof statusConfig]?.icon || MessageSquare;
            const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];
            const priorityInfo = priorityConfig[ticket.priority as keyof typeof priorityConfig];

            return (
              <Card 
                key={ticket._id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => window.location.href = `/support/tickets/${ticket._id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        <Badge variant="outline">{ticket.ticketNumber}</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {ticket.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge className={statusInfo?.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo?.label}
                    </Badge>
                    <Badge variant="outline" className={priorityInfo?.color}>
                      {priorityInfo?.label}
                    </Badge>
                    <Badge variant="secondary">
                      {categoryConfig[ticket.category as keyof typeof categoryConfig]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(ticket.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                    {ticket.messages && ticket.messages.length > 1 && (
                      <span className="text-sm text-muted-foreground">
                        {ticket.messages.length} mensajes
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

