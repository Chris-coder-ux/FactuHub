import mongoose, { Schema } from 'mongoose';
import { Client } from '@/types';

const clientSchema = new Schema<Client>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
  },
  taxId: { type: String },
  deletedAt: { type: Date, default: null },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
}, {
  timestamps: true,
});

// Índices compuestos para mejorar queries con companyId
clientSchema.index({ companyId: 1, deletedAt: 1 });
clientSchema.index({ companyId: 1, email: 1 });

export default mongoose.models.Client || mongoose.model<Client>('Client', clientSchema);