/**
 * Excel (.xlsx) экспорт / импорт.
 * ExcelJS-ийг зөвхөн хэрэгтэй үед ачаалж (dynamic import), эхний ачаалалтыг хөнгөн байлгана.
 */

export interface ExcelColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
  width?: number;
}

const ACCENT = 'FF1E4B8F';

function download(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Жагсаалтыг Excel болгон татна: толгой мөр тодруулж, шүүлтүүртэй, эхний мөр түгжээтэй */
export async function exportExcel<T>(fileName: string, sheetName: string, columns: ExcelColumn<T>[], rows: T[]) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Их Засаг Их Сургууль';
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = columns.map((c, i) => ({ header: c.header, key: `c${i}`, width: c.width ?? Math.max(12, c.header.length + 4) }));
  rows.forEach((r) => ws.addRow(columns.map((c) => c.value(r) ?? '')));

  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
  head.alignment = { vertical: 'middle' };
  head.height = 22;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  download(await wb.xlsx.writeBuffer(), `${fileName}-${today()}.xlsx`);
}

/** Импортын загвар файл (толгой + жишээ мөр + тайлбарын sheet) */
export async function downloadTemplate(fileName: string, headers: { key: string; label: string; required?: boolean; note?: string }[], example: Record<string, string>) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Өгөгдөл', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = headers.map((h) => ({ header: h.label, key: h.key, width: Math.max(16, h.label.length + 4) }));
  ws.addRow(headers.map((h) => example[h.key] ?? ''));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
  headers.forEach((h, i) => {
    if (h.required) ws.getCell(1, i + 1).value = `${h.label} *`;
  });

  const help = wb.addWorksheet('Заавар');
  help.columns = [
    { header: 'Багана', key: 'label', width: 24 },
    { header: 'Заавал', key: 'required', width: 10 },
    { header: 'Тайлбар', key: 'note', width: 70 },
  ];
  headers.forEach((h) => help.addRow({ label: h.label, required: h.required ? 'Тийм' : '', note: h.note ?? '' }));
  help.getRow(1).font = { bold: true };

  download(await wb.xlsx.writeBuffer(), fileName);
}

/** Энгийн CSV задлагч (хашилттай утга, таслал, мөр шилжилт дэмжинэ) */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const delim = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/**
 * .xlsx эсвэл .csv файлыг уншиж, толгой мөрийн нэрээр объект болгоно.
 * Толгойн "*" тэмдэг, илүүдэл зайг хасна.
 */
export async function readSpreadsheet(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  let matrix: string[][];
  if (/\.csv$/i.test(file.name)) {
    matrix = parseCsv((await file.text()).replace(/^\uFEFF/, ''));
  } else {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('Файлд хуудас (sheet) алга.');
    matrix = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) values.push(row.getCell(c).text?.trim() ?? '');
      matrix.push(values);
    });
  }
  if (matrix.length < 1) throw new Error('Файл хоосон байна.');
  const headers = matrix[0].map((h) => h.replace(/\*/g, '').trim());
  const rows = matrix.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, rows: rows.filter((r) => Object.values(r).some(Boolean)) };
}
