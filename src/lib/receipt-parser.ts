// src/lib/receipt-parser.ts
export interface ParsedReceiptData {
  merchant?: string;
  date?: string;
  total?: number;
  tax?: number;
  items?: Array<{
    description: string;
    quantity?: number;
    price?: number;
    total?: number;
  }>;
}

export function parseReceiptText(text: string): ParsedReceiptData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  const result: ParsedReceiptData = {};

  // Simple pattern matching for Spanish receipts
  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Merchant name (usually first non-empty line)
    if (!result.merchant && line.length > 3 && !/\d/.test(line)) {
      result.merchant = line;
    }

    // Date patterns
    const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    if (dateMatch && !result.date) {
      result.date = dateMatch[1];
    }

    // Total amount (look for "total", "importe", "€", etc.)
    if (lowerLine.includes('total') || lowerLine.includes('importe') || lowerLine.includes('suma')) {
      const amountMatch = line.match(/(\d+[,.]\d{2})/);
      if (amountMatch) {
        result.total = parseFloat(amountMatch[1].replace(',', '.'));
      }
    }

    // Tax (IVA)
    if (lowerLine.includes('iva') || lowerLine.includes('igic')) {
      const taxMatch = line.match(/(\d+[,.]\d{2})/);
      if (taxMatch) {
        result.tax = parseFloat(taxMatch[1].replace(',', '.'));
      }
    }
  }

  // Extract items (simple approach - lines with amounts)
  result.items = [];
  for (const line of lines) {
    const amountMatch = line.match(/(\d+[,.]\d{2})\s*$/);
    if (amountMatch && line.length > amountMatch[0].length + 5) {
      const description = line.replace(amountMatch[0], '').trim();
      const total = parseFloat(amountMatch[1].replace(',', '.'));
      result.items.push({
        description,
        total
      });
    }
  }

  return result;
}