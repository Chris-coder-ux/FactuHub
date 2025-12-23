'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, CheckCircle, XCircle, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CertificatePinningStatus {
  enabled: boolean;
  totalPins: number;
  totalConfigured: number;
  pins: Array<{
    hostname: string;
    fingerprintsCount: number;
    strict: boolean;
    fingerprintPreview: string | null;
  }>;
  envConfig: {
    aeatProduction: boolean;
    aeatSandbox: boolean;
    bbvaProduction: boolean;
    bbvaSandbox: boolean;
  };
  expectedApis: Array<{
    name: string;
    hostname: string;
    configured: boolean;
  }>;
}

export default function CertificatePinningSettings() {
  const { data, isLoading, mutate } = useSWR<CertificatePinningStatus>(
    '/api/security/certificate-pinning',
    fetcher
  );

  const handleExtractFingerprint = (hostname: string) => {
    toast.info(
      `Para extraer el fingerprint de ${hostname}, ejecuta: npm run cert:extract ${hostname}`,
      { duration: 5000 }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Certificate Pinning</CardTitle>
          <CardDescription>Estado y configuración de pinning de certificados</CardDescription>
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
              <Shield className="h-5 w-5" />
              Certificate Pinning
            </CardTitle>
            <CardDescription>
              Protección contra ataques Man-in-the-Middle (MITM)
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
          <Badge variant="outline">
            {data.totalPins} pin(s) configurado(s)
          </Badge>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">APIs Configuradas</div>
            <div className="text-2xl font-bold">{data.totalConfigured}/4</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">Pins Activos</div>
            <div className="text-2xl font-bold text-green-600">{data.totalPins}</div>
          </div>
        </div>

        {/* Expected APIs */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">APIs Esperadas</h4>
          <div className="space-y-2">
            {data.expectedApis.map((api, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  api.configured
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {api.configured ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium">{api.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {api.hostname}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {api.configured ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Configurado
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExtractFingerprint(api.hostname)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Extraer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configured Pins */}
        {data.pins.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Pins Configurados</h4>
            <div className="space-y-2">
              {data.pins.map((pin, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="font-medium font-mono">{pin.hostname}</div>
                    <div className="text-sm text-muted-foreground">
                      {pin.fingerprintsCount} fingerprint(s)
                      {pin.fingerprintPreview && (
                        <span className="ml-2 font-mono">
                          ...{pin.fingerprintPreview}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={pin.strict ? 'default' : 'outline'}>
                    {pin.strict ? 'Estricto' : 'Permisivo'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning if not configured */}
        {!data.enabled && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Certificate Pinning no está configurado
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  Para habilitar, configura las variables de entorno:
                </p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-400 mt-2 space-y-1 list-disc list-inside">
                  <li>
                    <code>AEAT_PRODUCTION_CERT_FINGERPRINT</code> - Fingerprint de AEAT Producción
                  </li>
                  <li>
                    <code>AEAT_SANDBOX_CERT_FINGERPRINT</code> - Fingerprint de AEAT Sandbox
                  </li>
                  <li>
                    <code>BBVA_PRODUCTION_CERT_FINGERPRINT</code> - Fingerprint de BBVA Producción
                  </li>
                  <li>
                    <code>BBVA_SANDBOX_CERT_FINGERPRINT</code> - Fingerprint de BBVA Sandbox
                  </li>
                </ul>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                  Usa <code>npm run cert:extract &lt;hostname&gt;</code> para extraer fingerprints.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

