'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NoCompanyBannerProps {
  error?: string;
  onDismiss?: () => void;
}

export function NoCompanyBanner({ error, onDismiss }: NoCompanyBannerProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCompany = async () => {
    setIsCreating(true);
    try {
      // Redirect to companies page
      router.push('/companies');
    } catch (err) {
      toast.error('Error al navegar a la página de compañías');
    } finally {
      setIsCreating(false);
    }
  };

  if (!error || (!error.includes('No company found') && !error.includes('create a company'))) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <CardTitle className="text-orange-900 dark:text-orange-100">
            Compañía Requerida
          </CardTitle>
        </div>
        <CardDescription className="text-orange-800 dark:text-orange-200">
          Necesitas crear o unirte a una compañía para continuar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-800 dark:text-orange-200">
          Para usar esta aplicación, necesitas crear una compañía o que un administrador te agregue a una existente.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateCompany}
            disabled={isCreating}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Building2 className="h-4 w-4 mr-2" />
            {isCreating ? 'Cargando...' : 'Crear Mi Primera Compañía'}
          </Button>
          {onDismiss && (
            <Button
              variant="outline"
              onClick={onDismiss}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Cerrar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

