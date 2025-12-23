'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Database, CheckCircle2, XCircle, Loader2, AlertCircle, Info } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface RedisStatus {
  connected: boolean;
  usingBull: boolean;
  queueSize: number;
  error?: string;
}

export default function RedisSettings() {
  const [redisUrl, setRedisUrl] = useState('');
  const [useIndividualVars, setUseIndividualVars] = useState(false);
  const [redisHost, setRedisHost] = useState('');
  const [redisPort, setRedisPort] = useState('');
  const [redisPassword, setRedisPassword] = useState('');
  const [redisTls, setRedisTls] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current Redis status
  const { data: statusData, mutate: mutateStatus } = useSWR<{ success: boolean; data: RedisStatus }>(
    '/api/redis/status',
    fetcher,
    { refreshInterval: 10000 } // Refresh every 10 seconds
  );

  const status = statusData?.data;

  // Load current configuration from environment (read-only display)
  useEffect(() => {
    // Note: In production, these would come from a secure API endpoint
    // For now, we'll show a message that configuration is via environment variables
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const config = useIndividualVars
        ? {
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            tls: redisTls,
          }
        : {
            url: redisUrl,
          };

      const response = await fetch('/api/redis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('✅ Conexión Redis exitosa');
        mutateStatus();
      } else {
        toast.error(`❌ Error de conexión: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      toast.error('Error al probar la conexión');
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    // Note: In production, this would save to environment variables or a secure config store
    toast.info('La configuración de Redis se realiza mediante variables de entorno. Consulta la documentación.');
  };

  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-muted/50">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>Configuración de Redis (Cola VeriFactu)</CardTitle>
        </div>
        <CardDescription>
          Configura la conexión Redis para la cola de procesamiento VeriFactu usando Bull.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Status Display */}
        {status && (
          <div className={`p-4 rounded-lg border-2 ${
            status.connected
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              {status.connected ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    Estado: {status.connected ? 'Conectado' : 'No conectado'}
                  </span>
                </div>
                {status.connected && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Modo: {status.usingBull ? 'Bull (Redis)' : 'In-memory (fallback)'}</p>
                    {status.usingBull && (
                      <p>Jobs en cola: {status.queueSize}</p>
                    )}
                  </div>
                )}
                {!status.connected && status.error && (
                  <p className="text-sm text-amber-700">{status.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Alert */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-medium">Configuración mediante Variables de Entorno</p>
              <p>
                La configuración de Redis se realiza mediante variables de entorno en el servidor.
                Usa este formulario para probar la conexión antes de configurar las variables.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Mode Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Usar Variables Individuales</Label>
            <p className="text-sm text-muted-foreground">
              Alterna entre URL completa o variables individuales (host, port, password).
            </p>
          </div>
          <Switch
            checked={useIndividualVars}
            onCheckedChange={setUseIndividualVars}
          />
        </div>

        {/* Configuration Form */}
        {!useIndividualVars ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="redisUrl">URL de Redis</Label>
              <Input
                id="redisUrl"
                type="text"
                value={redisUrl}
                onChange={(e) => setRedisUrl(e.target.value)}
                placeholder="rediss://default:password@xxx.upstash.io:6379"
              />
              <p className="text-xs text-muted-foreground">
                Formato: redis://[:password@]host:port[/db] o rediss:// para conexiones TLS
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="redisHost">Host</Label>
                <Input
                  id="redisHost"
                  type="text"
                  value={redisHost}
                  onChange={(e) => setRedisHost(e.target.value)}
                  placeholder="xxx.upstash.io"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redisPort">Puerto</Label>
                <Input
                  id="redisPort"
                  type="number"
                  value={redisPort}
                  onChange={(e) => setRedisPort(e.target.value)}
                  placeholder="6379"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="redisPassword">Contraseña</Label>
              <Input
                id="redisPassword"
                type="password"
                value={redisPassword}
                onChange={(e) => setRedisPassword(e.target.value)}
                placeholder="Tu contraseña de Redis"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm">Usar TLS/SSL</Label>
                <p className="text-xs text-muted-foreground">
                  Requerido para Upstash y Redis Cloud
                </p>
              </div>
              <Switch
                checked={redisTls}
                onCheckedChange={setRedisTls}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || (!redisUrl && !useIndividualVars) || (useIndividualVars && (!redisHost || !redisPort))}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Probando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Probar Conexión
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Ver Documentación'
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
          <p className="font-medium">📚 Guía de Configuración:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Para Upstash: Usa la conexión Redis tradicional (no REST API)</li>
            <li>Formato URL: <code className="text-xs">rediss://default:password@host:port</code></li>
            <li>Las variables de entorno deben configurarse en el servidor</li>
            <li>Consulta <code className="text-xs">docs/REDIS_SETUP.md</code> para más detalles</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

