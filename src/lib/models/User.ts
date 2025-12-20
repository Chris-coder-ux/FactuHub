import mongoose, { Schema } from 'mongoose';
import { User } from '@/types';

const userSchema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model<User>('User', userSchema);