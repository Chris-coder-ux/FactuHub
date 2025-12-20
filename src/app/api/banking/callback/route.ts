import { NextRequest, NextResponse } from 'next/server';
import { bbvaOAuth } from '@/lib/banking/oauth';
import connectDB from '@/lib/mongodb';
import BankAccount from '@/lib/models/BankAccount';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    // Extract user ID and company ID from state
    // Format: user_{userId}_company_{companyId}_{timestamp}
    const userIdMatch = state.match(/^user_(\w+)_company_(\w+)_/);
    if (!userIdMatch) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }
    const userId = userIdMatch[1];
    const companyId = userIdMatch[2];

    // Exchange code for tokens
    const tokens = await bbvaOAuth.getTokens(code);

    // Create bank account record with companyId
    const bankAccount = new BankAccount({
      userId,
      companyId: toCompanyObjectId(companyId), // Assign companyId to bank account
      bankName: 'BBVA',
      accountNumber: '**** **** **** ****', // Masked, will be updated later
      consentId: state, // Using state as consent ID for now
      accessToken: tokens.accessToken,
      status: 'active',
    });

    await bankAccount.save();

    // Redirect to frontend with success
    const redirectUrl = `${process.env.NEXTAUTH_URL}/settings?banking=connected`;
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in banking callback:', error);
    const redirectUrl = `${process.env.NEXTAUTH_URL}/settings?banking=error`;
    return NextResponse.redirect(redirectUrl);
  }
}