export interface User {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  companyId?: string; // Multi-company support - default company
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  // MFA fields
  mfaEnabled?: boolean;
  mfaSecret?: string; // Encrypted TOTP secret
  mfaBackupCodes?: string[]; // Encrypted backup codes
  mfaVerified?: boolean; // Whether MFA setup is verified
}

export interface Client {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  taxId?: string;
  companyId?: string; // Multi-company support
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  _id?: string;
  name: string;
  description?: string;
  price: number;
  tax: number;
  stock: number;
  alertThreshold: number;
  companyId?: string; // Multi-company support
  isShared?: boolean; // If true, product is shared with company group
  sharedWithGroupId?: string | null; // Group ID this product is shared with
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InvoiceItem {
  product: Product;
  quantity: number;
  price: number;
  tax: number;
  total: number;
}

export interface Invoice {
  _id?: string;
  invoiceNumber: string;
  invoiceType?: 'invoice' | 'proforma'; // Tipo de factura: normal o proforma
  client: Client;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  issuedDate?: Date;
   notes?: string;
   companyId?: string; // Multi-company support
   publicToken?: string; // Token seguro para acceso público
   
   // Campos del formulario detallado
   fromAddress?: string;
   billingAddress?: string;
   shippingAddress?: string;
   paymentTerms?: string;
   invoiceDate?: string;
   orderNumber?: string;
   currency?: string;
   deletedAt?: Date | null;
   cancelledAt?: Date;
   cancellationReason?: string;
   createdAt?: Date;
   updatedAt?: Date;

  // VeriFactu fields
  verifactuId?: string;
  verifactuStatus?: 'pending' | 'signed' | 'sent' | 'verified' | 'rejected' | 'error';
  verifactuXml?: string;
  verifactuSignature?: string;
  verifactuHash?: string;
  verifactuSentAt?: Date;
   verifactuVerifiedAt?: Date;
   verifactuErrorMessage?: string;
   verifactuChainHash?: string;
   verifactuCancellationXml?: string;
   verifactuCancellationDate?: Date;
   verifactuCancellationReason?: string;
}

export interface Payment {
  _id?: string;
  invoice: Invoice;
  amount: number;
  method: 'stripe' | 'cash' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId?: string;
  transactionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RecurringInvoice {
  _id?: string;
  invoiceNumber: string;
  client: Client;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'active' | 'inactive' | 'cancelled';
  frequency: 'daily' | 'weekly' | 'monthly';
  nextDueDate: Date;
  endDate?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Expense {
  _id?: string;
  userId: string;
  companyId: string;
  receiptIds: string[];
  category: 'travel' | 'meals' | 'office' | 'supplies' | 'utilities' | 'marketing' | 'software' | 'professional_services' | 'other';
  amount: number;
  taxAmount: number;
  date: string | Date;
  description: string;
  vendor?: string;
  status: 'pending' | 'approved' | 'rejected';
  tags?: string[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Receipt {
  _id?: string;
  userId: string;
  companyId?: string; // Multi-company support
  imageUrl: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  extractedData: {
    merchant?: string;
    date?: string;
    total?: number;
    tax?: number;
    items?: Array<{
      description: string;
      quantity?: number;
      price?: number;
      total?: number;
    }>;
  };
  confidenceScore: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  expenseId?: string; // Optional: link receipt to an expense
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RevenueMonth {
  _id: {
    year: number;
    month: number;
  };
  total: number;
}

export interface ReportStats {
  totalRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  clientCount: number;
  pendingInvoices: number;
  overdueInvoices: number;
  paidInvoices: number;
  monthlyRevenue: number;
  revenueData: RevenueMonth[];
  recentInvoices: Invoice[];
  statusDistribution: { _id: string; count: number }[];
}

export interface Settings {
  _id?: string;
  companyId?: string; // Company ID for multi-company isolation
  companyName: string;
  taxId: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  currency: string;
  defaultTaxRate: number;
  logoUrl?: string;
  stripeEnabled: boolean;
  stripePublicKey?: string;
  stripeSecretKey?: string;
  updatedAt?: Date;

  // VeriFactu fields
  verifactuEnabled?: boolean; // Enables VeriFactu compliance for the company
  verifactuEnvironment?: 'production' | 'sandbox'; // AEAT environment for testing or production
  verifactuCertificatePath?: string; // Path to the electronic certificate file (PFX/P12 format)
  verifactuCertificatePassword?: string; // Encrypted password for the certificate
  aeatUsername?: string; // Encrypted AEAT portal username
  aeatPassword?: string; // Encrypted AEAT portal password
   verifactuAutoSend?: boolean; // Automatically send invoices to AEAT upon creation
   verifactuAutoEnableForSpain?: boolean; // Automatically enable VeriFactu for Spanish clients
   verifactuChainHash?: string; // Initial chain hash for record chaining (generated automatically)
   
   // Fiscal reminders
   fiscalReminderDays?: number[]; // Days before deadline to send reminders (e.g., [30, 14, 7, 1])
   fiscalRemindersEnabled?: boolean; // Enable/disable fiscal reminders
   
   // Security analysis configuration
   securityAnalysisEnabled?: boolean; // Enable/disable automated security analysis
   securityAnalysisFrequency?: '15min' | '30min' | '1hour' | '2hours' | '6hours' | '12hours' | '24hours'; // Frequency of security analysis
   securityAnalysisLastRun?: Date; // Last time security analysis was run
   
   // Email configuration
   emailFromAddress?: string; // Email remitente (sobrescribe SENDGRID_FROM_EMAIL)
   emailFromName?: string; // Nombre del remitente
   emailNotificationsEnabled?: boolean; // Habilitar notificaciones automáticas
   emailInvoiceEnabled?: boolean; // Permitir envío de facturas por email
   emailOverdueEnabled?: boolean; // Notificaciones de facturas vencidas
   emailPaymentEnabled?: boolean; // Confirmaciones de pago
   emailTeamInvitesEnabled?: boolean; // Invitaciones a equipos
   emailFiscalRemindersEnabled?: boolean; // Recordatorios fiscales
}

export interface BankTransaction {
  _id?: string;
  bankAccountId: string | { _id: string; name: string; accountNumber: string };
  transactionId: string;
  amount: number;
  currency: string;
  date: string | Date;
  description: string;
  category?: string;
  reconciled: boolean;
  reconciledInvoiceId?: string | { _id: string; invoiceNumber: string; total: number };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BankAccount {
  _id?: string;
  userId: string;
  companyId?: string;
  bankName: string;
  accountNumber: string;
  consentId: string;
  accessToken?: string;
  lastSync?: Date;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Reconciliation {
  _id?: string;
  bankAccountId: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  totalTransactions: number;
  reconciledCount: number;
  unreconciledCount: number;
  totalAmount: number;
  reconciledAmount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MatchingSuggestion {
  transaction: {
    _id: string;
    amount: number;
    date: string | Date;
    description: string;
    bankAccount: any;
  };
  matches: Array<{
    invoice: any;
    score: number;
    reasons: string[];
  }>;
}