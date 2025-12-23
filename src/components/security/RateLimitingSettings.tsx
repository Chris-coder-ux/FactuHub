'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, CheckCircle, XCircle, RefreshCw, Database, Server } from 'lucide-react';
import { toast } from 'sonner';

interface RateLimitingStatus {
  enabled: boolean;
  usingRedis: boolean;
  usingInMemory: boolean;
  limits: {
    auth: { limit: number; windowMs: number };
    api: { limit: number; windowMs: number };
    mutation: { limit: number; windowMs: number };
    email: { limit: number; windowMs: number };
  };
  metrics?: {
    totalKeys?: number;
    topIdentifiers?: Array<{ identifier: string; count: number }>;
  };
}

const limitLabels: Record<string, string> = {
  auth: 'Autenticación',
  api: 'API General',
  mutation: 'Mutaciones',
  email: 'Envío de Emails',
};

function formatWindowMs(windowMs: number): string {
  if (windowMs < 60000) {
    return `${windowMs / 1000}s`;
  } else if (windowMs < 3600000) {
    return `${windowMs / 60000}min`;
  } else {
    return `${windowMs / 3600000}h`;
  }
}

export default function RateLimitingSettings() {
  const { data, isLoading, mutate } = useSWR<RateLimitingStatus>(
    '/api/security/rate-limiting',
    fetcher
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting Distribuido</CardTitle>
          <CardDescription>Estado y configuración de límites de tasa</CardDescription>
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
              <Activity className="h-5 w-5" />
              Rate Limiting Distribuido
            </CardTitle>
            <CardDescription>
              Control de tasa de requests para prevenir abuso
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
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
          {data.usingRedis ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300">
              <Database className="h-3 w-3 mr-1" />
              Redis Distribuido
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
              <Server className="h-3 w-3 mr-1" />
              In-Memory (Fallback)
            </Badge>
          )}
        </div>

        {/* Metrics */}
        {data.metrics && (
          <div className="grid grid-cols-2 gap-4">
            {data.metrics.totalKeys !== undefined && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total de Keys</div>
                <div className="text-2xl font-bold">{data.metrics.totalKeys}</div>
              </div>
            )}
            {data.metrics.topIdentifiers && data.metrics.topIdentifiers.length > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Top Identificadores</div>
                <div className="text-2xl font-bold">{data.metrics.topIdentifiers.length}</div>
              </div>
            )}
          </div>
        )}

        {/* Top Identifiers */}
        {data.metrics?.topIdentifiers && data.metrics.topIdentifiers.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Top Identificadores Activos</h4>
            <div className="space-y-1">
              {data.metrics.topIdentifiers.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                >
                  <code className="text-xs font-mono">{item.identifier}</code>
                  <Badge variant="secondary">{item.count} requests</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rate Limits Configuration */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Límites Configurados</h4>
          <div className="space-y-2">
            {Object.entries(data.limits).map(([key, limit]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{limitLabels[key] || key}</div>
                  <div className="text-sm text-muted-foreground">
                    {limit.limit} requests por {formatWindowMs(limit.windowMs)}
                  </div>
                </div>
                <Badge variant="outline">
                  {limit.limit}/{formatWindowMs(limit.windowMs)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        {data.usingInMemory && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Nota:</strong> Rate limiting está usando almacenamiento in-memory.
              Para escalabilidad multi-instancia, configura Redis con{' '}
              <code className="text-xs">UPSTASH_REDIS_REST_URL</code> y{' '}
              <code className="text-xs">UPSTASH_REDIS_REST_TOKEN</code>.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

