import { getServerSession } from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import UserModel from '@/lib/models/User';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        try {
          await dbConnect();
          
          const user = await UserModel.findOne({ email: credentials?.email });
          if (!user) {
            throw new Error('User not found');
          }

          const isPasswordValid = await bcrypt.compare(credentials?.password || '', user.password);
          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, user, trigger, session: sessionData }: { token: JWT; user?: User; trigger?: string; session?: Session }) {
      if (user) {
        token.role = user.role;
        // Load user's companyId from database (optional, don't fail if it errors)
        try {
          await dbConnect();
          const userDoc = await UserModel.findById(user.id);
          if (userDoc?.companyId) {
            token.companyId = userDoc.companyId.toString();
          }
        } catch (error) {
          // Log error but don't fail authentication
          console.error('Error loading companyId in JWT callback:', error);
          // Continue without companyId - it's optional
        }
      }
      // Handle company switching via session update
      if (trigger === 'update' && sessionData) {
        const companyId = (sessionData as any)?.companyId;
        if (companyId) {
          token.companyId = companyId;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        // Add companyId to session if available
        if (token.companyId) {
          (session.user as any).companyId = token.companyId;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth',
  },
};

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(role: 'admin' | 'user') {
  const session = await requireAuth();
  if (session.user.role !== role && session.user.role !== 'admin') {
    throw new Error('Forbidden: Insufficient permissions');
  }
  return session;
}

/**
 * Require company context - ensures user has selected a company
 * If companyId is not in session, tries to get it from user's default companyId
 */
export async function requireCompanyContext() {
  const session = await requireAuth();
  let companyId = (session.user as any)?.companyId;
  
  // If companyId is not in session, try to get it from user's default companyId
  if (!companyId) {
    await dbConnect();
    const user = await UserModel.findById(session.user.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.companyId) {
      companyId = user.companyId.toString();
    } else {
      // User doesn't have a company - try to find one they have access to
      const { getUserCompanies } = await import('./company-rbac');
      const companies = await getUserCompanies(session.user.id);
      
      if (companies.length > 0) {
        // Use the first company the user has access to
        const mongoose = (await import('mongoose')).default;
        companyId = companies[0]._id;
        // Update user's default companyId
        user.companyId = new mongoose.Types.ObjectId(companies[0]._id);
        await user.save();
      } else {
        // Return a more helpful error message
        throw new Error('No company found. Please create a company first or contact an administrator to be added to one.');
      }
    }
  }
  
  return { session, companyId };
}