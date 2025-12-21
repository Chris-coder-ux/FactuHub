/**
 * FAQ Model
 * Manages frequently asked questions
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IFAQ extends Document {
  question: string;
  answer: string;
  category: 'general' | 'billing' | 'technical' | 'verifactu' | 'ocr' | 'other';
  tags: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  isPublished: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFAQ>(
  {
    question: {
      type: String,
      required: true,
      maxlength: 500,
      index: 'text',
    },
    answer: {
      type: String,
      required: true,
      maxlength: 5000,
      index: 'text',
    },
    category: {
      type: String,
      enum: ['general', 'billing', 'technical', 'verifactu', 'ocr', 'other'],
      default: 'general',
      index: true,
    },
    tags: [String],
    views: {
      type: Number,
      default: 0,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
faqSchema.index({ category: 1, isPublished: 1, order: 1 });
faqSchema.index({ tags: 1 });
faqSchema.index({ question: 'text', answer: 'text' });

export default mongoose.models.FAQ || mongoose.model<IFAQ>('FAQ', faqSchema);

