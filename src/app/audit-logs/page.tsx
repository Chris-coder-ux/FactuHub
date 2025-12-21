'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface AuditLog {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    fields?: string[];
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const actionLabels: Record<string, string> = {
  create: 'Crear',
  update: 'Actualizar',
  delete: 'Eliminar',
  view: 'Ver',
  export: 'Exportar',
  login: 'Iniciar sesión',
  logout: 'Cerrar sesión',
  permission_change: 'Cambiar permisos',
  settings_change: 'Cambiar configuración',
};

const resourceTypeLabels: Record<string, string> = {
  invoice: 'Factura',
  client: 'Cliente',
  product: 'Producto',
  expense: 'Gasto',
  receipt: 'Recibo',
  user: 'Usuario',
  company: 'Empresa',
  settings: 'Configuración',
  banking: 'Bancario',
  fiscal: 'Fiscal',
  other: 'Otro',
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  view: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  export: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  login: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  logout: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  permission_change: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  settings_change: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
};

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [successFilter, setSuccessFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '50');
    if (actionFilter !== 'all') params.set('action', actionFilter);
    if (resourceTypeFilter !== 'all') params.set('resourceType', resourceTypeFilter);
    if (successFilter !== 'all') params.set('success', successFilter);
    return params.toString();
  };

  const { data: logsData, error, isLoading } = useSWR<AuditLogsResponse>(
    `/api/audit-logs?${buildQueryParams()}`,
    fetcher
  );

  const logs = useMemo(() => {
    return logsData?.data || [];
  }, [logsData]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    
    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.userId?.name?.toLowerCase().includes(query) ||
      log.userId?.email?.toLowerCase().includes(query) ||
      log.resourceId?.toLowerCase().includes(query) ||
      log.ipAddress?.toLowerCase().includes(query) ||
      actionLabels[log.action]?.toLowerCase().includes(query) ||
      resourceTypeLabels[log.resourceType]?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-red-600">Error al cargar los logs de auditoría</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Logs de Auditoría</h1>
          <p className="text-muted-foreground mt-1">
            Registro de todas las acciones realizadas en el sistema
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por usuario, recurso, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">Todas las acciones</option>
          {Object.entries(actionLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={resourceTypeFilter}
          onChange={(e) => setResourceTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">Todos los tipos</option>
          {Object.entries(resourceTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={successFilter}
          onChange={(e) => setSuccessFilter(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">Todos</option>
          <option value="true">Exitosos</option>
          <option value="false">Fallidos</option>
        </select>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay logs de auditoría"
          description="No se encontraron registros que coincidan con los filtros"
        />
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <motion.div
              key={log._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={actionColors[log.action] || 'bg-gray-100 text-gray-800'}>
                          {actionLabels[log.action] || log.action}
                        </Badge>
                        <Badge variant="outline">
                          {resourceTypeLabels[log.resourceType] || log.resourceType}
                        </Badge>
                        {log.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{log.userId?.name || log.userId?.email || 'Usuario desconocido'}</span>
                        </div>
                        {log.resourceId && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4" />
                            <span>ID: {log.resourceId}</span>
                          </div>
                        )}
                        {log.ipAddress && (
                          <div className="flex items-center gap-1">
                            <span>IP: {log.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), "PPpp")}
                    </div>
                  </div>

                  {log.changes && (log.changes.fields?.length || Object.keys(log.changes.before || {}).length > 0) && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-sm font-semibold mb-2">Cambios:</p>
                      {log.changes.fields && (
                        <p className="text-xs text-muted-foreground">
                          Campos modificados: {log.changes.fields.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {log.errorMessage && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        <strong>Error:</strong> {log.errorMessage}
                      </p>
                    </div>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-4">
                      <summary className="text-sm font-semibold cursor-pointer">Ver detalles</summary>
                      <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {logsData?.pagination && logsData.pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {logsData.pagination.page} de {logsData.pagination.pages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(logsData.pagination.pages, p + 1))}
            disabled={page === logsData.pagination.pages}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

