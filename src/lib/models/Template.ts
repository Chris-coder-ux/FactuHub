import mongoose, { Schema, Document, Model } from 'mongoose';

export type TemplateType = 'invoice' | 'email' | 'pdf';

export interface ITemplate extends Document {
  name: string;
  type: TemplateType;
  companyId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  isDefault: boolean;
  isShared: boolean; // Si se comparte entre empresas del mismo grupo
  
  // Para plantillas de factura
  invoiceTemplate?: {
    client?: mongoose.Types.ObjectId; // Cliente por defecto
    items: Array<{
      product: mongoose.Types.ObjectId;
      quantity: number;
      price: number;
      tax: number;
      description?: string;
    }>;
    notes?: string;
    dueDateDays?: number; // Días desde hoy para fecha de vencimiento
    status?: 'draft' | 'sent';
  };
  
  // Para plantillas de email
  emailTemplate?: {
    subject: string;
    body: string; // HTML
    variables?: string[]; // Variables disponibles: {{invoiceNumber}}, {{clientName}}, etc.
  };
  
  // Para plantillas de PDF (futuro)
  pdfTemplate?: {
    layout: 'default' | 'minimal' | 'detailed';
    colors?: {
      primary?: string;
      secondary?: string;
    };
    logo?: string; // URL del logo
    footer?: string;
  };
  
  metadata?: {
    description?: string;
    tags?: string[];
    usageCount?: number;
    lastUsedAt?: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const templateItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  tax: { type: Number, required: true, default: 0 },
  description: { type: String },
}, { _id: false });

const templateSchema = new Schema<ITemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['invoice', 'email', 'pdf'],
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    invoiceTemplate: {
      client: { type: Schema.Types.ObjectId, ref: 'Client' },
      items: [templateItemSchema],
      notes: { type: String },
      dueDateDays: { type: Number, default: 30 },
      status: { type: String, enum: ['draft', 'sent'], default: 'draft' },
    },
    emailTemplate: {
      subject: { type: String, required: true },
      body: { type: String, required: true }, // HTML
      variables: [String],
    },
    pdfTemplate: {
      layout: { type: String, enum: ['default', 'minimal', 'detailed'], default: 'default' },
      colors: {
        primary: { type: String },
        secondary: { type: String },
      },
      logo: { type: String },
      footer: { type: String },
    },
    metadata: {
      description: { type: String },
      tags: [String],
      usageCount: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos
templateSchema.index({ companyId: 1, type: 1, isDefault: 1 });
templateSchema.index({ companyId: 1, type: 1, createdAt: -1 });
templateSchema.index({ companyId: 1, isShared: 1 });

// Validación: Solo una plantilla por defecto por tipo y empresa
templateSchema.pre('save', async function (next: any) {
  if (this.isDefault && this.isModified('isDefault')) {
    await mongoose.model('Template').updateMany(
      { 
        companyId: this.companyId, 
        type: this.type, 
        _id: { $ne: this._id },
        isDefault: true 
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

const Template: Model<ITemplate> =
  mongoose.models.Template || mongoose.model<ITemplate>('Template', templateSchema);

export default Template;

