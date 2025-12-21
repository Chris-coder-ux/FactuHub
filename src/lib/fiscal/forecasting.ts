import Invoice from '../models/Invoice';
import FiscalProjection, { IFiscalProjection } from '../models/FiscalProjection';

export interface ForecastingData {
  historicalInvoices: number;
  averageMonthlyRevenue: number;
  averageMonthlyIVA: number;
  monthsOfData: number;
}

export async function generateIVAProjections(userId: string, year: number): Promise<IFiscalProjection[]> {
  const data = await getHistoricalData(userId);

  const projections: IFiscalProjection[] = [];

  for (let quarter = 1; quarter <= 4; quarter++) {
    // Calculate IVA based on different rates (21%, 10%, 4%)
    const projectedIVA = calculateIVAByRates(data, quarter);
    const confidence = Math.min(data.monthsOfData / 12, 0.9);

    const projection = new FiscalProjection({
      userId,
      year,
      quarter,
      type: 'iva',
      projectedAmount: projectedIVA,
      confidence,
      basedOnData: {
        historicalInvoices: data.historicalInvoices,
        averageMonthlyRevenue: data.averageMonthlyRevenue,
        taxRate: 0.21, // Primary rate
      },
    });

    projections.push(projection);
  }

  // Save projections
  await FiscalProjection.insertMany(projections);

  return projections;
}

function calculateIVAByRates(data: ForecastingData, quarter: number): number {
  // Simplified: assume 70% at 21%, 20% at 10%, 10% at 4%
  const rate21 = data.averageMonthlyIVA * 0.7 * (0.21 / 0.21); // Normalize to 21% equivalent
  const rate10 = data.averageMonthlyIVA * 0.2 * (0.10 / 0.21);
  const rate4 = data.averageMonthlyIVA * 0.1 * (0.04 / 0.21);

  return (rate21 + rate10 + rate4) * 3; // 3 months per quarter
}

export async function generateIRPFProjection(userId: string, year: number): Promise<IFiscalProjection> {
  const data = await getHistoricalData(userId);

  // Rough IRPF estimation: 20% of annual revenue for autónomos
  const estimatedAnnualRevenue = data.averageMonthlyRevenue * 12;
  const projectedIRPF = estimatedAnnualRevenue * 0.20; // Simplified
  const confidence = Math.min(data.monthsOfData / 24, 0.7); // Needs more historical data

  const projection = new FiscalProjection({
    userId,
    year,
    type: 'irpf',
    projectedAmount: projectedIRPF,
    confidence,
    basedOnData: {
      historicalInvoices: data.historicalInvoices,
      averageMonthlyRevenue: data.averageMonthlyRevenue,
      taxRate: 0.20,
    },
  });

  await projection.save();
  return projection;
}

async function getHistoricalData(userId: string): Promise<ForecastingData> {
  // Get last 12 months of data
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const invoices = await Invoice.find({
    userId,
    createdAt: { $gte: oneYearAgo },
    status: { $in: ['sent', 'paid', 'overdue'] },
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalIVA = invoices.reduce((sum, inv) => {
    return sum + inv.items.reduce((itemSum: number, item: any) => {
      return itemSum + (item.price * item.quantity * (item.taxRate / 100));
    }, 0);
  }, 0);

  const monthsOfData = Math.max(1, Math.ceil((Date.now() - oneYearAgo.getTime()) / (1000 * 60 * 60 * 24 * 30)));

  return {
    historicalInvoices: invoices.length,
    averageMonthlyRevenue: totalRevenue / monthsOfData,
    averageMonthlyIVA: totalIVA / monthsOfData,
    monthsOfData,
  };
}

export async function getFiscalCalendar(year: number): Promise<{ quarter: number; dueDate: Date }[]> {
  // IVA quarterly deadlines: April 20, July 20, October 20, January 30 next year
  // Note: Q1 deadline is in January of the following year
  const currentYear = new Date().getFullYear();
  const isCurrentYear = year === currentYear;
  
  return [
    { 
      quarter: 1, 
      dueDate: new Date(year + 1, 0, 30) // January 30 next year (Q1 of current year)
    },
    { 
      quarter: 2, 
      dueDate: new Date(year, 3, 20) // April 20
    },
    { 
      quarter: 3, 
      dueDate: new Date(year, 6, 20) // July 20
    },
    { 
      quarter: 4, 
      dueDate: new Date(year, 9, 20) // October 20
    },
  ];
}