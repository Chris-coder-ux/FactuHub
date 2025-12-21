import mongoose, { Schema } from 'mongoose';
import { User } from '@/types';

const userSchema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  // MFA fields
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String }, // Encrypted TOTP secret
  mfaBackupCodes: { type: [String], default: [] }, // Encrypted backup codes
  mfaVerified: { type: Boolean, default: false }, // Whether MFA setup is verified
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model<User>('User', userSchema);