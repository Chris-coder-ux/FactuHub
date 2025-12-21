'use client';

import { InvoiceForm } from '@/components/forms/InvoiceForm';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

function NewInvoiceContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const [templateData, setTemplateData] = useState<any>(null);

  const { data: templateResponse } = useSWR(
    templateId ? `/api/templates/${templateId}/apply` : null,
    (url) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).then(res => res.ok ? res.json() : null).catch(() => null)
  );

  useEffect(() => {
    if (templateResponse) {
      setTemplateData(templateResponse);
    }
  }, [templateResponse]);

  return (
    <div className="container mx-auto py-10">
      <InvoiceForm templateData={templateData} />
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-10">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <NewInvoiceContent />
    </Suspense>
  );
}
