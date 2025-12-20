import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  taxId: string; // CIF/NIF
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  ownerId: mongoose.Types.ObjectId; // User who created it
  members: {
    userId: mongoose.Types.ObjectId;
    role: 'owner' | 'admin' | 'accountant' | 'sales' | 'client';
  }[];
  settings: {
    currency: string;
    defaultTaxRate: number;
    verifactuEnabled: boolean;
    verifactuEnvironment: 'production' | 'sandbox';
  };
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>({
  name: { type: String, required: true },
  taxId: { type: String, required: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'España' },
  },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'accountant', 'sales', 'client'], default: 'client' },
  }],
  settings: {
    currency: { type: String, default: 'EUR' },
    defaultTaxRate: { type: Number, default: 21 },
    verifactuEnabled: { type: Boolean, default: false },
    verifactuEnvironment: { type: String, enum: ['production', 'sandbox'], default: 'sandbox' },
  },
}, {
  timestamps: true,
});

export default mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);