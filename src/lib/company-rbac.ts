import { Session } from 'next-auth';
import mongoose from 'mongoose';
import connectDB from './mongodb';
import Company from './models/Company';
import User from './models/User';

export type CompanyRole = 'owner' | 'admin' | 'accountant' | 'sales' | 'client';

export interface CompanyContext {
  companyId: string;
  role: CompanyRole;
  isOwner: boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  canManageInvoices: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canManageExpenses: boolean;
  canViewExpenses: boolean;
}

/**
 * Get user's role in a specific company
 */
export async function getUserCompanyRole(
  userId: string,
  companyId: string
): Promise<CompanyRole | null> {
  await connectDB();

  const company = await Company.findById(companyId);
  if (!company) return null;

  // Check if user is owner
  if (company.ownerId.toString() === userId) {
    return 'owner';
  }

  // Check if user is a member
  const member = company.members.find(
    (m: { userId: mongoose.Types.ObjectId; role: string }) => m.userId.toString() === userId
  );
  return member ? (member.role as CompanyRole) : null;
}

/**
 * Get all companies where user has access
 */
export async function getUserCompanies(userId: string): Promise<Array<{
  _id: string;
  name: string;
  role: CompanyRole;
  isOwner: boolean;
}>> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return [];

  // Get companies where user is owner
  const ownedCompanies = await Company.find({ ownerId: userId })
    .select('name')
    .lean();

  // Get companies where user is a member
  const memberCompanies = await Company.find({
    'members.userId': userId,
  })
    .select('name members')
    .lean();

  const companiesMap = new Map<string, {
    _id: string;
    name: string;
    role: CompanyRole;
    isOwner: boolean;
  }>();

  // Add owned companies (these take precedence)
  ownedCompanies.forEach((c) => {
    companiesMap.set(c._id.toString(), {
      _id: c._id.toString(),
      name: c.name,
      role: 'owner' as CompanyRole,
      isOwner: true,
    });
  });

  // Add member companies (only if not already added as owner)
  memberCompanies.forEach((c) => {
    const companyId = c._id.toString();
    if (!companiesMap.has(companyId)) {
      const member = c.members.find(
        (m: { userId: mongoose.Types.ObjectId; role: string }) => m.userId.toString() === userId
      );
      companiesMap.set(companyId, {
        _id: companyId,
        name: c.name,
        role: (member?.role || 'client') as CompanyRole,
        isOwner: false,
      });
    }
  });

  return Array.from(companiesMap.values());
}

/**
 * Create company context with permissions
 */
export function createCompanyContext(
  role: CompanyRole | null
): CompanyContext | null {
  if (!role) return null;

  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;

  return {
    companyId: '', // Will be set by caller
    role,
    isOwner,
    isAdmin,
    canManageUsers: isAdmin,
    canManageInvoices: ['owner', 'admin', 'accountant', 'sales'].includes(role),
    canViewReports: ['owner', 'admin', 'accountant'].includes(role),
    canManageSettings: isAdmin,
    canManageExpenses: ['owner', 'admin', 'accountant'].includes(role),
    canViewExpenses: ['owner', 'admin', 'accountant', 'sales'].includes(role),
  };
}

/**
 * Verify user has required permission in company
 */
export async function requireCompanyPermission(
  userId: string,
  companyId: string,
  requiredPermission: keyof Omit<CompanyContext, 'companyId' | 'role' | 'isOwner' | 'isAdmin'>
): Promise<CompanyContext> {
  await connectDB();

  const role = await getUserCompanyRole(userId, companyId);
  if (!role) {
    throw new Error('User is not a member of this company');
  }

  const context = createCompanyContext(role);
  if (!context) {
    throw new Error('Failed to create company context');
  }

  context.companyId = companyId;

  // Check permission
  if (!context[requiredPermission]) {
    throw new Error(`Insufficient permissions: ${requiredPermission} required`);
  }

  return context;
}

/**
 * Get company context from session (if companyId is in session)
 */
export async function getCompanyContextFromSession(
  session: Session
): Promise<CompanyContext | null> {
  const companyId = (session.user as any)?.companyId;
  if (!companyId || !session.user?.id) {
    return null;
  }

  const role = await getUserCompanyRole(session.user.id, companyId);
  if (!role) {
    return null;
  }

  const context = createCompanyContext(role);
  if (context) {
    context.companyId = companyId;
  }

  return context;
}

/**
 * Check if user can access resource in company context
 */
export async function canAccessResource(
  userId: string,
  companyId: string | null,
  resourceCompanyId: string | null
): Promise<boolean> {
  if (!companyId || !resourceCompanyId) {
    return false;
  }

  if (companyId === resourceCompanyId) {
    const role = await getUserCompanyRole(userId, companyId);
    return role !== null;
  }

  return false;
}

