/**
 * Email Logs API
 * Get email logs for the current company
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { emailService } from '@/lib/services/email-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { companyId } = await requireCompanyContext();
    
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const logs = await emailService.getEmailLogs(companyId, {
      type,
      status,
      page,
      limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    logger.error('Failed to fetch email logs', error);
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}

