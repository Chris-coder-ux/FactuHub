'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchingSuggestion } from '@/types';
import { CheckCircle, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

interface MatchingSuggestionsProps {
  readonly suggestions: MatchingSuggestion[];
  readonly onReconcile?: (transactionId: string, invoiceId: string) => void;
}

export function MatchingSuggestions({ suggestions, onReconcile }: MatchingSuggestionsProps) {
  const [reconciling, setReconciling] = useState<Set<string>>(new Set());

  const formatAmount = (amount: number) => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return '0,00 €';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const handleReconcile = async (transactionId: string, invoiceId: string) => {
    if (reconciling.has(transactionId)) return;

    setReconciling(prev => new Set(prev).add(transactionId));

    try {
      const response = await fetch('/api/banking/reconcile/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          invoiceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al conciliar');
      }

      toast.success('Transacción conciliada exitosamente');
      if (onReconcile) {
        onReconcile(transactionId, invoiceId);
      }
    } catch (error) {
      toast.error('Error al conciliar la transacción');
      console.error(error);
    } finally {
      setReconciling(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>No hay sugerencias de conciliación disponibles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => {
        if (!suggestion.transaction?._id) return null;
        
        return (
          <Card key={suggestion.transaction._id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {formatAmount(suggestion.transaction.amount || 0)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {suggestion.transaction.description || 'Sin descripción'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(suggestion.transaction.date)}
                  </p>
                </div>
                <Badge variant="secondary">
                  {suggestion.matches?.length ?? 0} coincidencia{(suggestion.matches?.length ?? 0) !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {suggestion.matches?.map((match, index) => (
                  <div
                    key={`${suggestion.transaction._id}-${match.invoice?._id ?? index}`}
                    className="p-3 border rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {match.invoice?._id ? (
                            <Link
                              href={`/invoices/${match.invoice._id}`}
                              className="font-semibold text-blue-600 hover:underline"
                            >
                              Factura {match.invoice.invoiceNumber || 'N/A'}
                            </Link>
                          ) : (
                            <span className="font-semibold">Factura N/A</span>
                          )}
                          <Badge className={getScoreColor(match.score || 0)}>
                            {((match.score || 0) * 100).toFixed(0)}% coincidencia
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            Cliente: {match.invoice?.client && typeof match.invoice.client === 'object' && 'name' in match.invoice.client ? match.invoice.client.name : 'N/A'}
                          </p>
                          <p>
                            Monto: {formatAmount(match.invoice?.total || 0)} | 
                            Fecha: {formatDate(match.invoice?.dueDate || match.invoice?.createdAt)}
                          </p>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Razones:</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {match.reasons?.map((reason, i) => (
                              <li key={`reason-${i}-${reason.substring(0, 10)}`} className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (suggestion.transaction?._id && match.invoice?._id) {
                              handleReconcile(suggestion.transaction._id, match.invoice._id);
                            }
                          }}
                          disabled={reconciling.has(suggestion.transaction?._id || '') || !match.invoice?._id}
                          className="whitespace-nowrap"
                        >
                          {reconciling.has(suggestion.transaction?._id || '') ? (
                            'Conciliando...'
                          ) : (
                            <>
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Conciliar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
