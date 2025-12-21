import mongoose, { Schema, Document } from 'mongoose';

export interface IGDPRConsent extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  consentType: 'marketing' | 'analytics' | 'necessary' | 'functional';
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string; // Versión de la política de privacidad
  createdAt: Date;
  updatedAt: Date;
}

const GDPRConsentSchema = new Schema<IGDPRConsent>(
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
    consentType: {
      type: String,
      required: true,
      enum: ['marketing', 'analytics', 'necessary', 'functional'],
      index: true,
    },
    granted: {
      type: Boolean,
      required: true,
      default: false,
    },
    grantedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    version: {
      type: String,
      required: true,
      default: '1.0',
    },
  },
  {
    timestamps: true,
  }
);

// Índice compuesto para consultas rápidas
GDPRConsentSchema.index({ userId: 1, consentType: 1, granted: 1 });
GDPRConsentSchema.index({ userId: 1, createdAt: -1 });
GDPRConsentSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.models.GDPRConsent || mongoose.model<IGDPRConsent>('GDPRConsent', GDPRConsentSchema);

