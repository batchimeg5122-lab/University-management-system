import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BRAND } from '../constants/env';
import type { StudentCertificate } from '../types/models';
import { CERT_PURPOSE } from '../utils/constants';
import { date, gpa } from '../utils/format';

const STATUS_TEXT: Record<string, string> = {
  active: 'суралцаж байгаа',
  leave: 'чөлөө авсан',
  graduated: 'төгссөн',
  withdrawn: 'сургуулиас гарсан',
  suspended: 'түдгэлзсэн',
};

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

/** Web-ийн CertificateSheet-тэй ижил бүтэцтэй A4 загвар */
function buildHtml(c: StudentCertificate, verifyUrl: string, logo: string | null, qr: string | null) {
  const s = c.snapshot;
  const status = STATUS_TEXT[s.status] ?? 'суралцаж байгаа';
  const rows: [string, unknown][] = [
    ['Оюутны код', s.student_code],
    ['Регистрийн дугаар', s.register_number],
    ['Сургууль, тэнхим', s.department_name],
    ['Мэргэжил, хөтөлбөр', s.program_name],
    ['Анги', s.class_name],
    ['Курс', s.year_level ? `${s.year_level}-р курс` : null],
    ['Элссэн он', s.enrollment_year],
    ['Суралцах төлөв', status],
    ['Судалж буй улирал', s.semester],
    ...(c.include_gpa
      ? ([
          ['Голч дүн (GPA)', gpa(s.gpa)],
          ['Цуглуулсан кредит', s.earned_credits ?? '—'],
        ] as [string, unknown][])
      : []),
  ];

  const tableRows = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="mn"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 22mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif; color: #172033; font-size: 13px; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1E4B8F; padding-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 56px; height: 56px; object-fit: contain; }
  .brand .name { font-size: 17px; font-weight: 600; }
  .muted { color: #5B6576; }
  .meta { text-align: right; line-height: 1.7; font-size: 12px; }
  h1 { text-align: center; letter-spacing: 3px; font-size: 22px; font-weight: 600; margin: 40px 0 28px; }
  p.body { font-size: 15px; line-height: 1.9; text-align: justify; }
  b { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13.5px; }
  th { width: 36%; text-align: left; font-weight: 400; color: #5B6576; padding: 7px 0; border-bottom: 1px solid #E3E6EB; }
  td { font-weight: 500; padding: 7px 0; border-bottom: 1px solid #E3E6EB; }
  .purpose { margin-top: 20px; color: #5B6576; }
  footer { margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
  .verify { display: flex; gap: 12px; align-items: center; border: 1px solid #E3E6EB; border-radius: 8px; padding: 10px; max-width: 360px; font-size: 11px; color: #5B6576; }
  .verify img { width: 92px; height: 92px; }
  .code { font-size: 17px; font-weight: 700; letter-spacing: 3px; color: #1E4B8F; margin: 3px 0; }
  .sign { text-align: center; font-size: 13px; }
  .sign .line { width: 210px; border-top: 1px solid #172033; padding-top: 6px; margin-top: 44px; }
  .revoked { margin-top: 28px; border: 1px solid #B42318; background: #FDECEA; color: #B42318; padding: 8px; text-align: center; border-radius: 6px; font-weight: 600; }
</style></head>
<body>
  <header>
    <div class="brand">
      ${logo ? `<img src="data:image/png;base64,${logo}" />` : ''}
      <div><div class="name">${esc(BRAND.name)}</div><div class="muted">Сургалтын алба</div></div>
    </div>
    <div class="meta muted">
      <div>Дугаар: ${esc(c.number)}</div>
      <div>Огноо: ${esc(date(c.issued_at))}</div>
      ${c.valid_until ? `<div>Хүчинтэй: ${esc(date(c.valid_until))} хүртэл</div>` : ''}
    </div>
  </header>

  <h1>ТОДОРХОЙЛОЛТ</h1>

  <p class="body">
    Иргэн <b>${esc(s.full_name)}</b> нь ${esc(BRAND.name)}ийн${s.department_name ? ` ${esc(s.department_name)}ийн` : ''}
    <b>${esc(s.program_name ?? '')}</b> мэргэжлийн${s.year_level ? ` ${esc(s.year_level)}-р курсын` : ''}
    ${s.class_name ? `${esc(s.class_name)} ангид` : ''} ${s.enrollment_year ? `${esc(s.enrollment_year)} оноос хойш` : ''}
    <b>${esc(status)}</b> болохыг тодорхойлов.
  </p>

  <table><tbody>${tableRows}</tbody></table>

  <p class="purpose">Зориулалт: <span style="color:#172033">${esc(CERT_PURPOSE[c.purpose] ?? 'Бусад')}</span>${c.purpose_note ? `, ${esc(c.purpose_note)}` : ''}</p>

  <footer>
    <div class="verify">
      ${qr ? `<img src="data:image/png;base64,${qr}" />` : ''}
      <div>
        <div style="color:#172033;font-weight:600">Баталгаажуулах код</div>
        <div class="code">${esc(c.verify_code)}</div>
        <div>Энэ тодорхойлолтын үнэн эсэхийг QR кодыг уншуулж эсвэл ${esc(verifyUrl)} хаягаар шалгана уу.</div>
      </div>
    </div>
    <div class="sign">
      <div class="muted">Сургалтын албаны дарга</div>
      <div class="line">/ гарын үсэг, тамга /</div>
    </div>
  </footer>

  ${c.revoked_at ? `<div class="revoked">Энэ тодорхойлолт ${esc(date(c.revoked_at))}-нд хүчингүй болсон.</div>` : ''}
</body></html>`;
}

/**
 * Тодорхойлолтыг A4 PDF болгоод Share цонх нээнэ
 * (iPhone: "Save to Files", Android: Drive / Telegram / Gmail ...).
 * @param qrBase64 react-native-qrcode-svg-ийн toDataURL()-аас авсан PNG
 */
export async function shareCertificatePdf(c: StudentCertificate, verifyUrl: string, qrBase64: string | null) {
  const logo = await logoBase64();
  const { uri } = await Print.printToFileAsync({ html: buildHtml(c, verifyUrl, logo, qrBase64), width: 595, height: 842 });

  // Ойлгомжтой файлын нэр: todorkhoilolt-2026-000042.pdf
  const ascii = c.number.replace(/[^0-9A-Za-z-]/g, '').replace(/^-+/, '') || 'certificate';
  const target = new File(Paths.cache, `todorkhoilolt-${ascii}.pdf`);
  let finalUri = uri;
  try {
    if (target.exists) target.delete();
    await new File(uri).move(target);
    finalUri = target.uri;
  } catch {
    /* нэр солиогүй ч PDF хэвээр ашиглагдана */
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Тодорхойлолт ${c.number}` });
  } else {
    await Print.printAsync({ uri: finalUri });
  }
}
