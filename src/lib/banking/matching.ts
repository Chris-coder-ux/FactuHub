import BankTransaction from '../models/BankTransaction';
import Invoice from '../models/Invoice';
import Reconciliation from '../models/Reconciliation';

interface MatchResult {
  bankTransaction: any;
  invoice: any;
  score: number;
  reasons: string[];
}

export async function reconcileTransactions(bankAccountId: string, userId: string, periodStart: Date, periodEnd: Date) {
  try {
    // Get unreconciled bank transactions in period
    const bankTransactions = await BankTransaction.find({
      bankAccountId,
      reconciled: false,
      date: { $gte: periodStart, $lte: periodEnd },
    });

    // Get unpaid invoices
    const invoices = await Invoice.find({
      userId,
      status: { $in: ['sent', 'overdue'] },
      total: { $gt: 0 },
    });

    const matches: MatchResult[] = [];
    const reconciledIds: string[] = [];

    for (const tx of bankTransactions) {
      const potentialMatches = findMatches(tx, invoices);

      if (potentialMatches.length > 0) {
        const bestMatch = potentialMatches[0];
        if (bestMatch.score > 0.8) { // Threshold for auto-reconcile
          // Mark as reconciled
          tx.reconciled = true;
          tx.reconciledInvoiceId = bestMatch.invoice._id;
          await tx.save();

          bestMatch.invoice.status = 'paid';
          await bestMatch.invoice.save();

          reconciledIds.push(tx._id.toString());
          matches.push(bestMatch);
        }
      }
    }

    // Create reconciliation record
    const reconciliation = new Reconciliation({
      bankAccountId,
      userId,
      periodStart,
      periodEnd,
      totalTransactions: bankTransactions.length,
      reconciledCount: reconciledIds.length,
      unreconciledCount: bankTransactions.length - reconciledIds.length,
      totalAmount: bankTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      reconciledAmount: matches.reduce((sum, match) => sum + match.bankTransaction.amount, 0),
      status: 'completed',
    });

    await reconciliation.save();

    return {
      success: true,
      reconciledCount: reconciledIds.length,
      totalTransactions: bankTransactions.length,
      reconciliationId: reconciliation._id,
    };
  } catch (error) {
    console.error('Error reconciling transactions:', error);
    return { success: false, error: (error as Error).message };
  }
}

export function findMatches(bankTransaction: any, invoices: any[]): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const invoice of invoices) {
    let score = 0;
    const reasons: string[] = [];

    // Amount match (exact)
    if (Math.abs(bankTransaction.amount - invoice.total) < 0.01) {
      score += 0.5;
      reasons.push('Amount match');
    }

    // Date proximity (within 7 days)
    const dateDiff = Math.abs(bankTransaction.date.getTime() - invoice.createdAt.getTime());
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
    if (daysDiff <= 7) {
      score += 0.3;
      reasons.push(`Date proximity: ${daysDiff.toFixed(1)} days`);
    }

    // Description similarity (simple text match)
    const txDesc = bankTransaction.description.toLowerCase();
    const invoiceNumber = invoice.invoiceNumber.toString();
    if (txDesc.includes(invoiceNumber) || invoiceNumber.includes(txDesc.slice(0, 10))) {
      score += 0.2;
      reasons.push('Description contains invoice number');
    }

    if (score > 0) {
      matches.push({
        bankTransaction,
        invoice,
        score,
        reasons,
      });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}