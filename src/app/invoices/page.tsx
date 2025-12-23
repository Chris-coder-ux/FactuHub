'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ArrowUpDown, 
  Mail, 
  FileEdit, 
  FileDown, 
  FileText,
  Plus,
  RefreshCcw,
  Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Invoice } from '@/types';
import { PaginatedResponse } from '@/lib/pagination';
import { InvoicePDFPreview } from '@/components/invoices/InvoicePDFPreview';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';

const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | null => {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    paid: 'default',
    sent: 'secondary'
  };
  return variants[status] || 'destructive';
};

const getVeriFactuBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" | null => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: 'outline',
    sent: 'secondary',
    verified: 'default',
    rejected: 'destructive',
    error: 'destructive'
  };
  return status ? variants[status] || 'outline' : null;
};

const getInvoiceValue = (invoice: Invoice, key: keyof Invoice | 'client') => 
  key === 'client' ? (invoice.client?.name || '') : (invoice[key as keyof Invoice] || '');

const compareInvoices = (
  a: Invoice, 
  b: Invoice, 
  key: keyof Invoice | 'client', 
  direction: 'asc' | 'desc'
) => {
  const aVal = getInvoiceValue(a, key);
  const bVal = getInvoiceValue(b, key);
  
  if (aVal === bVal) return 0;
  
  const result = aVal < bVal ? -1 : 1;
  return direction === 'asc' ? result : -result;
};

const filterAndSortInvoices = (
  data: Invoice[], 
  query: string, 
  sort: { key: keyof Invoice | 'client', direction: 'asc' | 'desc' } | null
) => {
  if (!query && !sort) return data;

  let filtered = data;
  if (query) {
    const q = query.toLowerCase();
    filtered = data.filter(inv => 
      (inv.invoiceNumber?.toLowerCase().includes(q) ||
       inv.client?.name?.toLowerCase().includes(q))
    );
  }

  if (!sort) return filtered;

  return [...filtered].sort((a, b) => compareInvoices(a, b, sort.key, sort.direction));
};

export default function InvoicesPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoice' | 'proforma'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Invoice | 'client', direction: 'asc' | 'desc' } | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  
  // Use invoice actions hook
  const { sendEmail, downloadPDF, isSendingEmail, isDownloadingPDF } = useInvoiceActions({
    onSuccess: () => {
      mutate(); // Refresh invoice list
    },
  });

  const { data: invoicesData, isLoading, mutate } = useSWR<PaginatedResponse<Invoice>>(
    authStatus === 'authenticated' ? '/api/invoices' : null,
    fetcher
  );

  const invoices = useMemo(() => {
    let filtered = invoicesData?.data || [];
    
    // Filtrar por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(inv => (inv as any).invoiceType === typeFilter);
    }
    
    return filterAndSortInvoices(filtered, searchQuery, sortConfig);
  }, [invoicesData, searchQuery, sortConfig, typeFilter]);

  const handleSort = (key: keyof Invoice | 'client') => {
    setSortConfig(prev => {
      let direction: 'asc' | 'desc' = 'asc';
      if (prev?.key === key && prev?.direction === 'asc') {
        direction = 'desc';
      }
      return { key, direction };
    });
  };

  const handleSendEmail = async (invoice: Invoice) => {
    const email = prompt('Email del destinatario:', invoice.client?.email ?? '');
    if (email) {
      await sendEmail(invoice, email);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground">Administra y haz seguimiento de tus cobros.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => mutate()} disabled={isLoading}>
            <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button asChild className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
            <Link href="/invoices/new" className="flex items-center gap-2">
              <Plus size={18} />
              Nueva Factura
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center space-x-2 bg-card p-1 rounded-lg border shadow-sm max-w-md flex-1 min-w-[200px]">
          <Search className="h-5 w-5 text-muted-foreground ml-2" />
          <Input 
            placeholder="Buscar por número o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'invoice' | 'proforma')}
          className="px-4 py-2 border rounded-md bg-background"
        >
          <option value="all">Todos los tipos</option>
          <option value="invoice">Facturas</option>
          <option value="proforma">Proformas</option>
        </select>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border bg-card shadow-sm overflow-hidden"
      >
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[120px] cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('invoiceNumber')}>
                <div className="flex items-center gap-2">
                  Número
                  <ArrowUpDown size={14} className="text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('client')}>
                <div className="flex items-center gap-2">
                  Cliente
                  <ArrowUpDown size={14} className="text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('total')}>
                <div className="flex items-center justify-end gap-2">
                  Monto
                  <ArrowUpDown size={14} className="text-muted-foreground" />
                </div>
              </TableHead>
               <TableHead className="text-center">Estado</TableHead>
               <TableHead className="text-center">VeriFactu</TableHead>
               <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                   <TableRow key={i}>
                     <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                     <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                     <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                     <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                     <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                   </TableRow>
                 ))
              ) : invoices.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={6} className="h-96">
                    <EmptyState
                      title={searchQuery ? "No se encontraron resultados" : "No hay facturas registradas"}
                      description={searchQuery ? `No existen facturas que coincidan con "${searchQuery}"` : "Comienza creando tu primera factura profesional."}
                      icon={searchQuery ? Search : Inbox}
                      actionLabel={searchQuery ? "Limpiar búsqueda" : "Nueva Factura"}
                      onAction={searchQuery ? () => setSearchQuery('') : () => router.push('/invoices/new')}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                 invoices.map((invoice: Invoice) => {
                   const badgeVariant = getBadgeVariant(invoice.status);
                   const verifactuBadgeVariant = getVeriFactuBadgeVariant(invoice.verifactuStatus);
                   return (
                    <motion.tr
                      key={invoice._id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group border-b hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{invoice.invoiceNumber || 'Borrador'}</span>
                          {(invoice as any).invoiceType === 'proforma' && (
                            <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700 text-[10px] px-2 py-0">
                              PROFORMA
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{invoice.client?.name || 'Cliente eliminado'}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{invoice.client?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        ${invoice.total.toLocaleString()}
                      </TableCell>
                       <TableCell className="text-center">
                         <Badge variant={badgeVariant || 'outline'} className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider">
                           {invoice.status}
                         </Badge>
                       </TableCell>
                       <TableCell className="text-center">
                         {verifactuBadgeVariant ? (
                           <Badge variant={verifactuBadgeVariant} className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider">
                             {invoice.verifactuStatus}
                           </Badge>
                         ) : (
                           <span className="text-xs text-muted-foreground">-</span>
                         )}
                       </TableCell>
                       <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleSendEmail(invoice)}
                            title="Enviar por Email"
                            className="h-8 w-8 hover:text-blue-600"
                          >
                            <Mail size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            asChild
                            title="Editar Factura"
                            className="h-8 w-8 hover:text-amber-600"
                          >
                            <Link href={`/invoices/${invoice._id}`}>
                              <FileEdit size={16} />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setPreviewInvoice(invoice)}
                            title="Vista Previa PDF"
                            className="h-8 w-8 hover:text-blue-600"
                          >
                            <FileText size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => downloadPDF(invoice)}
                            title="Descargar PDF"
                            className="h-8 w-8 hover:text-emerald-600"
                            disabled={isDownloadingPDF}
                          >
                            <FileDown size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </motion.div>

      {/* PDF Preview Dialog */}
      {previewInvoice && (
        <InvoicePDFPreview
          invoice={previewInvoice}
          open={!!previewInvoice}
          onOpenChange={(open) => !open && setPreviewInvoice(null)}
        />
      )}
    </div>
  );
}