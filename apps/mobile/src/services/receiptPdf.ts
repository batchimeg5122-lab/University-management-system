import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { PaymentMethod, PaymentReceipt } from '../types/models';
import { PAYMENT_METHOD_LABEL } from '../utils/constants';
import { date, dateTime, money } from '../utils/format';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

async function logoBase64(): Promise<string | null> {
  try {
    const asset = Asset.fromModule(require('../../assets/logo.png'));
    await asset.downloadAsync();
    if (!asset.localUri) return null;
    return await new File(asset.localUri).base64();
  } catch {
    return null;
  }
}

/** Web-ийн ReceiptSheet-тэй ижил бүтэцтэй A4 загвар */
function buildHtml(r: PaymentReceipt, logo: string | null) {
  const rows: [string, unknown][] = [
    ['Овог нэр', r.student.name],
    ['Оюутны код', r.student.code],
    ['Анги', r.student.class_name],
    ['Хөтөлбөр', r.student.program_name],
    ['Нэхэмжлэл', r.invoice.number],
    ['Улирал', r.invoice.semester],
  ];
  const amounts: [string, string, boolean][] = [
    ['Нэхэмжилсэн дүн', money(r.invoice.tuition_amount), false],
    ...(r.invoice.discount_amount ? ([['Хөнгөлөлт', `−${money(r.invoice.discount_amount)}`, false]] as [string, string, boolean][]) : []),
    ['Төлбөл зохих', money(r.invoice.net_amount), false],
    ['Одоогийн байдлаар төлсөн', money(r.invoice.paid_amount), false],
    ['Үлдэгдэл', money(r.invoice.balance), true],
  ];

  const infoRows = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('');

  const amountRows = amounts
    .map(([k, v, strong]) => `<tr><th>${esc(k)}</th><td class="right${strong ? ' strong' : ''}">${esc(v)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="mn"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif; color: #172033; font-size: 13px; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1E4B8F; padding-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 56px; height: 56px; object-fit: contain; }
  .brand .name { font-size: 17px; font-weight: 600; }
  .muted { color: #5B6576; }
  .meta { text-align: right; line-height: 1.7; font-size: 12px; }
  h1 { text-align: center; letter-spacing: 2px; font-size: 20px; font-weight: 600; margin: 26px 0 4px; }
  .sub { text-align: center; color: #5B6576; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { width: 40%; text-align: left; font-weight: 400; color: #5B6576; padding: 7px 0; border-bottom: 1px solid #E3E6EB; }
  td { font-weight: 500; padding: 7px 0; border-bottom: 1px solid #E3E6EB; }
  td.right { text-align: right; }
  td.strong { font-size: 15px; font-weight: 700; }
  .amount { margin: 22px 0; border: 2px solid rgba(30,75,143,.4); background: rgba(30,75,143,.06); border-radius: 8px; padding: 16px 18px; }
  .amount .big { font-size: 27px; font-weight: 700; color: #1E4B8F; margin: 2px 0 8px; }
  .warn { margin-top: 12px; background: #FEF6E7; border-radius: 6px; padding: 8px 12px; font-size: 12px; }
  footer { margin-top: 54px; display: flex; justify-content: space-between; gap: 32px; }
  .sign { flex: 1; text-align: center; font-size: 12px; color: #5B6576; }
  .sign .line { border-top: 1px solid rgba(23,32,51,.6); margin-top: 46px; padding-top: 6px; }
  .note { margin-top: 26px; border-top: 1px solid #E3E6EB; padding-top: 10px; text-align: center; font-size: 10.5px; color: #8A93A3; }
</style></head>
<body>
  <header>
    <div class="brand">
      ${logo ? `<img src="data:image/png;base64,${logo}" />` : ''}
      <div>
        <div class="name">${esc(r.organization.name)}</div>
        <div class="muted">Санхүүгийн хэлтэс</div>
        ${r.organization.phone || r.organization.email ? `<div class="muted" style="font-size:11px">${esc([r.organization.phone, r.organization.email].filter(Boolean).join(' · '))}</div>` : ''}
      </div>
    </div>
    <div class="meta muted">
      <div>Баримтын дугаар: ${esc(r.receipt_no ?? '—')}</div>
      <div>Төлсөн: ${esc(dateTime(r.payment_date))}</div>
      <div>Хэвлэсэн: ${esc(date(new Date()))}</div>
    </div>
  </header>

  <h1>ТӨЛБӨР ТӨЛСӨН БАРИМТ</h1>
  <p class="sub">Сургалтын төлбөрийн төлөлтийг хүлээн авсныг баталж байна.</p>

  <table><tbody>${infoRows}</tbody></table>

  <div class="amount">
    <div class="muted">Хүлээн авсан дүн</div>
    <div class="big">${esc(money(r.amount))}</div>
    <div>Үгээр: <b>${esc(r.amount_words)}</b></div>
    <div class="muted" style="margin-top:6px">
      Төлсөн хэлбэр: <span style="color:#172033;font-weight:600">${esc(PAYMENT_METHOD_LABEL[r.method as PaymentMethod] ?? r.method)}</span>
      ${r.transaction_reference ? ` · Гүйлгээний дугаар: <span style="color:#172033;font-weight:600">${esc(r.transaction_reference)}</span>` : ''}
    </div>
    ${r.description ? `<div class="muted" style="margin-top:4px">Тайлбар: ${esc(r.description)}</div>` : ''}
  </div>

  <table><tbody>${amountRows}</tbody></table>

  ${
    r.invoice.balance > 0
      ? `<div class="warn">Нэхэмжлэлийн үлдэгдэл <b>${esc(money(r.invoice.balance))}</b> байна${r.invoice.due_date ? ` (төлөх хугацаа ${esc(date(r.invoice.due_date))})` : ''}.</div>`
      : ''
  }

  <footer>
    <div class="sign"><div class="line">Төлбөр хүлээн авсан (нэр, гарын үсэг)</div></div>
    <div class="sign"><div class="line">Тамга / тэмдэг</div></div>
  </footer>

  <div class="note">Энэ баримтыг ${esc(r.organization.name)}-ийн нэгдсэн систем автоматаар үүсгэсэн. Баримтын дугаараар лавлагаа авах боломжтой.</div>
</body></html>`;
}

/**
 * Төлбөрийн баримтыг A4 PDF болгоод Share цонх нээнэ
 * (iPhone: "Save to Files", Android: Drive / Gmail ...).
 */
export async function shareReceiptPdf(r: PaymentReceipt) {
  const logo = await logoBase64();
  const { uri } = await Print.printToFileAsync({ html: buildHtml(r, logo), width: 595, height: 842 });

  const ascii = (r.receipt_no ?? r.id).replace(/[^0-9A-Za-z-]/g, '').replace(/^-+/, '') || 'barimt';
  const target = new File(Paths.cache, `barimt-${ascii}.pdf`);
  let finalUri = uri;
  try {
    if (target.exists) target.delete();
    await new File(uri).move(target);
    finalUri = target.uri;
  } catch {
    /* нэр солиогүй ч PDF хэвээр ашиглагдана */
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Төлбөрийн баримт ${r.receipt_no ?? ''}`.trim() });
  } else {
    await Print.printAsync({ uri: finalUri });
  }
}
