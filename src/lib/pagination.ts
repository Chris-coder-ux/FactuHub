/**
 * Pagination utilities for API endpoints
 */

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
 * Parse pagination parameters from URL search params
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
 * Create paginated response object
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
