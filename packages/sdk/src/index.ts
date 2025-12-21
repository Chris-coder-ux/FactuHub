/**
 * AppTrabajo SDK
 * TypeScript/JavaScript SDK for AppTrabajo API
 */

export interface SDKConfig {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Client {
  _id: string;
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
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  tax: number;
  stock: number;
}

export interface InvoiceItem {
  product: string;
  quantity: number;
  price: number;
  tax: number;
  total: number;
  description?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  client: Client | string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoiceType?: 'invoice' | 'proforma';
  dueDate: string;
  issuedDate?: string;
  notes?: string;
}

export interface Company {
  _id: string;
  name: string;
  taxId: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  ownerId: string;
  members: Array<{
    userId: string;
    role: string;
  }>;
}

export class AppTrabajoSDK {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly accessToken?: string;

  constructor(config: SDKConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    } else if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const error = await response.json() as { message?: string; error?: string };
        errorMessage = error.message || error.error || errorMessage;
      } catch {
        // Si no se puede parsear JSON, usar el mensaje por defecto
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  // Authentication
  async register(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: any; token?: string }> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Companies
  async getCompanies(): Promise<{ companies: Company[] }> {
    return this.request('/api/companies');
  }

  async createCompany(data: {
    name: string;
    taxId: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  }): Promise<Company> {
    return this.request('/api/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async switchCompany(companyId: string): Promise<{ companyId: string }> {
    return this.request('/api/companies/switch', {
      method: 'POST',
      body: JSON.stringify({ companyId }),
    });
  }

  // Clients
  async getClients(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Client>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);

    return this.request(`/api/clients?${query.toString()}`);
  }

  async getClient(id: string): Promise<Client> {
    return this.request(`/api/clients/${id}`);
  }

  async createClient(data: {
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
  }): Promise<Client> {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(
    id: string,
    data: Partial<Client>
  ): Promise<Client> {
    return this.request(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string): Promise<void> {
    return this.request(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Products
  async getProducts(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Product>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    return this.request(`/api/products?${query.toString()}`);
  }

  async getProduct(id: string): Promise<Product> {
    return this.request(`/api/products/${id}`);
  }

  async createProduct(data: {
    name: string;
    description?: string;
    price: number;
    tax: number;
    stock?: number;
  }): Promise<Product> {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(
    id: string,
    data: Partial<Product>
  ): Promise<Product> {
    return this.request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoices
  async getInvoices(params?: {
    page?: number;
    limit?: number;
    status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    type?: 'invoice' | 'proforma';
  }): Promise<PaginatedResponse<Invoice>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);

    return this.request(`/api/invoices?${query.toString()}`);
  }

  async getInvoice(id: string): Promise<Invoice> {
    return this.request(`/api/invoices/${id}`);
  }

  async createInvoice(data: {
    client: string;
    items: InvoiceItem[];
    dueDate: string;
    invoiceType?: 'invoice' | 'proforma';
    notes?: string;
  }): Promise<Invoice> {
    return this.request('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(
    id: string,
    data: Partial<Invoice>
  ): Promise<Invoice> {
    return this.request(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async sendInvoice(id: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/api/invoices/${id}/send`, {
      method: 'POST',
    });
  }

  async getInvoicePDF(id: string): Promise<Blob> {
    const url = `${this.baseUrl}/api/invoices/${id}/pdf`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    } else if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.blob();
  }

  // VeriFactu
  async generateVeriFactuXML(id: string): Promise<{
    success: boolean;
    xml: string;
    hash: string;
  }> {
    return this.request(`/api/invoices/${id}/verifactu/generate`, {
      method: 'POST',
    });
  }

  async signVeriFactuXML(id: string): Promise<{
    success: boolean;
    signedXml: string;
  }> {
    return this.request(`/api/invoices/${id}/verifactu/sign`, {
      method: 'POST',
    });
  }

  async sendVeriFactuToAEAT(id: string): Promise<{
    success: boolean;
    response: any;
  }> {
    return this.request(`/api/invoices/${id}/verifactu/send`, {
      method: 'POST',
    });
  }

  async getVeriFactuStatus(id: string): Promise<{
    verifactuId?: string;
    verifactuStatus?: string;
    verifactuSentAt?: string;
    verifactuVerifiedAt?: string;
  }> {
    return this.request(`/api/invoices/${id}/verifactu/status`);
  }

  // Analytics
  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    clientProfitability: any[];
    productProfitability: any[];
    cashFlow: any[];
    trends: any[];
    summary: {
      totalRevenue: number;
      totalExpenses: number;
      totalProfit: number;
      averageMargin: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);

    return this.request(`/api/analytics?${query.toString()}`);
  }

  // Reports
  async getReports(): Promise<{
    totalRevenue: number;
    pendingRevenue: number;
    overdueRevenue: number;
    clientCount: number;
    revenueData: any[];
  }> {
    return this.request('/api/reports');
  }
}

export default AppTrabajoSDK;

