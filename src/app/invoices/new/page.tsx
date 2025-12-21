'use client';

import { InvoiceForm } from '@/components/forms/InvoiceForm';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export default function NewInvoicePage() {
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
