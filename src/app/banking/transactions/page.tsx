'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetcher } from '@/lib/fetcher';
import { TransactionList } from '@/components/banking/TransactionList';
import { TransactionFilters, FilterState } from '@/components/banking/TransactionFilters';
import { PaginatedResponse } from '@/lib/pagination';
import { BankTransaction, BankAccount } from '@/types';
import { RefreshCw, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { CreditCard } from 'lucide-react';

export default function BankingTransactionsPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [page, setPage] = useState(1);
  const limit = 20;

  // Build query string
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.bankAccountId) params.append('bankAccountId', filters.bankAccountId);
    if (filters.reconciled && filters.reconciled !== 'all') params.append('reconciled', filters.reconciled);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.minAmount) params.append('minAmount', filters.minAmount);
    if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
    if (filters.search) params.append('search', filters.search);

    return params.toString();
  }, [filters, page, limit]);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<BankTransaction>>(
    `/api/banking/transactions?${queryParams}`,
    fetcher
  );

  // Fetch bank accounts for filter
  const { data: accountsData } = useSWR<{ data: BankAccount[] }>('/api/banking/accounts', fetcher);
  const bankAccounts = accountsData?.data || [];

  const transactions = data?.data || [];
  const pagination = data?.pagination;

  // Calculate statistics
  const stats = useMemo(() => {
    const total = transactions.length;
    const reconciled = transactions.filter(t => t.reconciled).length;
    const unreconciled = total - reconciled;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const reconciledAmount = transactions
      .filter(t => t.reconciled)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      total,
      reconciled,
      unreconciled,
      totalAmount,
      reconciledAmount,
      reconciliationRate: total > 0 ? (reconciled / total) * 100 : 0,
    };
  }, [transactions]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleSync = async () => {
    try {
      // Get first active bank account
      const activeAccount = bankAccounts.find(acc => acc.status === 'active');
      if (!activeAccount) {
        toast.error('No hay cuentas bancarias activas');
        return;
      }

      const response = await fetch('/api/banking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: activeAccount._id }),
      });

      if (!response.ok) {
        throw new Error('Error al sincronizar');
      }

      toast.success('Transacciones sincronizadas');
      mutate();
    } catch (error) {
      toast.error('Error al sincronizar transacciones');
      console.error(error);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-red-600">Error al cargar las transacciones</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Transacciones Bancarias</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y concilia tus transacciones bancarias
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En este período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conciliadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.reconciled}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.reconciliationRate.toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.unreconciled}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats.reconciledAmount)} conciliado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <TransactionFilters
        bankAccounts={bankAccounts}
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />

      {/* Transactions List */}
      {transactions.length === 0 && !isLoading ? (
        <EmptyState
          icon={CreditCard}
          title="No hay transacciones"
          description="Sincroniza tus cuentas bancarias para ver las transacciones"
        />
      ) : (
        <>
          <TransactionList transactions={transactions} isLoading={isLoading} />
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNextPage}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

