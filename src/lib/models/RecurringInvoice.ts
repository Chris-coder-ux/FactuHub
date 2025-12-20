import mongoose, { Schema } from 'mongoose';
import { RecurringInvoice } from '@/types';

const recurringInvoiceSchema = new Schema<RecurringInvoice>({
  invoiceNumber: { type: String, required: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  }],
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  nextDueDate: { type: Date, required: true },
  endDate: { type: Date },
  status: { type: String, enum: ['active', 'inactive', 'cancelled'], default: 'active' },
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  notes: { type: String },
}, {
  timestamps: true,
});

export default mongoose.models.RecurringInvoice || mongoose.model<RecurringInvoice>('RecurringInvoice', recurringInvoiceSchema);