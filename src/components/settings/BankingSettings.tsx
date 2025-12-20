import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Banknote, RefreshCw, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface BankAccount {
  _id: string;
  bankName: string;
  accountNumber: string;
  status: string;
  lastSync?: string;
}

interface BankingSettingsProps {
  bankAccounts: BankAccount[];
}

export default function BankingSettings({ bankAccounts }: BankingSettingsProps) {
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState<string | null>(null);

  const connectBank = async (bank: string) => {
    setConnecting(true);
    try {
      const response = await fetch(`/api/banking/connect?bank=${bank}`);
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error('Error conectando banco');
      }
    } catch (error) {
      toast.error('Error conectando banco');
    } finally {
      setConnecting(false);
    }
  };

  const syncTransactions = async (bankAccountId: string) => {
    setSyncing(bankAccountId);
    try {
      const response = await fetch('/api/banking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Sincronizadas ${data.transactionsCount} transacciones`);
      } else {
        toast.error('Error sincronizando');
      }
    } catch (error) {
      toast.error('Error sincronizando');
    } finally {
      setSyncing(null);
    }
  };

  const reconcileTransactions = async (bankAccountId: string) => {
    setReconciling(bankAccountId);
    try {
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

      const response = await fetch('/api/banking/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Conciliadas ${data.reconciledCount} de ${data.totalTransactions} transacciones`);
      } else {
        toast.error('Error conciliando');
      }
    } catch (error) {
      toast.error('Error conciliando');
    } finally {
      setReconciling(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Cuentas Bancarias
          </CardTitle>
          <CardDescription>
            Conecta tus cuentas bancarias para conciliación automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bankAccounts.length === 0 ? (
            <p className="text-muted-foreground">No hay cuentas conectadas</p>
          ) : (
            bankAccounts.map((account) => (
              <div key={account._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{account.bankName}</p>
                  <p className="text-sm text-muted-foreground">{account.accountNumber}</p>
                  <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                    {account.status}
                  </Badge>
                  {account.lastSync && (
                    <p className="text-xs text-muted-foreground">
                      Última sync: {new Date(account.lastSync).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncTransactions(account._id)}
                    disabled={syncing === account._id || reconciling === account._id}
                  >
                    {syncing === account._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Sincronizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reconcileTransactions(account._id)}
                    disabled={syncing === account._id || reconciling === account._id}
                  >
                    {reconciling === account._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Calculator className="h-4 w-4" />
                    )}
                    Conciliar
                  </Button>
                </div>
              </div>
            ))
          )}

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Conectar nuevo banco</h4>
            <div className="flex gap-2">
              <Button
                onClick={() => connectBank('bbva')}
                disabled={connecting}
                variant="outline"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Conectar BBVA
              </Button>
              {/* Add more banks */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}