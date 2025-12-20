import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { bbvaOAuth } from '@/lib/banking/oauth';

export async function GET(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to connect bank accounts
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    const { searchParams } = new URL(request.url);
    const bank = searchParams.get('bank') || 'bbva';

    // Generate state with user ID and company ID for security
    const state = `user_${session.user.id}_company_${companyId}_${Date.now()}`;

    let authUrl: string;
    if (bank === 'bbva') {
      authUrl = bbvaOAuth.getAuthorizationUrl(state);
    } else {
      return NextResponse.json({ error: 'Bank not supported' }, { status: 400 });
    }

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}