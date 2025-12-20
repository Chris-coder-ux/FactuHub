import mongoose, { Schema, Document } from 'mongoose';

export interface IBankTransaction extends Document {
  bankAccountId: mongoose.Types.ObjectId;
  transactionId: string; // From bank API
  amount: number;
  currency: string;
  date: Date;
  description: string;
  category?: string;
  reconciled: boolean;
  reconciledInvoiceId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BankTransactionSchema = new Schema<IBankTransaction>({
  bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  transactionId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'EUR' },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  category: { type: String },
  reconciled: { type: Boolean, default: false },
  reconciledInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
}, {
  timestamps: true,
});

export default mongoose.models.BankTransaction || mongoose.model<IBankTransaction>('BankTransaction', BankTransactionSchema);