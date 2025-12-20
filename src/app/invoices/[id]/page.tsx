'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { InvoiceForm } from '@/components/forms/InvoiceForm';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditInvoicePage() {
  const params = useParams();
  const { data: invoiceData, error, isLoading } = useSWR(`/api/invoices/${params.id}`, fetcher);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h2 className="text-2xl font-bold text-red-600">Error al cargar la factura</h2>
        <p className="text-muted-foreground">La factura no existe o tienes problemas de conexión.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <InvoiceForm initialData={invoiceData} isEditing={true} />
    </div>
  );
}
