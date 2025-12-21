/**
 * Tests de validación de precisión del algoritmo de matching
 * 
 * Estos tests validan que el algoritmo de matching:
 * - Identifica correctamente transacciones que coinciden con facturas
 * - Asigna scores apropiados basados en múltiples factores
 * - Maneja casos edge correctamente
 */

import { findMatches } from '@/lib/banking/matching';
import BankTransaction from '@/lib/models/BankTransaction';
import Invoice from '@/lib/models/Invoice';

// Mock data helpers
function createMockTransaction(overrides: Partial<any> = {}): any {
  return {
    _id: 'tx1',
    amount: 1000.00,
    date: new Date('2024-01-15'),
    description: 'Payment for Invoice #12345',
    reconciled: false,
    ...overrides,
  };
}

function createMockInvoice(overrides: Partial<any> = {}): any {
  return {
    _id: 'inv1',
    invoiceNumber: 12345,
    total: 1000.00,
    createdAt: new Date('2024-01-10'),
    dueDate: new Date('2024-01-20'),
    status: 'sent',
    client: { name: 'Test Client' },
    ...overrides,
  };
}

describe('Matching Algorithm Accuracy', () => {
  describe('Exact Amount Match', () => {
    it('should give high score for exact amount match', () => {
      const tx = createMockTransaction({ amount: 1000.00 });
      const invoice = createMockInvoice({ total: 1000.00 });
      
      const matches = findMatches(tx, [invoice]);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].score).toBeGreaterThanOrEqual(0.5); // At least 0.5 for exact amount
      expect(matches[0].reasons).toContain('Amount match');
    });

    it('should give lower score for amount mismatch', () => {
      const tx = createMockTransaction({ amount: 1000.00 });
      const invoice = createMockInvoice({ total: 1500.00 });
      
      const matches = findMatches(tx, [invoice]);
      
      // Should still match but with lower score
      if (matches.length > 0) {
        expect(matches[0].score).toBeLessThan(0.5);
      }
    });
  });

  describe('Date Proximity', () => {
    it('should give bonus for transactions within 7 days', () => {
      const tx = createMockTransaction({ 
        amount: 1000.00,
        date: new Date('2024-01-15'),
      });
      const invoice = createMockInvoice({ 
        total: 1000.00,
        createdAt: new Date('2024-01-12'), // 3 days difference
      });
      
      const matches = findMatches(tx, [invoice]);
      
      expect(matches.length).toBeGreaterThan(0);
      const match = matches[0];
      expect(match.score).toBeGreaterThanOrEqual(0.8); // 0.5 (amount) + 0.3 (date)
      expect(match.reasons.some(r => r.includes('Date proximity'))).toBe(true);
    });

    it('should not give date bonus for transactions > 7 days apart', () => {
      const tx = createMockTransaction({ 
        amount: 1000.00,
        date: new Date('2024-01-15'),
      });
      const invoice = createMockInvoice({ 
        total: 1000.00,
        createdAt: new Date('2024-01-01'), // 14 days difference
      });
      
      const matches = findMatches(tx, [invoice]);
      
      if (matches.length > 0) {
        // Should have amount match but no date bonus
        expect(matches[0].score).toBeLessThan(0.8);
      }
    });
  });

  describe('Description Similarity', () => {
    it('should match when description contains invoice number', () => {
      const tx = createMockTransaction({ 
        amount: 1000.00,
        description: 'Payment for Invoice #12345',
      });
      const invoice = createMockInvoice({ 
        total: 1000.00,
        invoiceNumber: 12345,
      });
      
      const matches = findMatches(tx, [invoice]);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].reasons.some(r => r.includes('Description contains invoice number'))).toBe(true);
    });

    it('should not match when description is completely different', () => {
      const tx = createMockTransaction({ 
        amount: 1000.00,
        description: 'Random payment',
      });
      const invoice = createMockInvoice({ 
        total: 1000.00,
        invoiceNumber: 99999,
      });
      
      const matches = findMatches(tx, [invoice]);
      
      // Should still match on amount, but no description bonus
      if (matches.length > 0) {
        expect(matches[0].score).toBeLessThan(0.7);
      }
    });
  });

  describe('Combined Factors', () => {
    it('should give highest score for perfect match', () => {
      const tx = createMockTransaction({ 
        amount: 1000.00,
        date: new Date('2024-01-15'),
        description: 'Payment for Invoice #12345',
      });
      const invoice = createMockInvoice({ 
        total: 1000.00,
        invoiceNumber: 12345,
        createdAt: new Date('2024-01-12'),
      });
      
      const matches = findMatches(tx, [invoice]);
      
      expect(matches.length).toBeGreaterThan(0);
      // Perfect match: 0.5 (amount) + 0.3 (date) + 0.2 (description) = 1.0
      expect(matches[0].score).toBeGreaterThanOrEqual(0.9);
    });

    it('should rank better matches higher', () => {
      const tx = createMockTransaction({ 
        amount: 1000.00,
        date: new Date('2024-01-15'),
        description: 'Payment for Invoice #12345',
      });
      
      const invoices = [
        createMockInvoice({ 
          total: 1000.00,
          invoiceNumber: 12345,
          createdAt: new Date('2024-01-12'), // Perfect match
        }),
        createMockInvoice({ 
          total: 1000.00,
          invoiceNumber: 99999,
          createdAt: new Date('2024-01-01'), // Good amount, bad date/description
        }),
        createMockInvoice({ 
          total: 1500.00,
          invoiceNumber: 12345,
          createdAt: new Date('2024-01-12'), // Bad amount, good date/description
        }),
      ];
      
      const matches = findMatches(tx, invoices);
      
      expect(matches.length).toBeGreaterThan(0);
      // First match should be the perfect one
      expect(matches[0].invoice.invoiceNumber).toBe(12345);
      expect(matches[0].invoice.total).toBe(1000.00);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty invoice list', () => {
      const tx = createMockTransaction();
      const matches = findMatches(tx, []);
      
      expect(matches).toHaveLength(0);
    });

    it('should handle transactions with zero amount', () => {
      const tx = createMockTransaction({ amount: 0 });
      const invoice = createMockInvoice({ total: 0 });
      
      const matches = findMatches(tx, [invoice]);
      
      // Should not match zero amounts
      expect(matches.length).toBe(0);
    });

    it('should handle missing dates gracefully', () => {
      const tx = createMockTransaction({ date: null as any });
      const invoice = createMockInvoice();
      
      // Should not throw error
      expect(() => findMatches(tx, [invoice])).not.toThrow();
    });

    it('should handle very large amounts', () => {
      const tx = createMockTransaction({ amount: 999999.99 });
      const invoice = createMockInvoice({ total: 999999.99 });
      
      const matches = findMatches(tx, [invoice]);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].score).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('Accuracy Metrics', () => {
    it('should achieve >80% accuracy on known good matches', () => {
      const testCases = [
        {
          tx: createMockTransaction({ 
            amount: 1000.00,
            date: new Date('2024-01-15'),
            description: 'Invoice #12345',
          }),
          invoice: createMockInvoice({ 
            total: 1000.00,
            invoiceNumber: 12345,
            createdAt: new Date('2024-01-12'),
          }),
          expectedMinScore: 0.8,
        },
        {
          tx: createMockTransaction({ 
            amount: 500.00,
            date: new Date('2024-02-01'),
            description: 'Payment for Invoice #67890',
          }),
          invoice: createMockInvoice({ 
            total: 500.00,
            invoiceNumber: 67890,
            createdAt: new Date('2024-01-28'),
          }),
          expectedMinScore: 0.8,
        },
      ];

      let correctMatches = 0;
      
      for (const testCase of testCases) {
        const matches = findMatches(testCase.tx, [testCase.invoice]);
        if (matches.length > 0 && matches[0].score >= testCase.expectedMinScore) {
          correctMatches++;
        }
      }
      
      const accuracy = (correctMatches / testCases.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(80);
    });
  });
});

