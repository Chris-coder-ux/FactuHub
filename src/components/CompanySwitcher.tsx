'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Check, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface Company {
  _id: string;
  name: string;
  role: 'owner' | 'admin' | 'accountant' | 'sales' | 'client';
  isOwner: boolean;
}

interface CompaniesResponse {
  companies: Company[];
}

export function CompanySwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);
  
  const currentCompanyId = (session?.user as any)?.companyId;
  
  const { data, error, mutate } = useSWR<CompaniesResponse>(
    '/api/companies',
    fetcher
  );

  const companies = data?.companies || [];
  const currentCompany = companies.find((c) => c._id === currentCompanyId);

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId === currentCompanyId) return;

    setIsSwitching(true);
    try {
      const response = await fetch('/api/companies/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cambiar de compañía');
      }

      const result = await response.json();

      // Update session with new companyId
      await update({
        companyId: result.companyId,
      });

      toast.success(`Cambiado a ${companies.find((c) => c._id === companyId)?.name}`);
      
      // Refresh page to update all data
      router.refresh();
    } catch (error) {
      console.error('Error switching company:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cambiar de compañía');
    } finally {
      setIsSwitching(false);
    }
  };

  if (error) {
    return null; // Fail silently if user has no companies
  }

  if (companies.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push('/companies')}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Crear Compañía
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 min-w-[150px] justify-start"
          disabled={isSwitching}
        >
          {isSwitching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Cambiando...
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4" />
              {currentCompany?.name || 'Seleccionar...'}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Compañías</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <DropdownMenuItem
            key={company._id}
            onClick={() => handleSwitchCompany(company._id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span>{company.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {company.role}
              </span>
            </div>
            {company._id === currentCompanyId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/companies')}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear nueva compañía
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

