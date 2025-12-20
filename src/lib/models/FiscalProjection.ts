import mongoose, { Schema, Document } from 'mongoose';

export interface IFiscalProjection extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId; // Multi-company support
  year: number;
  quarter?: number; // 1-4 for quarterly, null for annual
  type: 'iva' | 'irpf';
  projectedAmount: number;
  actualAmount?: number;
  confidence: number; // 0-1
  basedOnData: {
    historicalInvoices: number;
    averageMonthlyRevenue: number;
    taxRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FiscalProjectionSchema = new Schema<IFiscalProjection>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  year: { type: Number, required: true },
  quarter: { type: Number, min: 1, max: 4 },
  type: { type: String, enum: ['iva', 'irpf'], required: true },
  projectedAmount: { type: Number, required: true },
  actualAmount: { type: Number },
  confidence: { type: Number, min: 0, max: 1, default: 0.5 },
  basedOnData: {
    historicalInvoices: { type: Number, default: 0 },
    averageMonthlyRevenue: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
  },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
}, {
  timestamps: true,
});

export default mongoose.models.FiscalProjection || mongoose.model<IFiscalProjection>('FiscalProjection', FiscalProjectionSchema);