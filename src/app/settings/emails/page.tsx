'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Filter, RefreshCw, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EmailLog {
  _id: string;
  type: 'invoice' | 'overdue' | 'payment' | 'team_invite' | 'fiscal_reminder' | 'other';
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  metadata?: Record<string, any>;
  sentAt?: string;
  createdAt: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface EmailLogsResponse {
  logs: EmailLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const typeLabels: Record<string, string> = {
  invoice: 'Factura',
  overdue: 'Factura Vencida',
  payment: 'Confirmación de Pago',
  team_invite: 'Invitación a Equipo',
  fiscal_reminder: 'Recordatorio Fiscal',
  other: 'Otro',
};

const statusLabels: Record<string, string> = {
  sent: 'Enviado',
  failed: 'Fallido',
  pending: 'Pendiente',
};

const statusColors: Record<string, 'default' | 'destructive' | 'secondary'> = {
  sent: 'default',
  failed: 'destructive',
  pending: 'secondary',
};

export default function EmailLogsPage() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const queryParams = new URLSearchParams();
  if (typeFilter !== 'all') queryParams.set('type', typeFilter);
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  queryParams.set('page', page.toString());
  queryParams.set('limit', '20');

  const { data, error, isLoading, mutate } = useSWR<EmailLogsResponse>(
    `/api/emails/logs?${queryParams.toString()}`,
    fetcher
  );

  const stats = useMemo(() => {
    if (!data) return null;

    const total = data.total;
    const sent = data.logs.filter(log => log.status === 'sent').length;
    const failed = data.logs.filter(log => log.status === 'failed').length;
    const pending = data.logs.filter(log => log.status === 'pending').length;

    return { total, sent, failed, pending };
  }, [data]);

  const handleRefresh = () => {
    mutate();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp', { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Emails</h1>
          <p className="text-muted-foreground">
            Revisa todos los emails enviados desde tu cuenta
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Enviados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Fallidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type-filter">Tipo de Email</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="invoice">Factura</SelectItem>
                  <SelectItem value="overdue">Factura Vencida</SelectItem>
                  <SelectItem value="payment">Confirmación de Pago</SelectItem>
                  <SelectItem value="team_invite">Invitación a Equipo</SelectItem>
                  <SelectItem value="fiscal_reminder">Recordatorio Fiscal</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-filter">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Emails Enviados</CardTitle>
          <CardDescription>
            {data ? `${data.total} emails encontrados` : 'Cargando...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Error al cargar los emails. Intenta de nuevo.
            </div>
          ) : !data || data.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron emails</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Fecha</th>
                      <th className="text-left p-4 font-medium">Tipo</th>
                      <th className="text-left p-4 font-medium">Destinatario</th>
                      <th className="text-left p-4 font-medium">Asunto</th>
                      <th className="text-left p-4 font-medium">Estado</th>
                      <th className="text-left p-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <tr key={log._id} className="border-b hover:bg-muted/50">
                        <td className="p-4 text-sm">
                          {log.sentAt ? formatDate(log.sentAt) : formatDate(log.createdAt)}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{typeLabels[log.type] || log.type}</Badge>
                        </td>
                        <td className="p-4 text-sm">{log.to}</td>
                        <td className="p-4 text-sm max-w-md truncate">{log.subject}</td>
                        <td className="p-4">
                          <Badge variant={statusColors[log.status]}>
                            {statusLabels[log.status]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEmail(log)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {data.page} de {data.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={page === data.totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Details Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Email</DialogTitle>
            <DialogDescription>
              Información completa del email enviado
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <p className="text-sm">
                    <Badge variant="outline">{typeLabels[selectedEmail.type]}</Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <p className="text-sm">
                    <Badge variant={statusColors[selectedEmail.status]}>
                      {statusLabels[selectedEmail.status]}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">De</Label>
                  <p className="text-sm">
                    {selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.from}>` : selectedEmail.from}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Para</Label>
                  <p className="text-sm">{selectedEmail.to}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Asunto</Label>
                  <p className="text-sm">{selectedEmail.subject}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fecha de Creación</Label>
                  <p className="text-sm">{formatDate(selectedEmail.createdAt)}</p>
                </div>
                {selectedEmail.sentAt && (
                  <div>
                    <Label className="text-sm font-medium">Fecha de Envío</Label>
                    <p className="text-sm">{formatDate(selectedEmail.sentAt)}</p>
                  </div>
                )}
                {selectedEmail.userId && (
                  <div>
                    <Label className="text-sm font-medium">Enviado por</Label>
                    <p className="text-sm">
                      {selectedEmail.userId.name} ({selectedEmail.userId.email})
                    </p>
                  </div>
                )}
              </div>

              {selectedEmail.errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-sm font-medium text-red-800">Error</Label>
                  <p className="text-sm text-red-700 mt-1">{selectedEmail.errorMessage}</p>
                </div>
              )}

              {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Metadata</Label>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto mt-2">
                    {JSON.stringify(selectedEmail.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

