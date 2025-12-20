import mongoose from 'mongoose';

/**
 * Convert a companyId string to MongoDB ObjectId
 * Useful for filtering queries by companyId
 */
export function toCompanyObjectId(companyId: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  if (companyId instanceof mongoose.Types.ObjectId) {
    return companyId;
  }
  return new mongoose.Types.ObjectId(companyId);
}

/**
 * Create a filter object with companyId for data isolation
 */
export function createCompanyFilter(companyId: string | mongoose.Types.ObjectId, additionalFilter: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...additionalFilter,
    companyId: toCompanyObjectId(companyId),
  };
}

