import mongoose, { Schema, Document } from 'mongoose';

export interface IGDPRProcessingActivity extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  activityType: 'access' | 'rectification' | 'portability' | 'erasure' | 'restriction' | 'objection';
  status: 'pending' | 'completed' | 'rejected';
  requestDate: Date;
  completedDate?: Date;
  dataExported?: boolean;
  dataDeleted?: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const GDPRProcessingActivitySchema = new Schema<IGDPRProcessingActivity>(
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
      index: true,
    },
    activityType: {
      type: String,
      required: true,
      enum: ['access', 'rectification', 'portability', 'erasure', 'restriction', 'objection'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'rejected'],
      default: 'pending',
      index: true,
    },
    requestDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedDate: {
      type: Date,
    },
    dataExported: {
      type: Boolean,
      default: false,
    },
    dataDeleted: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para consultas
GDPRProcessingActivitySchema.index({ userId: 1, activityType: 1, status: 1 });
GDPRProcessingActivitySchema.index({ userId: 1, requestDate: -1 });
GDPRProcessingActivitySchema.index({ companyId: 1, status: 1, requestDate: -1 });

export default mongoose.models.GDPRProcessingActivity || mongoose.model<IGDPRProcessingActivity>('GDPRProcessingActivity', GDPRProcessingActivitySchema);

