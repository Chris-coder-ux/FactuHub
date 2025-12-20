import mongoose, { Schema, Document } from 'mongoose';

export interface IReceipt extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId; // Multi-company support
  imageUrl: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  extractedData: {
    merchant?: string;
    date?: string;
    total?: number;
    tax?: number;
    items?: Array<{
      description: string;
      quantity?: number;
      price?: number;
      total?: number;
    }>;
  };
  confidenceScore: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  expenseId?: mongoose.Types.ObjectId; // Optional: link receipt to an expense
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  extractedData: {
    merchant: String,
    date: String,
    total: Number,
    tax: Number,
    items: [{
      description: { type: String, required: true },
      quantity: Number,
      price: Number,
      total: Number
    }]
  },
  confidenceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: String,
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  expenseId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Expense', 
    index: true 
  }, // Optional: link receipt to an expense
}, {
  timestamps: true
});

// Índices para optimización
ReceiptSchema.index({ userId: 1, status: 1 });
ReceiptSchema.index({ createdAt: -1 });
ReceiptSchema.index({ companyId: 1, status: 1 });
ReceiptSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.models.Receipt || mongoose.model<IReceipt>('Receipt', ReceiptSchema);