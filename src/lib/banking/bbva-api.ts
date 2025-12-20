import axios from 'axios';
import BankAccount from '../models/BankAccount';

interface BBVAConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

class BBVABankingAPI {
  private config: BBVAConfig;

  constructor(config: BBVAConfig) {
    this.config = config;
  }

  // Get list of accounts
  async getAccounts(accessToken: string) {
    const response = await axios.get(`${this.config.baseUrl}/accounts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Request-ID': this.generateRequestId(),
      },
    });
    return response.data.accounts;
  }

  // Get account balance and details
  async getAccountInfo(accessToken: string, accountId: string) {
    const response = await axios.get(`${this.config.baseUrl}/accounts/${accountId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Request-ID': this.generateRequestId(),
      },
    });
    return response.data;
  }

  // Get transactions
  async getTransactions(accessToken: string, accountId: string, dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await axios.get(`${this.config.baseUrl}/accounts/${accountId}/transactions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Request-ID': this.generateRequestId(),
      },
    });
    return response.data;
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

import BankTransaction from '../models/BankTransaction';

// Sync transactions for a bank account
export async function syncBankTransactions(bankAccountId: string) {
  try {
    const bankAccount = await BankAccount.findById(bankAccountId);
    if (!bankAccount || !bankAccount.accessToken) {
      throw new Error('Bank account not found or no access token');
    }

    const bbvaApi = new BBVABankingAPI({
      clientId: process.env.BBVA_CLIENT_ID || '',
      clientSecret: process.env.BBVA_CLIENT_SECRET || '',
      baseUrl: 'https://api.sandbox.bbva.com/psd2/xs2a/v1',
    });

    // Get accounts first
    const accounts = await bbvaApi.getAccounts(bankAccount.accessToken);
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const account = accounts[0]; // Use first account for now
    const accountId = account.resourceId;

    // Get transactions from last sync or last 30 days
    const dateFrom = bankAccount.lastSync ? bankAccount.lastSync.toISOString().split('T')[0] : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const transactionsData = await bbvaApi.getTransactions(bankAccount.accessToken, accountId, dateFrom);

    let savedCount = 0;
    if (transactionsData.transactions && transactionsData.transactions.booked) {
      for (const tx of transactionsData.transactions.booked) {
        // Check if transaction already exists
        const existing = await BankTransaction.findOne({
          bankAccountId,
          transactionId: tx.transactionId,
        });

        if (!existing) {
          const bankTransaction = new BankTransaction({
            bankAccountId,
            transactionId: tx.transactionId,
            amount: parseFloat(tx.transactionAmount.amount),
            currency: tx.transactionAmount.currency,
            date: new Date(tx.bookingDate || tx.valueDate),
            description: tx.remittanceInformationUnstructured || tx.creditorName || 'Unknown',
          });
          await bankTransaction.save();
          savedCount++;
        }
      }
    }

    // Update last sync
    bankAccount.lastSync = new Date();
    await bankAccount.save();

    return { success: true, transactionsCount: savedCount };
  } catch (error) {
    console.error('Error syncing bank transactions:', error);
    return { success: false, error: (error as Error).message };
  }
}

export default BBVABankingAPI;