import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPdf = (filename, title, columns, rows) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [columns],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [11, 122, 105], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
};
