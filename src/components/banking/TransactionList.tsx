'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BankTransaction } from '@/types';
import { CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Eye, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface TransactionListProps {
  transactions: BankTransaction[];
  isLoading?: boolean;
  onReconcile?: (transactionId: string, invoiceId: string) => void;
}

export function TransactionList({ transactions, isLoading, onReconcile }: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'dd/MM/yyyy');
  };

  const getReconciledBadge = (transaction: BankTransaction) => {
    if (transaction.reconciled) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Conciliada
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <XCircle className="h-3 w-3 mr-1" />
        Pendiente
      </Badge>
    );
  };

  const getAmountIcon = (amount: number) => {
    return amount >= 0 ? (
      <ArrowDownRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-red-600" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>No se encontraron transacciones</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {transactions.map((transaction) => {
          const bankAccount = typeof transaction.bankAccountId === 'object' 
            ? transaction.bankAccountId 
            : null;
          const invoice = typeof transaction.reconciledInvoiceId === 'object'
            ? transaction.reconciledInvoiceId
            : null;

          return (
            <Card key={transaction._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getAmountIcon(transaction.amount)}
                      <span className="font-semibold text-lg">
                        {formatAmount(transaction.amount)}
                      </span>
                      {getReconciledBadge(transaction)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {transaction.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDate(transaction.date)}</span>
                      {bankAccount && (
                        <span>
                          {bankAccount.name} - {bankAccount.accountNumber}
                        </span>
                      )}
                      {transaction.category && (
                        <Badge variant="outline" className="text-xs">
                          {transaction.category}
                        </Badge>
                      )}
                    </div>

                    {invoice && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <LinkIcon className="h-3 w-3 text-blue-600" />
                          <span className="text-muted-foreground">Factura:</span>
                          <Link 
                            href={`/invoices/${invoice._id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                          <span className="text-muted-foreground">
                            ({formatAmount(invoice.total)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la Transacción</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Monto</label>
                <p className="text-lg font-semibold">
                  {formatAmount(selectedTransaction.amount)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                <p>{selectedTransaction.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fecha</label>
                <p>{formatDate(selectedTransaction.date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <div className="mt-1">
                  {getReconciledBadge(selectedTransaction)}
                </div>
              </div>
              {selectedTransaction.category && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                  <p>{selectedTransaction.category}</p>
                </div>
              )}
              {typeof selectedTransaction.reconciledInvoiceId === 'object' && selectedTransaction.reconciledInvoiceId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Factura Conciliada</label>
                  <div className="mt-1">
                    <Link
                      href={`/invoices/${selectedTransaction.reconciledInvoiceId._id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selectedTransaction.reconciledInvoiceId.invoiceNumber}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

