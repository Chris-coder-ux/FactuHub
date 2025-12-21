/**
 * Email Log Model
 * Tracks all emails sent through the system for auditing and debugging
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailLog extends Document {
  companyId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // User who triggered the email (if applicable)
  type: 'invoice' | 'overdue' | 'payment' | 'team_invite' | 'fiscal_reminder' | 'other';
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  metadata?: {
    invoiceId?: string;
    invoiceNumber?: string;
    clientId?: string;
    relatedResourceId?: string;
    [key: string]: any;
  };
  sentAt?: Date;
  createdAt: Date;
}

const emailLogSchema = new Schema<IEmailLog>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: ['invoice', 'overdue', 'payment', 'team_invite', 'fiscal_reminder', 'other'],
      required: true,
      index: true,
    },
    to: {
      type: String,
      required: true,
      index: true,
    },
    from: {
      type: String,
      required: true,
    },
    fromName: {
      type: String,
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'pending',
      index: true,
    },
    errorMessage: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos
emailLogSchema.index({ companyId: 1, type: 1, createdAt: -1 });
emailLogSchema.index({ companyId: 1, status: 1 });
emailLogSchema.index({ to: 1, createdAt: -1 });

export default mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', emailLogSchema);

