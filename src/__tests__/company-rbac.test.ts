/* @jest-environment node */

// Mock environment variables before importing anything
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

import { 
  getUserCompanyRole, 
  getUserCompanies,
  createCompanyContext,
  requireCompanyPermission 
} from '@/lib/company-rbac';
import Company from '@/lib/models/Company';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

// Mock mongoose connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/models/Company', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

describe('Company RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserCompanyRole', () => {
    it('should return owner role when user is company owner', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const companyId = new mongoose.Types.ObjectId().toString();
      
      const mockCompany = {
        _id: companyId,
        ownerId: userId,
        members: [],
      };
      
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      
      const role = await getUserCompanyRole(userId, companyId);
      
      expect(role).toBe('owner');
      expect(Company.findById).toHaveBeenCalledWith(companyId);
    });

    it('should return member role when user is a member', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const companyId = new mongoose.Types.ObjectId().toString();
      const memberUserId = new mongoose.Types.ObjectId(userId);
      
      const mockCompany = {
        _id: companyId,
        ownerId: new mongoose.Types.ObjectId(),
        members: [{
          userId: memberUserId,
          role: 'accountant',
        }],
      };
      
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      
      const role = await getUserCompanyRole(userId, companyId);
      
      expect(role).toBe('accountant');
    });

    it('should return null when user is not a member', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const companyId = new mongoose.Types.ObjectId().toString();
      
      const mockCompany = {
        _id: companyId,
        ownerId: new mongoose.Types.ObjectId(),
        members: [],
      };
      
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      
      const role = await getUserCompanyRole(userId, companyId);
      
      expect(role).toBeNull();
    });

    it('should return null when company does not exist', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const companyId = new mongoose.Types.ObjectId().toString();
      
      (Company.findById as jest.Mock).mockResolvedValue(null);
      
      const role = await getUserCompanyRole(userId, companyId);
      
      expect(role).toBeNull();
    });
  });

  describe('createCompanyContext', () => {
    it('should create context with owner permissions', () => {
      const context = createCompanyContext('owner');
      
      expect(context).not.toBeNull();
      expect(context?.role).toBe('owner');
      expect(context?.isOwner).toBe(true);
      expect(context?.isAdmin).toBe(true);
      expect(context?.canManageUsers).toBe(true);
      expect(context?.canManageInvoices).toBe(true);
      expect(context?.canViewReports).toBe(true);
      expect(context?.canManageSettings).toBe(true);
    });

    it('should create context with admin permissions', () => {
      const context = createCompanyContext('admin');
      
      expect(context).not.toBeNull();
      expect(context?.role).toBe('admin');
      expect(context?.isOwner).toBe(false);
      expect(context?.isAdmin).toBe(true);
      expect(context?.canManageUsers).toBe(true);
      expect(context?.canManageInvoices).toBe(true);
      expect(context?.canViewReports).toBe(true);
      expect(context?.canManageSettings).toBe(true);
    });

    it('should create context with accountant permissions', () => {
      const context = createCompanyContext('accountant');
      
      expect(context).not.toBeNull();
      expect(context?.role).toBe('accountant');
      expect(context?.isOwner).toBe(false);
      expect(context?.isAdmin).toBe(false);
      expect(context?.canManageUsers).toBe(false);
      expect(context?.canManageInvoices).toBe(true);
      expect(context?.canViewReports).toBe(true);
      expect(context?.canManageSettings).toBe(false);
    });

    it('should create context with sales permissions', () => {
      const context = createCompanyContext('sales');
      
      expect(context).not.toBeNull();
      expect(context?.role).toBe('sales');
      expect(context?.isOwner).toBe(false);
      expect(context?.isAdmin).toBe(false);
      expect(context?.canManageUsers).toBe(false);
      expect(context?.canManageInvoices).toBe(true);
      expect(context?.canViewReports).toBe(false);
      expect(context?.canManageSettings).toBe(false);
    });

    it('should create context with client permissions (limited)', () => {
      const context = createCompanyContext('client');
      
      expect(context).not.toBeNull();
      expect(context?.role).toBe('client');
      expect(context?.isOwner).toBe(false);
      expect(context?.isAdmin).toBe(false);
      expect(context?.canManageUsers).toBe(false);
      expect(context?.canManageInvoices).toBe(false);
      expect(context?.canViewReports).toBe(false);
      expect(context?.canManageSettings).toBe(false);
    });

    it('should return null for null role', () => {
      const context = createCompanyContext(null);
      expect(context).toBeNull();
    });
  });

  describe('requireCompanyPermission', () => {
    it('should allow owner to access all permissions', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const companyId = new mongoose.Types.ObjectId().toString();
      
      const mockCompany = {
        _id: companyId,
        ownerId: userId,
        members: [],
      };
      
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      
      const context = await requireCompanyPermission(userId, companyId, 'canManageInvoices');
      
      expect(context).not.toBeNull();
      expect(context.role).toBe('owner');
      expect(context.canManageInvoices).toBe(true);
    });

    it('should throw error when user is not a member', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const companyId = new mongoose.Types.ObjectId().toString();
      
      const mockCompany = {
        _id: companyId,
        ownerId: new mongoose.Types.ObjectId(),
        members: [],
      };
      
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      
      await expect(
        requireCompanyPermission(userId, companyId, 'canManageInvoices')
      ).rejects.toThrow('User is not a member of this company');
    });

    it('should throw error when user lacks required permission', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const companyId = new mongoose.Types.ObjectId().toString();
      const memberUserId = new mongoose.Types.ObjectId(userId);
      
      const mockCompany = {
        _id: companyId,
        ownerId: new mongoose.Types.ObjectId(),
        members: [{
          userId: memberUserId,
          role: 'client',
        }],
      };
      
      (Company.findById as jest.Mock).mockResolvedValue(mockCompany);
      
      await expect(
        requireCompanyPermission(userId, companyId, 'canManageInvoices')
      ).rejects.toThrow('Insufficient permissions: canManageInvoices required');
    });
  });
});

