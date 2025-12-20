export interface Client {
  _id?: string;
  name: string;
  email: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  client: Client;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
}
