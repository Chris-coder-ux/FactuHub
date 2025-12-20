/* @jest-environment node */

import { getPaginationParams, createPaginatedResponse, validateSortParam } from '@/lib/pagination';

describe('pagination utils', () => {
  describe('getPaginationParams', () => {
    it('should parse default params', () => {
      const params = new URLSearchParams();
      const result = getPaginationParams(params);
      expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
    });

    it('should parse custom params', () => {
      const params = new URLSearchParams('page=2&limit=50');
      const result = getPaginationParams(params);
      expect(result).toEqual({ page: 2, limit: 50, skip: 50 });
    });

    it('should handle negative or invalid values', () => {
      const params = new URLSearchParams('page=-1&limit=abc');
      const result = getPaginationParams(params);
      expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
    });
  });

  describe('createPaginatedResponse', () => {
    it('should format paginated data correctly', () => {
      const data = [1, 2, 3];
      const total = 10;
      const params = { page: 1, limit: 3, skip: 0 };
      const response = createPaginatedResponse(data, total, params);
      
      expect(response.pagination).toEqual({
        page: 1,
        limit: 3,
        total: 10,
        totalPages: 4,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });
  });

  describe('validateSortParam', () => {
    const allowed = ['name', 'date'];
    
    it('should return default sort for null', () => {
      expect(validateSortParam(null, allowed)).toEqual({ field: 'createdAt', order: -1 });
    });

    it('should validate allowed fields', () => {
      expect(validateSortParam('name', allowed)).toEqual({ field: 'name', order: 1 });
      expect(validateSortParam('-date', allowed)).toEqual({ field: 'date', order: -1 });
    });

    it('should fallback for disallowed fields', () => {
      expect(validateSortParam('password', allowed)).toEqual({ field: 'createdAt', order: -1 });
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.clearAllTimers();
    });
  });
});
