import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import BankTransaction from '@/lib/models/BankTransaction';
import Invoice from '@/lib/models/Invoice';
import BankAccount from '@/lib/models/BankAccount';
import Reconciliation from '@/lib/models/Reconciliation';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';

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
    const format = searchParams.get('format') || 'pdf'; // pdf or excel
    const bankAccountId = searchParams.get('bankAccountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Get bank accounts for this company
    const bankAccounts = await BankAccount.find(
      createCompanyFilter(companyId, { userId: session.user.id })
    ).select('_id name accountNumber bankName').lean();
    
    const bankAccountIds = bankAccounts.map(acc => acc._id);
    if (bankAccountIds.length === 0) {
      return NextResponse.json({ error: 'No bank accounts found' }, { status: 404 });
    }
    
    // Filter by specific bank account if provided
    let targetAccountIds = bankAccountIds;
    if (bankAccountId) {
      const accountId = toCompanyObjectId(bankAccountId);
      if (bankAccountIds.some(id => id.toString() === accountId.toString())) {
        targetAccountIds = [accountId];
      } else {
        return NextResponse.json({ error: 'Bank account not found or unauthorized' }, { status: 403 });
      }
    }
    
    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }
    
    // Get transactions
    const transactions = await BankTransaction.find({
      bankAccountId: { $in: targetAccountIds },
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    })
      .populate('bankAccountId', 'name accountNumber bankName')
      .populate('reconciledInvoiceId', 'invoiceNumber total client')
      .sort({ date: -1 })
      .lean();
    
    // Get reconciliations
    const reconciliations = await Reconciliation.find({
      bankAccountId: { $in: targetAccountIds },
      ...(Object.keys(dateFilter).length > 0 && { 
        periodStart: dateFilter.$gte ? { $gte: dateFilter.$gte } : undefined,
        periodEnd: dateFilter.$lte ? { $lte: dateFilter.$lte } : undefined,
      }),
    })
      .populate('bankAccountId', 'name accountNumber')
      .sort({ createdAt: -1 })
      .lean();
    
    // Calculate statistics
    const stats = {
      total: transactions.length,
      reconciled: transactions.filter(t => t.reconciled).length,
      unreconciled: transactions.filter(t => !t.reconciled).length,
      totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      reconciledAmount: transactions.filter(t => t.reconciled).reduce((sum, t) => sum + (t.amount || 0), 0),
      unreconciledAmount: transactions.filter(t => !t.reconciled).reduce((sum, t) => sum + (t.amount || 0), 0),
      reconciliationRate: transactions.length > 0 
        ? (transactions.filter(t => t.reconciled).length / transactions.length) * 100 
        : 0,
    };
    
    // Get invoices for matching analysis
    const invoices = await Invoice.find(
      createCompanyFilter(companyId, {
        status: { $in: ['sent', 'overdue', 'paid'] },
      })
    )
      .populate('client', 'name')
      .lean();
    
    if (format === 'excel') {
      // Generate Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Conciliación Bancaria');
      
      // Title
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = 'Reporte de Conciliación Bancaria';
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      
      // Date range
      if (startDate || endDate) {
        worksheet.mergeCells('A2:H2');
        const dateRange = `${startDate ? new Date(startDate).toLocaleDateString('es-ES') : 'Inicio'} - ${endDate ? new Date(endDate).toLocaleDateString('es-ES') : 'Hoy'}`;
        worksheet.getCell('A2').value = `Período: ${dateRange}`;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };
      }
      
      // Statistics
      let currentRow = 4;
      worksheet.getCell(`A${currentRow}`).value = 'Estadísticas';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
      
      worksheet.getCell(`A${currentRow}`).value = 'Total Transacciones:';
      worksheet.getCell(`B${currentRow}`).value = stats.total;
      currentRow++;
      
      worksheet.getCell(`A${currentRow}`).value = 'Reconciliadas:';
      worksheet.getCell(`B${currentRow}`).value = stats.reconciled;
      currentRow++;
      
      worksheet.getCell(`A${currentRow}`).value = 'No Reconciliadas:';
      worksheet.getCell(`B${currentRow}`).value = stats.unreconciled;
      currentRow++;
      
      worksheet.getCell(`A${currentRow}`).value = 'Tasa de Conciliación:';
      worksheet.getCell(`B${currentRow}`).value = `${stats.reconciliationRate.toFixed(2)}%`;
      currentRow++;
      
      worksheet.getCell(`A${currentRow}`).value = 'Monto Total:';
      worksheet.getCell(`B${currentRow}`).value = stats.totalAmount.toFixed(2);
      worksheet.getCell(`B${currentRow}`).numFmt = '#,##0.00';
      currentRow++;
      
      worksheet.getCell(`A${currentRow}`).value = 'Monto Reconciliado:';
      worksheet.getCell(`B${currentRow}`).value = stats.reconciledAmount.toFixed(2);
      worksheet.getCell(`B${currentRow}`).numFmt = '#,##0.00';
      currentRow++;
      
      worksheet.getCell(`A${currentRow}`).value = 'Monto No Reconciliado:';
      worksheet.getCell(`B${currentRow}`).value = stats.unreconciledAmount.toFixed(2);
      worksheet.getCell(`B${currentRow}`).numFmt = '#,##0.00';
      currentRow += 2;
      
      // Transactions table
      worksheet.getCell(`A${currentRow}`).value = 'Transacciones';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
      
      const headers = ['Fecha', 'Cuenta', 'Descripción', 'Monto', 'Moneda', 'Estado', 'Factura', 'Cliente'];
      worksheet.addRow(headers);
      const headerRow = worksheet.getRow(currentRow);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      };
      headerRow.alignment = { horizontal: 'center' };
      currentRow++;
      
      transactions.forEach(tx => {
        const account = tx.bankAccountId && typeof tx.bankAccountId === 'object' 
          ? `${tx.bankAccountId.bankName || ''} - ${tx.bankAccountId.accountNumber || ''}` 
          : '-';
        const invoice = tx.reconciledInvoiceId && typeof tx.reconciledInvoiceId === 'object'
          ? `#${tx.reconciledInvoiceId.invoiceNumber || ''}`
          : '-';
        const client = tx.reconciledInvoiceId && typeof tx.reconciledInvoiceId === 'object' && tx.reconciledInvoiceId.client && typeof tx.reconciledInvoiceId.client === 'object'
          ? (tx.reconciledInvoiceId.client as any).name || '-'
          : '-';
        
        worksheet.addRow([
          new Date(tx.date).toLocaleDateString('es-ES'),
          account,
          tx.description || '',
          tx.amount || 0,
          tx.currency || 'EUR',
          tx.reconciled ? 'Reconciliada' : 'Pendiente',
          invoice,
          client,
        ]);
        
        const row = worksheet.getRow(currentRow);
        row.getCell(4).numFmt = '#,##0.00';
        if (tx.reconciled) {
          row.getCell(6).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF10B981' },
          };
        } else {
          row.getCell(6).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF59E0B' },
          };
        }
        currentRow++;
      });
      
      // Auto-fit columns
      worksheet.columns.forEach((column, index) => {
        if (index < headers.length) {
          column.width = index === 2 ? 40 : 15; // Description wider
        }
      });
      
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="conciliacion_bancaria_${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else {
      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const PRIMARY = [37, 99, 235]; // #2563eb
      const SECONDARY = [100, 116, 139]; // #64748b
      const DARK = [15, 23, 42]; // #0f172a
      const GREEN = [16, 185, 129]; // #10b981
      const YELLOW = [245, 158, 11]; // #f59e0b
      
      let yPos = 20;
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
      doc.text('Reporte de Conciliación Bancaria', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      // Date range
      if (startDate || endDate) {
        doc.setFontSize(10);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        const dateRange = `${startDate ? new Date(startDate).toLocaleDateString('es-ES') : 'Inicio'} - ${endDate ? new Date(endDate).toLocaleDateString('es-ES') : 'Hoy'}`;
        doc.text(`Período: ${dateRange}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
      }
      
      // Statistics section
      doc.setFontSize(12);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text('Estadísticas', 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.text('Total Transacciones:', 20, yPos);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text(`${stats.total}`, 80, yPos);
      yPos += 6;
      
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.text('Reconciliadas:', 20, yPos);
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.text(`${stats.reconciled}`, 80, yPos);
      yPos += 6;
      
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.text('No Reconciliadas:', 20, yPos);
      doc.setTextColor(YELLOW[0], YELLOW[1], YELLOW[2]);
      doc.text(`${stats.unreconciled}`, 80, yPos);
      yPos += 6;
      
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.text('Tasa de Conciliación:', 20, yPos);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text(`${stats.reconciliationRate.toFixed(2)}%`, 80, yPos);
      yPos += 6;
      
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.text('Monto Total:', 20, yPos);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text(`${stats.totalAmount.toFixed(2)} €`, 80, yPos);
      yPos += 6;
      
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.text('Monto Reconciliado:', 20, yPos);
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.text(`${stats.reconciledAmount.toFixed(2)} €`, 80, yPos);
      yPos += 6;
      
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.text('Monto No Reconciliado:', 20, yPos);
      doc.setTextColor(YELLOW[0], YELLOW[1], YELLOW[2]);
      doc.text(`${stats.unreconciledAmount.toFixed(2)} €`, 80, yPos);
      yPos += 15;
      
      // Transactions table
      const tableData = transactions.map(tx => {
        const account = tx.bankAccountId && typeof tx.bankAccountId === 'object' 
          ? `${tx.bankAccountId.bankName || ''} - ${tx.bankAccountId.accountNumber || ''}`.substring(0, 25)
          : '-';
        const invoice = tx.reconciledInvoiceId && typeof tx.reconciledInvoiceId === 'object'
          ? `#${tx.reconciledInvoiceId.invoiceNumber || ''}`
          : '-';
        const status = tx.reconciled ? 'Reconciliada' : 'Pendiente';
        
        return [
          new Date(tx.date).toLocaleDateString('es-ES'),
          account,
          (tx.description || '').substring(0, 30),
          `${(tx.amount || 0).toFixed(2)} €`,
          status,
          invoice,
        ];
      });
      
      (doc as any).autoTable({
        head: [['Fecha', 'Cuenta', 'Descripción', 'Monto', 'Estado', 'Factura']],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: PRIMARY },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 50 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
        },
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || yPos;
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="conciliacion_bancaria_${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }
  } catch (error: any) {
    logger.error('Export reconciliation report error', error);
    
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

