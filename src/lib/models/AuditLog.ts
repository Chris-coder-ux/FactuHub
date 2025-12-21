import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'logout' | 'permission_change' | 'settings_change';
  resourceType: 'invoice' | 'client' | 'product' | 'expense' | 'receipt' | 'user' | 'company' | 'settings' | 'banking' | 'fiscal' | 'other';
  resourceId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    fields?: string[];
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
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
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'view', 'export', 'login', 'logout', 'permission_change', 'settings_change'],
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      enum: ['invoice', 'client', 'product', 'expense', 'receipt', 'user', 'company', 'settings', 'banking', 'fiscal', 'other'],
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    changes: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
      fields: [String],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    success: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para consultas comunes
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, resourceType: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, companyId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, success: 1, createdAt: -1 });

// TTL index para limpiar logs antiguos (opcional, mantener por 2 años)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;

