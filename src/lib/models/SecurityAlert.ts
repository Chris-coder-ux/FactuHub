import mongoose, { Schema, Document } from 'mongoose';

export type SecurityAlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SecurityAlertType = 
  | 'multiple_failed_logins'
  | 'unusual_ip_access'
  | 'privilege_escalation'
  | 'mass_data_export'
  | 'suspicious_activity_pattern'
  | 'unauthorized_access_attempt'
  | 'data_breach_attempt'
  | 'unusual_time_access'
  | 'rapid_failed_actions'
  | 'gdpr_data_deletion'
  | 'settings_modification'
  | 'other';

export interface ISecurityAlert extends Document {
  companyId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  alertType: SecurityAlertType;
  severity: SecurityAlertSeverity;
  title: string;
  description: string;
  details: Record<string, any>;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolutionNotes?: string;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: mongoose.Types.ObjectId;
  relatedLogIds: mongoose.Types.ObjectId[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SecurityAlertSchema = new Schema<ISecurityAlert>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    alertType: {
      type: String,
      required: true,
      enum: [
        'multiple_failed_logins',
        'unusual_ip_access',
        'privilege_escalation',
        'mass_data_export',
        'suspicious_activity_pattern',
        'unauthorized_access_attempt',
        'data_breach_attempt',
        'unusual_time_access',
        'rapid_failed_actions',
        'gdpr_data_deletion',
        'settings_modification',
        'other',
      ],
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    detectedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNotes: {
      type: String,
    },
    acknowledged: {
      type: Boolean,
      default: false,
      index: true,
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    relatedLogIds: [{
      type: Schema.Types.ObjectId,
      ref: 'AuditLog',
    }],
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para consultas rápidas
SecurityAlertSchema.index({ companyId: 1, detectedAt: -1 });
SecurityAlertSchema.index({ companyId: 1, severity: 1, acknowledged: 1 });
SecurityAlertSchema.index({ userId: 1, detectedAt: -1 });
SecurityAlertSchema.index({ alertType: 1, severity: 1, acknowledged: 1 });
SecurityAlertSchema.index({ acknowledged: 1, severity: 1, detectedAt: -1 });

export default mongoose.models.SecurityAlert || mongoose.model<ISecurityAlert>('SecurityAlert', SecurityAlertSchema);

