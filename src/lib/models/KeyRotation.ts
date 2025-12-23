import mongoose, { Schema, Document } from 'mongoose';

export interface IKeyRotation extends Document {
  rotationDate: Date;
  previousKeyHash: string; // Hash de la clave anterior (para referencia, no la clave misma)
  newKeyHash: string; // Hash de la nueva clave
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsTotal: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const keyRotationSchema = new Schema<IKeyRotation>(
  {
    rotationDate: { type: Date, required: true, index: true },
    previousKeyHash: { type: String, required: true },
    newKeyHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
    },
    recordsProcessed: { type: Number, default: 0 },
    recordsTotal: { type: Number, default: 0 },
    error: { type: String },
  },
  {
    timestamps: true,
  }
);

// Índice para obtener la última rotación
keyRotationSchema.index({ rotationDate: -1 });

export default mongoose.models.KeyRotation || mongoose.model<IKeyRotation>('KeyRotation', keyRotationSchema);

