import mongoose, { Schema } from 'mongoose';
import { Payment } from '@/types';

const paymentSchema = new Schema<Payment>({
  invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['stripe', 'paypal', 'bank_transfer', 'cash'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  transactionId: { type: String },
}, {
  timestamps: true,
});

export default mongoose.models.Payment || mongoose.model<Payment>('Payment', paymentSchema);