/**
 * Pagination utilities for API endpoints
 * Supports both offset-based and cursor-based pagination
 */

import mongoose from 'mongoose';

// ==================== Offset-based Pagination ====================

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Parse pagination parameters from URL search params (offset-based)
 */
export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  
  const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitParam || '20', 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Create paginated response object (offset-based)
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1,
    },
  };
}

// ==================== Cursor-based Pagination ====================

export interface CursorPaginationParams {
  cursor?: string; // ObjectId as string
  limit: number;
  direction?: 'next' | 'prev'; // Default: 'next'
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextCursor?: string; // ObjectId of last item
    prevCursor?: string; // ObjectId of first item
  };
}

/**
 * Parse cursor-based pagination parameters from URL search params
 */
export function getCursorPaginationParams(searchParams: URLSearchParams): CursorPaginationParams {
  const cursorParam = searchParams.get('cursor');
  const limitParam = searchParams.get('limit');
  const directionParam = searchParams.get('direction');
  
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitParam || '20', 10) || 20));
  const direction = (directionParam === 'prev' ? 'prev' : 'next') as 'next' | 'prev';
  
  // Validate cursor is a valid ObjectId
  let cursor: string | undefined;
  if (cursorParam) {
    if (mongoose.Types.ObjectId.isValid(cursorParam)) {
      cursor = cursorParam;
    }
  }

  return { cursor, limit, direction };
}

/**
 * Create cursor-based paginated response object
 */
export function createCursorPaginatedResponse<T extends { _id: mongoose.Types.ObjectId | string }>(
  data: T[],
  params: CursorPaginationParams
): CursorPaginatedResponse<T> {
  const hasMore = data.length > params.limit;
  const items = hasMore ? data.slice(0, params.limit) : data;
  
  const nextCursor = items.length > 0 && hasMore
    ? (items[items.length - 1]._id as mongoose.Types.ObjectId).toString()
    : undefined;
  
  const prevCursor = items.length > 0
    ? (items[0]._id as mongoose.Types.ObjectId).toString()
    : undefined;

  return {
    data: items,
    pagination: {
      limit: params.limit,
      hasNextPage: hasMore,
      hasPrevPage: !!params.cursor, // If cursor exists, we can go back
      nextCursor,
      prevCursor,
    },
  };
}

/**
 * Build MongoDB query filter for cursor-based pagination
 * Adds cursor condition to existing filter
 * 
 * Note: For cursor-based pagination to work correctly with non-_id sort fields,
 * the sort must include _id as a secondary sort (handled by ensureIdInSort).
 * This function uses _id for cursor comparison, which is safe because _id
 * is always included in the sort when using ensureIdInSort.
 */
export function buildCursorFilter<T extends Record<string, any>>(
  baseFilter: T,
  cursor: string | undefined,
  sortField: string,
  sortOrder: 1 | -1
): T {
  if (!cursor || !mongoose.Types.ObjectId.isValid(cursor)) {
    return baseFilter;
  }

  const cursorId = new mongoose.Types.ObjectId(cursor);
  
  // Always use _id for cursor comparison
  // This works because ensureIdInSort ensures _id is always in the sort
  // For sortField === '_id', this is direct
  // For other sort fields, _id is used as secondary sort, so this still works
  return {
    ...baseFilter,
    _id: sortOrder === 1 ? { $gt: cursorId } : { $lt: cursorId },
  } as T;
}

/**
 * Determine pagination mode from search params
 * Returns 'cursor' if cursor param exists, otherwise 'offset'
 */
export function getPaginationMode(searchParams: URLSearchParams): 'cursor' | 'offset' {
  return searchParams.has('cursor') ? 'cursor' : 'offset';
}

// ==================== Common Utilities ====================

/**
 * Validate sort parameter
 */
export function validateSortParam(
  sort: string | null,
  allowedFields: string[]
): { field: string; order: 1 | -1 } {
  if (!sort) {
    return { field: 'createdAt', order: -1 };
  }

  const order = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');

  if (!allowedFields.includes(field)) {
    return { field: 'createdAt', order: -1 };
  }

  return { field, order };
}

/**
 * Ensure _id is included in sort for cursor-based pagination
 * Cursor pagination requires _id for consistent ordering
 */
export function ensureIdInSort(sort: { field: string; order: 1 | -1 }): Record<string, 1 | -1> {
  const sortObj: Record<string, 1 | -1> = {
    [sort.field]: sort.order,
  };

  // If not sorting by _id, add _id as secondary sort for cursor pagination
  if (sort.field !== '_id') {
    sortObj._id = sort.order; // Use same order as primary field
  }

  return sortObj;
}
