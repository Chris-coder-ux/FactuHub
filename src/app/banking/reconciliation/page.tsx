'use client';

import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { BankAccount } from '@/types';
import { EmptyState } from '@/components/EmptyState';
import { Calculator } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy reconciliation dashboard component
const ReconciliationDashboard = dynamic(() => import('@/components/banking/ReconciliationDashboard').then(mod => ({ default: mod.ReconciliationDashboard })), {
  loading: () => <Skeleton className="h-96 w-full" />,
  ssr: false
});

export default function BankingReconciliationPage() {
  const { data: accountsData, error } = useSWR<{ data: BankAccount[] }>('/api/banking/accounts', fetcher);
  const bankAccounts = accountsData?.data || [];

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-red-600">Error al cargar las cuentas bancarias</p>
      </div>
    );
  }

  if (bankAccounts.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <EmptyState
          icon={Calculator}
          title="No hay cuentas bancarias"
          description="Conecta una cuenta bancaria para comenzar la conciliación"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Conciliación Bancaria</h1>
        <p className="text-muted-foreground mt-1">
          Concilia automáticamente tus transacciones bancarias con facturas
        </p>
      </div>
      <ReconciliationDashboard bankAccounts={bankAccounts} />
    </div>
  );
}

