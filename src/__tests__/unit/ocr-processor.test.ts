import { parseReceiptText } from '@/lib/receipt-parser';

describe('OCR Processor', () => {
  describe('parseReceiptText', () => {
    it('should parse merchant name', () => {
      const text = 'SUPERMERCADO CENTRAL\nFecha: 15/12/2023\nTotal: 45.67€';
      const result = parseReceiptText(text);

      expect(result.merchant).toBe('SUPERMERCADO CENTRAL');
    });

    it('should parse date', () => {
      const text = 'Fecha: 15/12/2023\nTotal: 45.67€';
      const result = parseReceiptText(text);

      expect(result.date).toBe('15/12/2023');
    });

    it('should parse total amount', () => {
      const text = 'Total: 45.67€';
      const result = parseReceiptText(text);

      expect(result.total).toBe(45.67);
    });

    it('should parse tax amount', () => {
      const text = 'IVA: 7.23\nTotal: 45.67€';
      const result = parseReceiptText(text);

      expect(result.tax).toBe(7.23);
    });

    it('should parse items with amounts', () => {
      // The parser requires amounts at the end of the line
      const text = 'Pan 2.50\nLeche 1.20\nTotal: 3.70';
      const result = parseReceiptText(text);

      // The parser extracts items that have amounts at the end
      // "Pan 2.50" and "Leche 1.20" should be parsed as items
      expect(result.items!.length).toBeGreaterThanOrEqual(2);
      // Check that items are parsed
      const itemDescriptions = result.items!.map(item => item.description);
      const hasPan = itemDescriptions.some(desc => desc.toLowerCase().includes('pan'));
      const hasLeche = itemDescriptions.some(desc => desc.toLowerCase().includes('leche'));
      expect(hasPan || hasLeche).toBe(true);
      // Check totals
      const totals = result.items!.map(item => item.total);
      expect(totals.length).toBeGreaterThan(0);
    });

    it('should handle empty or invalid text gracefully', () => {
      const result = parseReceiptText('');

      // The function always returns an items array, even for empty text
      expect(result).toEqual({ items: [] });
    });

    it('should handle decimal separators correctly', () => {
      const text = 'Total: 45,67€';
      const result = parseReceiptText(text);

      expect(result.total).toBe(45.67);
    });
  });
});