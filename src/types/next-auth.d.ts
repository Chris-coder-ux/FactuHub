/**
 * Type definitions for NextAuth
 */

import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      companyId?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: string;
    companyId?: string;
  }
}

// Extend the built-in JWT types
declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role: string;
    companyId?: string;
  }
}

export {};
