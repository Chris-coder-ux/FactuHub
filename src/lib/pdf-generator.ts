import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Invoice, Settings } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as qrcode from 'qrcode';

// Extend jsPDF with autotable types
interface JsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export const generateInvoicePDF = async (invoice: Invoice, settings: Settings | null) => {
  const doc = new jsPDF() as JsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors - Premium Blue and Grays
  const PRIMARY = [37, 99, 235]; // #2563eb
  const SECONDARY = [100, 116, 139]; // #64748b
  const DARK = [15, 23, 42]; // #0f172a

  // 1. Header & Logo
  doc.setFontSize(24);
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.text(settings?.companyName || 'FACTURALY', 20, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
  doc.text('FACTURA', pageWidth - 20, 25, { align: 'right' });
  
  doc.setFontSize(18);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(invoice.invoiceNumber, pageWidth - 20, 35, { align: 'right' });

  // 2. Company & Client Info
  doc.setFontSize(9);
  doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
  doc.text('DE:', 20, 50);
  doc.text('PARA:', 120, 50);

  doc.setFontSize(10);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  
  // Company Details
  let currentY = 56;
  doc.text(settings?.companyName || 'Empresa Emisora', 20, currentY);
  currentY += 5;
  doc.text(`NIF: ${settings?.taxId || '-'}`, 20, currentY);
  currentY += 5;
  doc.text(settings?.address.street || '', 20, currentY);
  currentY += 5;
  doc.text(`${settings?.address.zipCode || ''} ${settings?.address.city || ''}`, 20, currentY);
  currentY += 5;
  doc.text(settings?.email || '', 20, currentY);

  // Client Details
  currentY = 56;
  doc.text(invoice.client.name, 120, currentY);
  currentY += 5;
  doc.text(`NIF: ${invoice.client.taxId || '-'}`, 120, currentY);
  currentY += 5;
  doc.text(invoice.client.address?.street || '', 120, currentY);
  currentY += 5;
  doc.text(`${invoice.client.address?.zipCode || ''} ${invoice.client.address?.city || ''}`, 120, currentY);
  currentY += 5;
  doc.text(invoice.client.email, 120, currentY);

  // 3. Invoice Meta (Dates)
  currentY = 90;
  doc.setFillColor(248, 250, 252); // Very light gray bg
  doc.rect(20, currentY, pageWidth - 40, 15, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
  doc.text('FECHA EMISIÓN', 25, currentY + 6);
  doc.text('FECHA VENCIMIENTO', 80, currentY + 6);
  doc.text('ESTADO', 150, currentY + 6);

  doc.setFontSize(10);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  const issuedDate = invoice.issuedDate ? new Date(invoice.issuedDate) : new Date();
  doc.text(format(issuedDate, 'dd MMM yyyy', { locale: es }), 25, currentY + 11);
  doc.text(format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: es }), 80, currentY + 11);
  
   const statusLabels: Record<string, string> = {
     draft: 'BORRADOR',
     sent: 'ENVIADA',
     paid: 'PAGADA',
     overdue: 'VENCIDA',
     cancelled: 'ANULADA'
   };
   doc.text(statusLabels[invoice.status] || invoice.status.toUpperCase(), 150, currentY + 11);

   // VeriFactu Status
   if (invoice.verifactuStatus) {
     const verifactuLabels: Record<string, string> = {
       pending: 'VERIFACTU: PENDIENTE',
       sent: 'VERIFACTU: ENVIADO',
       verified: 'VERIFACTU: VERIFICADO',
       rejected: 'VERIFACTU: RECHAZADO',
       error: 'VERIFACTU: ERROR'
     };
     doc.setFontSize(8);
     doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
     doc.text(verifactuLabels[invoice.verifactuStatus] || `VERIFACTU: ${invoice.verifactuStatus.toUpperCase()}`, 20, currentY + 20);
     doc.setFontSize(9);
     doc.setTextColor(DARK[0], DARK[1], DARK[2]);
   }

  // 4. Items Table
  const tableData = invoice.items.map(item => [
    (item.product as any).name || item.product,
    item.quantity.toString(),
    `${item.price.toFixed(2)}€`,
    `${item.tax}%`,
    `${item.total.toFixed(2)}€`
  ]);

  doc.autoTable({
    startY: 115,
    head: [['Descripción', 'Cant.', 'Precio Unit.', 'IVA', 'Total']],
    body: tableData,
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: 20, right: 20 }
  });

  // 5. Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
  doc.text('Subtotal:', pageWidth - 60, finalY);
  doc.text('Impuestos:', pageWidth - 60, finalY + 7);
  
  doc.setFontSize(12);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageWidth - 60, finalY + 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.subtotal.toFixed(2)}€`, pageWidth - 20, finalY, { align: 'right' });
  doc.text(`${invoice.tax.toFixed(2)}€`, pageWidth - 20, finalY + 7, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.text(`${invoice.total.toFixed(2)}€`, pageWidth - 20, finalY + 16, { align: 'right' });

  // 6. Notes & Footer
  if (invoice.notes) {
    doc.setFontSize(9);
    doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
    doc.setFont('helvetica', 'italic');
    doc.text('Notas / Términos:', 20, finalY + 35);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 40);
    doc.text(splitNotes, 20, finalY + 40);
  }

  // VeriFactu QR Code (if applicable)
  if (invoice.verifactuId) {
    try {
      const qrData = {
        numeroFactura: invoice.invoiceNumber,
        fecha: format(issuedDate, 'yyyy-MM-dd'),
        importe: invoice.total.toFixed(2),
        nifEmisor: settings?.taxId || '',
        csv: invoice.verifactuId,
        urlVerificacion: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'}/verify/${invoice._id}`
      };

      const qrDataURL = await qrcode.toDataURL(JSON.stringify(qrData), {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Add QR code to bottom left
      doc.addImage(qrDataURL, 'PNG', 20, doc.internal.pageSize.getHeight() - 50, 30, 30);

      // Add QR label
      doc.setFontSize(6);
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
      doc.text('Código QR VeriFactu', 20, doc.internal.pageSize.getHeight() - 15);
      doc.text('AEAT España', 20, doc.internal.pageSize.getHeight() - 10);
    } catch (error) {
      console.warn('Failed to generate VeriFactu QR code:', error);
    }
  }

  // Footer text
  doc.setFontSize(8);
  doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
  doc.text('Gracias por su confianza.', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

  // Save the PDF
  doc.save(`Factura_${invoice.invoiceNumber}.pdf`);
};
