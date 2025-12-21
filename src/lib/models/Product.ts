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
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true, required: true },
  isShared: { type: Boolean, default: false, index: true }, // If true, product is shared with company group
  sharedWithGroupId: { type: Schema.Types.ObjectId, ref: 'CompanyGroup', default: null, index: true }, // Group ID this product is shared with
}, {
  timestamps: true,
});

// Índices compuestos para mejorar queries con companyId
productSchema.index({ companyId: 1, deletedAt: 1 });
productSchema.index({ companyId: 1, name: 1 });
productSchema.index({ isShared: 1, sharedWithGroupId: 1, deletedAt: 1 }); // Para productos compartidos

export default mongoose.models.Product || mongoose.model<Product>('Product', productSchema);