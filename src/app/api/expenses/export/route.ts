import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const categoryLabels: Record<string, string> = {
  travel: 'Viajes',
  meals: 'Comidas',
  office: 'Oficina',
  supplies: 'Suministros',
  utilities: 'Servicios',
  marketing: 'Marketing',
  software: 'Software',
  professional_services: 'Servicios Profesionales',
  other: 'Otros',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );
    
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf'; // pdf or csv
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    
    // Build filter
    const filter: any = createCompanyFilter(companyId, {});
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (category) {
      filter.category = category;
    }
    
    // Get expenses
    const expenses = await Expense.find(filter)
      .populate('receiptIds')
      .sort({ date: -1 })
      .lean();
    
    if (format === 'csv') {
      // Generate CSV
      const headers = ['Fecha', 'Descripción', 'Proveedor', 'Categoría', 'Importe', 'IVA', 'Total', 'Estado', 'Recibos'];
      const rows = expenses.map(expense => [
        new Date(expense.date).toLocaleDateString('es-ES'),
        expense.description,
        expense.vendor || '',
        categoryLabels[expense.category] || expense.category,
        expense.amount.toFixed(2),
        expense.taxAmount.toFixed(2),
        (expense.amount + expense.taxAmount).toFixed(2),
        statusLabels[expense.status] || expense.status,
        expense.receiptIds?.length || 0
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="gastos_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // Generate PDF
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('Reporte de Gastos', 14, 22);
      
      // Date range
      if (startDate || endDate) {
        doc.setFontSize(10);
        const dateRange = `${startDate ? new Date(startDate).toLocaleDateString('es-ES') : 'Inicio'} - ${endDate ? new Date(endDate).toLocaleDateString('es-ES') : 'Hoy'}`;
        doc.text(`Período: ${dateRange}`, 14, 30);
      }
      
      // Table data
      const tableData = expenses.map(expense => [
        new Date(expense.date).toLocaleDateString('es-ES'),
        expense.description.substring(0, 30),
        expense.vendor?.substring(0, 20) || '-',
        categoryLabels[expense.category] || expense.category,
        `${expense.amount.toFixed(2)} €`,
        `${expense.taxAmount.toFixed(2)} €`,
        `${(expense.amount + expense.taxAmount).toFixed(2)} €`,
        statusLabels[expense.status] || expense.status
      ]);
      
      // Add table
      (doc as any).autoTable({
        head: [['Fecha', 'Descripción', 'Proveedor', 'Categoría', 'Importe', 'IVA', 'Total', 'Estado']],
        body: tableData,
        startY: startDate || endDate ? 35 : 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] }
      });
      
      // Summary
      const total = expenses.reduce((sum, e) => sum + e.amount + e.taxAmount, 0);
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      
      doc.setFontSize(12);
      doc.text(`Total: ${total.toFixed(2)} €`, 14, finalY + 10);
      doc.text(`Gastos: ${expenses.length}`, 14, finalY + 16);
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="gastos_${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }
  } catch (error: any) {
    logger.error('Export expenses error', error);
    
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

