'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Database, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MaterializedViewsStatus {
  enabled: boolean;
  totalViews: number;
  expiredViews: number;
  activeViews: number;
  viewsByType: Array<{
    viewType: string;
    period: string;
    count: number;
    lastUpdated: string | null;
    oldest: string | null;
    newest: string | null;
  }>;
  lastRefresh: number | null;
}

const viewTypeLabels: Record<string, string> = {
  client_profitability: 'Rentabilidad de Clientes',
  product_profitability: 'Rentabilidad de Productos',
  trends: 'Tendencias',
  cash_flow: 'Flujo de Caja',
  summary: 'Resumen',
};

const periodLabels: Record<string, string> = {
  daily: 'Diario',
  monthly: 'Mensual',
  all_time: 'Todo el Tiempo',
};

export default function MaterializedViewsSettings() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInvalidating, setIsInvalidating] = useState(false);

  const { data, isLoading, mutate } = useSWR<MaterializedViewsStatus>(
    '/api/analytics/materialized-views',
    fetcher
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/analytics/materialized-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al refrescar vistas');
      }

      toast.success('Vistas materializadas refrescadas correctamente');
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al refrescar vistas');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInvalidate = async (viewTypes?: string[]) => {
    setIsInvalidating(true);
    try {
      const params = viewTypes ? `?viewTypes=${viewTypes.join(',')}` : '';
      const response = await fetch(`/api/analytics/materialized-views${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al invalidar vistas');
      }

      toast.success('Vistas invalidadas correctamente');
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al invalidar vistas');
    } finally {
      setIsInvalidating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vistas Materializadas</CardTitle>
          <CardDescription>Estado y gestión de vistas pre-calculadas</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Vistas Materializadas
            </CardTitle>
            <CardDescription>
              Vistas pre-calculadas para mejorar el rendimiento de analytics
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleInvalidate()}
              disabled={isInvalidating || !data.enabled}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Invalidar Todas
            </Button>
            <Button
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || !data.enabled}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {data.enabled ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">
              {data.enabled ? 'Habilitado' : 'Deshabilitado'}
            </span>
          </div>
          {!data.enabled && (
            <Badge variant="outline" className="text-xs">
              Configurar ENABLE_ANALYTICS_MATERIALIZED_VIEWS=true
            </Badge>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">Total de Vistas</div>
            <div className="text-2xl font-bold">{data.totalViews}</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">Vistas Activas</div>
            <div className="text-2xl font-bold text-green-600">{data.activeViews}</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">Vistas Expiradas</div>
            <div className="text-2xl font-bold text-orange-600">{data.expiredViews}</div>
          </div>
        </div>

        {/* Last Refresh */}
        {data.lastRefresh && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Última actualización:{' '}
              {format(new Date(data.lastRefresh), "PPpp", { locale: es })}
            </span>
          </div>
        )}

        {/* Views by Type */}
        {data.viewsByType.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Vistas por Tipo</h4>
            <div className="space-y-2">
              {data.viewsByType.map((view, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {viewTypeLabels[view.viewType] || view.viewType} -{' '}
                      {periodLabels[view.period] || view.period}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {view.count} vista(s)
                    </div>
                  </div>
                  <div className="text-right">
                    {view.lastUpdated && (
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(view.lastUpdated), "PPp", { locale: es })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.viewsByType.length === 0 && data.enabled && (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay vistas materializadas aún</p>
            <p className="text-sm">Las vistas se generarán automáticamente o al hacer clic en &quot;Refrescar&quot;</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

