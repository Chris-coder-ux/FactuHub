'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetcher } from '@/lib/fetcher';
import { MatchingSuggestions } from './MatchingSuggestions';
import { BankAccount, MatchingSuggestion } from '@/types';
import { RefreshCw, TrendingUp, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface ReconciliationDashboardProps {
  bankAccounts: BankAccount[];
}

export function ReconciliationDashboard({ bankAccounts }: ReconciliationDashboardProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [periodStart, setPeriodStart] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reconciling, setReconciling] = useState(false);

  const accountId = selectedAccount === 'all' ? undefined : selectedAccount;
  const { data: suggestionsData, error: suggestionsError, mutate: mutateSuggestions } = useSWR<{ suggestions: MatchingSuggestion[] }>(
    accountId ? `/api/banking/reconciliation/suggestions?bankAccountId=${accountId}&limit=10` : null,
    fetcher
  );

  const suggestions = suggestionsData?.suggestions || [];

  // Calculate statistics from suggestions
  const stats = {
    totalSuggestions: suggestions.length,
    highConfidence: suggestions.filter(s => s.matches && s.matches.some(m => m.score >= 0.8)).length,
    mediumConfidence: suggestions.filter(s => s.matches && s.matches.some(m => m.score >= 0.6 && m.score < 0.8)).length,
    lowConfidence: suggestions.filter(s => s.matches && s.matches.some(m => m.score < 0.6)).length,
    totalAmount: suggestions.reduce((sum, s) => sum + (s.transaction?.amount || 0), 0),
  };

  const handleAutoReconcile = async () => {
    if (!accountId) {
      toast.error('Selecciona una cuenta bancaria');
      return;
    }

    setReconciling(true);
    try {
      const response = await fetch('/api/banking/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: accountId,
          periodStart,
          periodEnd,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al conciliar');
      }

      const data = await response.json();
      toast.success(`Conciliación completada: ${data.reconciledCount} transacciones conciliadas`);
      mutateSuggestions();
    } catch (error) {
      toast.error('Error al realizar la conciliación automática');
      console.error(error);
    } finally {
      setReconciling(false);
    }
  };

  const chartData = [
    { name: 'Alta (≥80%)', value: stats.highConfidence, color: '#10b981' },
    { name: 'Media (60-79%)', value: stats.mediumConfidence, color: '#f59e0b' },
    { name: 'Baja (<60%)', value: stats.lowConfidence, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Conciliación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Cuenta Bancaria</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account._id} value={account._id!}>
                      {account.bankName} - {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleAutoReconcile}
            disabled={reconciling || !accountId || accountId === 'all'}
            className="w-full md:w-auto"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {reconciling ? 'Conciliando...' : 'Conciliación Automática'}
          </Button>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sugerencias Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuggestions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Transacciones pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alta Confianza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.highConfidence}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ≥80% coincidencia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Media Confianza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.mediumConfidence}</div>
            <p className="text-xs text-muted-foreground mt-1">
              60-79% coincidencia
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
              En sugerencias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {stats.totalSuggestions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Confianza</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Matching Suggestions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Sugerencias de Conciliación</h2>
          <Button variant="outline" size="sm" onClick={() => mutateSuggestions()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
        {suggestionsError ? (
          <Card>
            <CardContent className="p-6 text-center text-red-600">
              Error al cargar sugerencias. Por favor, selecciona una cuenta bancaria.
            </CardContent>
          </Card>
        ) : (
          <MatchingSuggestions
            suggestions={suggestions}
            onReconcile={() => mutateSuggestions()}
          />
        )}
      </div>
    </div>
  );
}

