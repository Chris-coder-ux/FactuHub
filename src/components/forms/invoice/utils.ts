import { Invoice } from '@/types';

export const getVeriFactuBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" | null => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: 'outline',
    sent: 'secondary',
    verified: 'default',
    rejected: 'destructive',
    error: 'destructive'
  };
  return status ? variants[status] || 'outline' : null;
};

export const formatVeriFactuDate = (date?: Date | string) => {
  if (!date) return 'No disponible';
  const d = new Date(date);
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const generateVeriFactuQRData = (invoice: Partial<Invoice>, companyNif?: string) => {
  const data = {
    numeroFactura: invoice.invoiceNumber || '',
    fecha: invoice.createdAt ? new Date(invoice.createdAt).toISOString().split('T')[0] : '',
    importe: (invoice.total || 0).toFixed(2),
    nifEmisor: companyNif || '',
    csv: invoice.verifactuId || '',
    urlVerificacion: typeof window !== 'undefined' ? `${window.location.origin}/verify/${invoice._id}` : ''
  };

  return JSON.stringify(data);
};

export const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

