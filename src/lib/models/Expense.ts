/**
 * Expense Model
 * Represents business expenses that can be associated with receipts
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  receiptIds: mongoose.Types.ObjectId[]; // Array of receipts associated with this expense
  category: string; // e.g., 'travel', 'meals', 'office', 'supplies', 'utilities', 'other'
  amount: number;
  taxAmount: number;
  date: Date;
  description: string;
  vendor?: string; // Merchant/vendor name
  status: 'pending' | 'approved' | 'rejected';
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    receiptIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Receipt',
      },
    ],
    category: {
      type: String,
      required: true,
      enum: [
        'travel',
        'meals',
        'office',
        'supplies',
        'utilities',
        'marketing',
        'software',
        'professional_services',
        'other',
      ],
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    vendor: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
ExpenseSchema.index({ companyId: 1, userId: 1, status: 1 });
ExpenseSchema.index({ companyId: 1, date: -1 });
ExpenseSchema.index({ companyId: 1, category: 1 });

const Expense = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;

