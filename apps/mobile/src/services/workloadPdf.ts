import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BRAND } from '../constants/env';
import type { SessionKind, WorkloadReport } from '../types/models';
import { SESSION_TYPE_LABEL } from '../utils/constants';
import { date } from '../utils/format';

const KINDS: SessionKind[] = ['lecture', 'seminar', 'lab', 'exam'];

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

/** Web-ийн WorkloadSheet-тэй ижил бүтэцтэй A4 загвар */
function buildHtml(w: WorkloadReport, logo: string | null) {
  const issued = new Date();
  const docNo = `ХЦ-${(w.teacher?.id ?? '').slice(0, 8).toUpperCase()}-${issued.toISOString().slice(0, 10).replace(/-/g, '')}`;

  const info: [string, string][] = [
    ['Багшийн нэр', w.teacher?.name ?? '—'],
    ['Албан тушаал', w.teacher?.position ?? '—'],
    ['Тэнхим', w.teacher?.department ?? '—'],
    [
      'Улирлын хугацаа',
      w.semester?.start_date ? `${date(w.semester.start_date)} – ${date(w.semester.end_date)} (${w.weeks} долоо хоног)` : `${w.weeks} долоо хоног`,
    ],
  ];

  const body = w.rows.length
    ? w.rows
        .map(
          (r, i) => `<tr>
        <td class="c muted">${i + 1}</td>
        <td><b>${esc(r.subject_name ?? '—')}</b>${r.subject_code ? ` <span class="muted">· ${esc(r.subject_code)}</span>` : ''}</td>
        <td>${esc(r.class_name ?? '—')}</td>
        <td class="r">${esc(r.credit ?? '—')}</td>
        <td class="r">${r.student_count}</td>
        ${KINDS.map((k) => `<td class="r">${r.weekly[k] || '—'}</td>`).join('')}
        <td class="r"><b>${r.weekly_total}</b></td>
        <td class="r">${r.semester_total}</td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="10" class="c muted" style="padding:14px">Энэ улиралд оноогдсон хичээл алга.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="mn"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif; color: #172033; font-size: 11.5px; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1E4B8F; padding-bottom: 12px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 52px; height: 52px; object-fit: contain; }
  .brand .name { font-size: 16px; font-weight: 600; }
  .muted { color: #5B6576; }
  .meta { text-align: right; line-height: 1.7; font-size: 11px; }
  h1 { text-align: center; letter-spacing: 1.5px; font-size: 17px; font-weight: 600; margin: 22px 0 2px; }
  .sub { text-align: center; color: #5B6576; margin: 0 0 16px; }
  table.info { width: 100%; border-collapse: collapse; }
  table.info th { width: 170px; text-align: left; font-weight: 400; color: #5B6576; padding: 6px 0; border-bottom: 1px solid #E3E6EB; }
  table.info td { font-weight: 500; padding: 6px 0; border-bottom: 1px solid #E3E6EB; }
  table.load { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 10.5px; }
  table.load th, table.load td { border: 1px solid #E3E6EB; padding: 4px 6px; }
  table.load thead th { background: #F5F6F8; text-align: left; font-weight: 500; }
  table.load .r, table.load th.r { text-align: right; }
  table.load .c { text-align: center; }
  tfoot td { background: rgba(30,75,143,.08); font-weight: 700; }
  .note { margin-top: 10px; font-size: 10px; color: #8A93A3; }
  footer { margin-top: 54px; display: flex; justify-content: space-between; gap: 22px; }
  .sign { flex: 1; text-align: center; font-size: 11px; color: #5B6576; }
  .sign .line { border-top: 1px solid rgba(23,32,51,.6); margin-top: 44px; padding-top: 6px; }
</style></head>
<body>
  <header>
    <div class="brand">
      ${logo ? `<img src="data:image/png;base64,${logo}" />` : ''}
      <div><div class="name">${esc(BRAND.name)}</div><div class="muted">Сургалтын алба</div></div>
    </div>
    <div class="meta muted">
      <div>Дугаар: ${esc(docNo)}</div>
      <div>Огноо: ${esc(date(issued))}</div>
    </div>
  </header>

  <h1>ХИЧЭЭЛИЙН ЦАГИЙН ТОДОРХОЙЛОЛТ</h1>
  <p class="sub">${esc(w.semester?.label ?? 'Улирал тодорхойгүй')}</p>

  <table class="info"><tbody>
    ${info.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
  </tbody></table>

  <table class="load">
    <thead><tr>
      <th>#</th><th>Хичээл</th><th>Анги</th><th class="r">Кредит</th><th class="r">Оюутан</th>
      ${KINDS.map((k) => `<th class="r">${esc(SESSION_TYPE_LABEL[k] ?? k)}</th>`).join('')}
      <th class="r">7 хоног</th><th class="r">Улирал</th>
    </tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr>
      <td colspan="3">Нийт (${w.totals.courses} хичээл, ${w.totals.classes} анги)</td>
      <td class="r">${w.totals.credits}</td>
      <td class="r">${w.totals.students}</td>
      ${KINDS.map((k) => `<td class="r">${w.totals.by_type[k] || '—'}</td>`).join('')}
      <td class="r">${w.totals.weekly_hours}</td>
      <td class="r">${w.totals.semester_hours}</td>
    </tr></tfoot>
  </table>

  <p class="note">
    Нэг хичээлийн цаг = ${w.academic_minutes} минут. Долоо хоногийн нийт ${w.totals.weekly_minutes} минут (${w.totals.weekly_hours} академик цаг).
    Улирлын цагийг ${w.weeks} долоо хоногоор бодов.${w.totals.cancelled ? ` Хугацаанд ${w.totals.cancelled} удаагийн хичээл цуцлагдсан.` : ''}
  </p>

  <footer>
    <div class="sign"><div class="line">Багш (нэр, гарын үсэг)</div></div>
    <div class="sign"><div class="line">Тэнхимийн эрхлэгч</div></div>
    <div class="sign"><div class="line">Сургалтын алба</div></div>
  </footer>
</body></html>`;
}

/** Хичээлийн цагийн тодорхойлолтыг PDF болгоод Share цонх нээнэ */
export async function shareWorkloadPdf(w: WorkloadReport) {
  const logo = await logoBase64();
  const { uri } = await Print.printToFileAsync({ html: buildHtml(w, logo), width: 595, height: 842 });

  const target = new File(Paths.cache, `hicheeliin-tsag-${new Date().toISOString().slice(0, 10)}.pdf`);
  let finalUri = uri;
  try {
    if (target.exists) target.delete();
    await new File(uri).move(target);
    finalUri = target.uri;
  } catch {
    /* нэр солиогүй ч PDF хэвээр ашиглагдана */
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Хичээлийн цагийн тодорхойлолт' });
  } else {
    await Print.printAsync({ uri: finalUri });
  }
}
