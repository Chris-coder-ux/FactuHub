import mongoose, { Schema } from 'mongoose';
import { Invoice } from '@/types';

const invoiceItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
});

const invoiceSchema = new Schema<Invoice>({
  invoiceNumber: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  dueDate: { type: Date, required: true },
  issuedDate: { type: Date, default: Date.now },
  notes: { type: String },
  deletedAt: { type: Date, default: null },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },

  // VeriFactu fields
  verifactuId: { type: String, sparse: true },
  verifactuStatus: { type: String, enum: ['pending', 'signed', 'sent', 'verified', 'rejected', 'error'] },
  verifactuXml: { type: String },
  verifactuSignature: { type: String },
  verifactuHash: { type: String },
  verifactuSentAt: { type: Date },
   verifactuVerifiedAt: { type: Date },
   verifactuErrorMessage: { type: String },
   verifactuChainHash: { type: String },
   verifactuCancellationXml: { type: String },
   verifactuCancellationDate: { type: Date },
   verifactuCancellationReason: { type: String },
}, {
  timestamps: true,
});

// Índices compuestos para mejorar queries con companyId
invoiceSchema.index({ companyId: 1, deletedAt: 1 });
invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.models.Invoice || mongoose.model<Invoice>('Invoice', invoiceSchema);