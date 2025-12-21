'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full border-red-200 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-600 h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-red-700">
            Algo salió mal
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-slate-600 text-sm">
            Se ha producido un error inesperado. El error ha sido reportado automáticamente.
            {error.digest && (
              <span className="block mt-2 text-xs text-muted-foreground">
                ID de error: {error.digest}
              </span>
            )}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              Recargar página
            </Button>
            <Button
              onClick={reset}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Intentar de nuevo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

