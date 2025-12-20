import mongoose, { Schema, Document } from 'mongoose';

export interface IBankAccount extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId; // Multi-company support
  bankName: string; // e.g., 'BBVA', 'Santander'
  accountNumber: string; // Masked or IBAN
  consentId: string; // PSD2 consent ID
  accessToken?: string; // If using OAuth
  lastSync?: Date;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  consentId: { type: String, required: true },
  accessToken: { type: String },
  lastSync: { type: Date },
  status: { type: String, enum: ['active', 'inactive', 'error'], default: 'active' },
  errorMessage: { type: String },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
}, {
  timestamps: true,
});

export default mongoose.models.BankAccount || mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);