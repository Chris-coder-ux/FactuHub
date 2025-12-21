/**
 * Support Ticket Model
 * Manages customer support tickets and FAQs
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportTicket extends Document {
  ticketNumber: string;
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'feature' | 'bug' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: mongoose.Types.ObjectId;
  messages: Array<{
    userId: mongoose.Types.ObjectId;
    message: string;
    attachments?: string[];
    createdAt: Date;
  }>;
  resolvedAt?: Date;
  closedAt?: Date;
  resolutionNotes?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    relatedInvoiceId?: mongoose.Types.ObjectId;
    relatedFeature?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
      sparse: true, // Permite null temporalmente
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: ['technical', 'billing', 'feature', 'bug', 'other'],
      default: 'other',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    messages: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        message: {
          type: String,
          required: true,
          maxlength: 5000,
        },
        attachments: [String],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resolvedAt: Date,
    closedAt: Date,
    resolutionNotes: {
      type: String,
      maxlength: 2000,
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      relatedInvoiceId: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
      },
      relatedFeature: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos
supportTicketSchema.index({ companyId: 1, status: 1 });
supportTicketSchema.index({ companyId: 1, category: 1 });
supportTicketSchema.index({ companyId: 1, createdAt: -1 });
supportTicketSchema.index({ userId: 1, status: 1 });

// Nota: ticketNumber se genera en la API antes de crear el documento
// para evitar problemas con hooks async en Next.js

export default mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);

