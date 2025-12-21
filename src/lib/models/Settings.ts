import mongoose, { Schema } from 'mongoose';
import { Settings } from '@/types';

const settingsSchema = new Schema<Settings>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  companyName: { type: String, required: true },
  taxId: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  currency: { type: String, default: 'EUR' },
  defaultTaxRate: { type: Number, default: 21 },
  logoUrl: { type: String },
  stripeEnabled: { type: Boolean, default: false },
  stripePublicKey: { type: String },
  stripeSecretKey: { type: String },

  // VeriFactu fields
  verifactuEnabled: { type: Boolean, default: false },
  verifactuEnvironment: { type: String, enum: ['production', 'sandbox'], default: 'sandbox' },
  verifactuCertificatePath: { type: String },
  verifactuCertificatePassword: { type: String },
  aeatUsername: { type: String },
  aeatPassword: { type: String },
   verifactuAutoSend: { type: Boolean, default: false },
   verifactuAutoEnableForSpain: { type: Boolean, default: true },
   verifactuChainHash: { type: String },
   
   // Fiscal reminders
   fiscalReminderDays: { type: [Number], default: [30, 14, 7, 1] }, // Days before deadline to send reminders
   fiscalRemindersEnabled: { type: Boolean, default: true },
   
   // Security analysis configuration
   securityAnalysisEnabled: { type: Boolean, default: true },
   securityAnalysisFrequency: { type: String, enum: ['15min', '30min', '1hour', '2hours', '6hours', '12hours', '24hours'], default: '1hour' },
   securityAnalysisLastRun: { type: Date },
}, {
  timestamps: true,
});

export default mongoose.models.Settings || mongoose.model<Settings>('Settings', settingsSchema);
