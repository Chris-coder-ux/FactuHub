import mongoose, { Schema, Document } from 'mongoose';

export interface IReconciliation extends Document {
  bankAccountId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  totalTransactions: number;
  reconciledCount: number;
  unreconciledCount: number;
  totalAmount: number;
  reconciledAmount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const ReconciliationSchema = new Schema<IReconciliation>({
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  totalTransactions: { type: Number, default: 0 },
  reconciledCount: { type: Number, default: 0 },
  unreconciledCount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  reconciledAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, {
  timestamps: true,
});

export default mongoose.models.Reconciliation || mongoose.model<IReconciliation>('Reconciliation', ReconciliationSchema);