/**
 * Materialized Views for Analytics
 * Stores pre-calculated analytics data to improve dashboard performance
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsMaterializedView extends Document {
  companyId: mongoose.Types.ObjectId;
  viewType: 'client_profitability' | 'product_profitability' | 'cash_flow' | 'trends' | 'summary';
  period: 'daily' | 'monthly' | 'all_time';
  periodKey: string; // e.g., '2024-01' for monthly, '2024-01-15' for daily, 'all' for all_time
  data: unknown; // The pre-calculated data
  lastUpdated: Date;
  expiresAt?: Date; // For TTL cleanup of old data
  createdAt: Date;
  updatedAt: Date;
}

const analyticsMaterializedViewSchema = new Schema<IAnalyticsMaterializedView>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    viewType: {
      type: String,
      required: true,
      enum: ['client_profitability', 'product_profitability', 'cash_flow', 'trends', 'summary'],
      index: true,
    },
    period: {
      type: String,
      required: true,
      enum: ['daily', 'monthly', 'all_time'],
      index: true,
    },
    periodKey: {
      type: String,
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    lastUpdated: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true, // TTL index will be created separately
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
analyticsMaterializedViewSchema.index({ companyId: 1, viewType: 1, period: 1, periodKey: 1 }, { unique: true });
analyticsMaterializedViewSchema.index({ companyId: 1, viewType: 1, lastUpdated: -1 });
analyticsMaterializedViewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL for old data

const AnalyticsMaterializedView = mongoose.models.AnalyticsMaterializedView || 
  mongoose.model<IAnalyticsMaterializedView>('AnalyticsMaterializedView', analyticsMaterializedViewSchema);

export default AnalyticsMaterializedView;

