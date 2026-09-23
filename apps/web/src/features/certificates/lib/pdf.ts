import type { StudentCertificate } from '@/types/models';

/**
 * Тодорхойлолтын хуудсыг A4 PDF болгон татна.
 * Сангуудыг зөвхөн хэрэгтэй үед ачаалж, эхний ачаалалтыг хөнгөн байлгана.
 */
export async function downloadCertificatePdf(node: HTMLElement, certificate: StudentCertificate) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const canvas = await html2canvas(node, {
    scale: 2, // тод хэвлэгдэхийн тулд
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;
  const image = canvas.toDataURL('image/jpeg', 0.95);

  if (imgHeight <= pageHeight - margin * 2) {
    pdf.addImage(image, 'JPEG', margin, margin, usableWidth, imgHeight);
  } else {
    // Хэт урт бол хуудас хуваана
    let remaining = imgHeight;
    let position = margin;
    while (remaining > 0) {
      pdf.addImage(image, 'JPEG', margin, position, usableWidth, imgHeight);
      remaining -= pageHeight - margin * 2;
      if (remaining > 0) {
        pdf.addPage();
        position = margin - (imgHeight - remaining);
      }
    }
  }

  pdf.setProperties({
    title: `Тодорхойлолт ${certificate.number}`,
    subject: certificate.snapshot.full_name,
    creator: 'Их Засаг Их Сургууль',
  });

  pdf.save(`${certificate.number}-${certificate.snapshot.student_code}.pdf`);
}
