import mongoose, { Schema } from 'mongoose';
import { Product } from '@/types';

const productSchema = new Schema<Product>({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  tax: { type: Number, required: true, default: 0 },
  stock: { type: Number, required: true, default: 0 },
  alertThreshold: { type: Number, required: true, default: 0 },
  deletedAt: { type: Date, default: null },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
}, {
  timestamps: true,
});

// Índices compuestos para mejorar queries con companyId
productSchema.index({ companyId: 1, deletedAt: 1 });
productSchema.index({ companyId: 1, name: 1 });

export default mongoose.models.Product || mongoose.model<Product>('Product', productSchema);