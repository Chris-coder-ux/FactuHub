import { z } from 'zod';

export const userSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.enum(['admin', 'user']).default('user'),
});

export const clientSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  taxId: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  description: z.string().optional(),
  price: z.number().positive({ message: 'Price must be positive' }),
  tax: z.number().min(0).max(100, { message: 'Tax rate must be between 0 and 100' }).default(21),
  stock: z.number().min(0, { message: 'Stock cannot be negative' }).default(0),
  alertThreshold: z.number().min(0, { message: 'Alert threshold cannot be negative' }).default(5),
});

export const invoiceItemSchema = z.object({
  product: z.string().min(1, { message: 'Product ID is required' }),
  quantity: z.number().positive({ message: 'Quantity must be positive' }),
  price: z.number().min(0, { message: 'Price cannot be negative' }),
  tax: z.number().min(0, { message: 'Tax cannot be negative' }).default(0),
  total: z.number().min(0, { message: 'Total cannot be negative' }),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  client: z.string().min(1, { message: 'Client ID is required' }),
  items: z.array(invoiceItemSchema).min(1, { message: 'At least one item is required' }),
  dueDate: z.string().min(1, { message: 'Due date is required' }),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),

  // VeriFactu fields
  verifactuId: z.string().optional(),
  verifactuStatus: z.enum(['pending', 'sent', 'verified', 'rejected', 'error']).optional(),
  verifactuXml: z.string().optional(),
  verifactuSignature: z.string().optional(),
  verifactuHash: z.string().optional(),
  verifactuSentAt: z.date().optional(),
  verifactuVerifiedAt: z.date().optional(),
  verifactuErrorMessage: z.string().optional(),
  verifactuChainHash: z.string().optional(),
});

export const recurringInvoiceSchema = invoiceSchema.extend({
  frequency: z.enum(['monthly', 'quarterly', 'yearly']),
  startDate: z.string().min(1, { message: 'Start date is required' }),
  endDate: z.string().optional(),
  nextDueDate: z.string().optional(),
  active: z.boolean().default(true),
});

export const settingsSchema = z.object({
  companyName: z.string().min(2, { message: 'Company name is required' }),
  taxId: z.string().min(1, { message: 'Tax ID (CIF/NIF) is required' }),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().min(1, { message: 'Street is required' }),
    city: z.string().min(1, { message: 'City is required' }),
    state: z.string().min(1, { message: 'State/Province is required' }),
    zipCode: z.string().min(1, { message: 'Zip code is required' }),
    country: z.string().min(1, { message: 'Country is required' }),
  }),
  currency: z.string().min(1, { message: 'Currency is required' }),
  defaultTaxRate: z.number().min(0).max(100),
  stripeEnabled: z.boolean(),
  logoUrl: z.string().optional(),
  stripePublicKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),

  // VeriFactu fields
  verifactuEnabled: z.boolean().optional(),
  verifactuEnvironment: z.enum(['production', 'sandbox']).optional(),
  verifactuCertificatePath: z.string().optional(),
  verifactuCertificatePassword: z.string().optional(),
  aeatUsername: z.string().optional(),
  aeatPassword: z.string().optional(),
  verifactuAutoSend: z.boolean().optional(),
  verifactuChainHash: z.string().optional(),
});