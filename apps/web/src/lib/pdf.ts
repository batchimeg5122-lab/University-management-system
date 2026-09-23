/**
 * HTML элементийг A4 PDF болгон татна (html2canvas + jsPDF).
 * Сангуудыг зөвхөн хэрэгтэй үед ачаална. Урт бол хуудас хуваана.
 */
export async function exportNodeToPdf(node: HTMLElement, fileName: string, meta: { title: string; subject?: string }) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const pxPerMm = canvas.width / usableW;
  const pagePx = Math.floor(usableH * pxPerMm);

  // Хуудас бүрийг тусад нь зүснэ — мөр дундуур тасрахаас бага зэрэг хамгаална
  for (let y = 0, page = 0; y < canvas.height; y += pagePx, page++) {
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.min(pagePx, canvas.height - y);
    slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableW, slice.height / pxPerMm);
  }

  pdf.setProperties({ title: meta.title, subject: meta.subject ?? '', creator: 'Их Засаг Их Сургууль' });
  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
