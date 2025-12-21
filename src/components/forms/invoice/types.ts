import { z } from 'zod';
import { invoiceSchema } from '@/lib/validations';

export type InvoiceFormData = z.infer<typeof invoiceSchema> & {
  fromAddress?: string;
  billingAddress?: string;
  shippingAddress?: string;
  paymentTerms?: string;
  invoiceDate?: string;
  orderNumber?: string;
  currency?: string;
  description?: string;
};

export interface InvoiceItem {
  product: string;
  quantity: number;
  price: number;
  tax: number;
  total: number;
  description?: string;
}

