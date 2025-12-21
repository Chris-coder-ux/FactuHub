/**
 * Support Ticket Detail Page
 * View and manage a specific support ticket
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { fetcher } from '@/lib/fetcher';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Send, Loader2, MessageSquare, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
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

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    ticketId ? `/api/support/tickets/${ticketId}` : null,
    fetcher
  );

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar el mensaje');
      }

      toast.success('Mensaje enviado correctamente');
      setMessage('');
      mutate(); // Refresh ticket data
    } catch (error) {
      toast.error('Error al enviar el mensaje', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-10 w-64 mb-4" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error al cargar el ticket o ticket no encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ticket = data.data;
  const StatusIcon = statusConfig[ticket.status as keyof typeof statusConfig]?.icon || MessageSquare;
  const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];
  const priorityInfo = priorityConfig[ticket.priority as keyof typeof priorityConfig];

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Tickets
      </Button>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle>{ticket.subject}</CardTitle>
                  <Badge variant="outline">{ticket.ticketNumber}</Badge>
                </div>
                <CardDescription>
                  Creado el {format(new Date(ticket.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={statusInfo?.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo?.label}
                </Badge>
                <Badge variant="outline" className={priorityInfo?.color}>
                  {priorityInfo?.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-line">
                {ticket.description}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversación</CardTitle>
            <CardDescription>
              {ticket.messages?.length || 0} mensaje(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticket.messages && ticket.messages.length > 0 ? (
              ticket.messages.map((msg: any, index: number) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {msg.userId?.name || 'Usuario'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {msg.userId?.email}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(msg.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-line">{msg.message}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No hay mensajes aún
              </p>
            )}

            {ticket.status !== 'closed' && (
              <div className="space-y-2 pt-4 border-t">
                <Textarea
                  placeholder="Escribe tu mensaje..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={5000}
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {message.length}/5000 caracteres
                  </span>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !message.trim()}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Mensaje
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {ticket.resolutionNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Notas de Resolución</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{ticket.resolutionNotes}</p>
              {ticket.resolvedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Resuelto el {format(new Date(ticket.resolvedAt), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

