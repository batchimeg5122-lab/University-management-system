import nodemailer from 'nodemailer';
import { supabase } from '../../config/supabase';
import { HttpError } from '../../middleware/error.middleware';
import { APP_TIMEZONE, localDate, localWeekday } from '../../utils/local-date';
import { atRisk } from './risk.service';

const DAY = 86_400_000;
const money = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`;
const count = async (build: () => any) => (await build()).count ?? 0;
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Долоо хоногийн тойм (сүүлийн 7 хоног) */
export async function weeklySummary() {
  const to = localDate();
  const from = new Date(Date.now() - 7 * DAY).toISOString().slice(0, 10);
  const next7 = new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10);

  const [activeStudents, attTotal, attOk, submitted, payments, overdue, exams, events, risk] = await Promise.all([
    count(() => supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active')),
    count(() => supabase.from('attendance').select('id', { count: 'exact', head: true }).gte('attendance_date', from)),
    count(() => supabase.from('attendance').select('id', { count: 'exact', head: true }).gte('attendance_date', from).in('status', ['present', 'late', 'excused'])),
    count(() => supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('grade_status', 'submitted')),
    supabase.from('payments').select('amount').gte('payment_date', `${from}T00:00:00`).limit(20000),
    supabase.from('invoices').select('net_amount, paid_amount').eq('status', 'overdue').limit(20000),
    supabase.from('exams').select('exam_date, start_time, courses(subjects(name), classes(code))').gte('exam_date', to).lte('exam_date', next7).order('exam_date').limit(50),
    supabase.from('academic_events').select('title, start_date, end_date').gte('end_date', to).lte('start_date', next7).order('start_date').limit(20),
    atRisk().catch(() => null),
  ]);

  const paid = (payments.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const debt = (overdue.data ?? []).reduce((s: number, i: any) => s + Math.max(0, Number(i.net_amount) - Number(i.paid_amount)), 0);

  return {
    period: { from, to },
    students: activeStudents,
    attendance: { records: attTotal, rate: attTotal ? Math.round((attOk / attTotal) * 1000) / 10 : null },
    grades_awaiting_approval: submitted,
    finance: { collected_7d: paid, payments_7d: payments.data?.length ?? 0, overdue_debt: debt, overdue_invoices: overdue.data?.length ?? 0 },
    risk: risk ? { high: risk.summary.high, medium: risk.summary.medium, top: risk.rows.slice(0, 10).map((r) => ({ name: r.full_name, class: r.class_name, score: r.score, reasons: r.reasons.slice(0, 2) })) } : null,
    upcoming_exams: (exams.data ?? []).map((e: any) => ({ date: e.exam_date, time: String(e.start_time).slice(0, 5), subject: e.courses?.subjects?.name, class: e.courses?.classes?.code })),
    upcoming_events: events.data ?? [],
  };
}

export function renderHtml(s: Awaited<ReturnType<typeof weeklySummary>>) {
  const kpi = (label: string, value: string, sub = '') =>
    `<td style="padding:12px;border:1px solid #E3E6EB;border-radius:8px;width:25%"><div style="color:#5B6576;font-size:12px">${esc(label)}</div><div style="font-size:20px;font-weight:600;color:#172033">${esc(value)}</div><div style="color:#8A93A3;font-size:11px">${esc(sub)}</div></td>`;
  return `<!DOCTYPE html><html><body style="margin:0;background:#F6F7F9;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#172033">
<div style="max-width:680px;margin:0 auto;padding:24px">
  <div style="background:#1E4B8F;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px">
    <div style="font-size:13px;opacity:.8">Их Засаг Их Сургууль</div>
    <div style="font-size:20px;font-weight:600">Долоо хоногийн тойм</div>
    <div style="font-size:12px;opacity:.8">${esc(s.period.from)} – ${esc(s.period.to)}</div>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:20px 24px">
    <table style="width:100%;border-spacing:8px;margin:-8px"><tr>
      ${kpi('Идэвхтэй оюутан', s.students.toLocaleString('en-US'))}
      ${kpi('Ирц (7 хоног)', s.attendance.rate !== null ? `${s.attendance.rate}%` : '—', `${s.attendance.records.toLocaleString('en-US')} бүртгэл`)}
      ${kpi('Орлого (7 хоног)', money(s.finance.collected_7d), `${s.finance.payments_7d} төлөлт`)}
      ${kpi('Хэтэрсэн өр', money(s.finance.overdue_debt), `${s.finance.overdue_invoices} нэхэмжлэл`)}
    </tr></table>
    <p style="margin:18px 0 6px;font-weight:600">Анхаарах</p>
    <ul style="margin:0;padding-left:18px;line-height:1.7;font-size:14px">
      <li>Батлагдахыг хүлээж буй дүн: <b>${s.grades_awaiting_approval}</b></li>
      ${s.risk ? `<li>Сурлагын өндөр эрсдэлтэй: <b style="color:#B42318">${s.risk.high}</b>, дунд: <b>${s.risk.medium}</b></li>` : ''}
    </ul>
    ${
      s.risk?.top.length
        ? `<p style="margin:18px 0 6px;font-weight:600">Эрсдэл өндөр оюутнууд</p><table style="width:100%;border-collapse:collapse;font-size:13px">${s.risk.top
            .map((r) => `<tr><td style="padding:6px;border-bottom:1px solid #E3E6EB">${esc(r.name)} <span style="color:#8A93A3">${esc(r.class ?? '')}</span></td><td style="padding:6px;border-bottom:1px solid #E3E6EB;color:#5B6576">${esc(r.reasons.join(', '))}</td><td style="padding:6px;border-bottom:1px solid #E3E6EB;text-align:right;font-weight:600">${r.score}</td></tr>`)
            .join('')}</table>`
        : ''
    }
    ${
      s.upcoming_exams.length
        ? `<p style="margin:18px 0 6px;font-weight:600">Ирэх 7 хоногийн шалгалт</p><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${s.upcoming_exams.map((e) => `<li>${esc(e.date)} ${esc(e.time)} — ${esc(e.subject)} (${esc(e.class)})</li>`).join('')}</ul>`
        : ''
    }
    ${
      s.upcoming_events.length
        ? `<p style="margin:18px 0 6px;font-weight:600">Академик календарь</p><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${s.upcoming_events.map((e: any) => `<li>${esc(e.start_date)}${e.end_date !== e.start_date ? ` – ${esc(e.end_date)}` : ''}: ${esc(e.title)}</li>`).join('')}</ul>`
        : ''
    }
    <p style="margin-top:24px;color:#8A93A3;font-size:11px">Энэ тайлан системээс автоматаар илгээгдэв (${esc(APP_TIMEZONE)}).</p>
  </div>
</div></body></html>`;
}

function transporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 587);
  return nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
}

export const smtpConfigured = () => !!transporter();

async function recipients(): Promise<string[]> {
  const fromEnv = (process.env.REPORT_RECIPIENTS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (fromEnv.length) return fromEnv;
  const { data } = await supabase.from('users').select('email').in('role', ['management', 'super_admin']).eq('status', 'active');
  return (data ?? []).map((u: any) => u.email).filter(Boolean);
}

export async function sendWeekly(to?: string[]) {
  const t = transporter();
  if (!t) throw new HttpError(422, 'SMTP тохиргоо алга. apps/api/.env-д SMTP_HOST, SMTP_USER, SMTP_PASS тохируулна уу.');
  const list = to?.length ? to : await recipients();
  if (!list.length) throw new HttpError(422, 'Хүлээн авагч алга (REPORT_RECIPIENTS).');
  const summary = await weeklySummary();
  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: list.join(', '),
    subject: `Их Засаг — долоо хоногийн тойм (${summary.period.from} – ${summary.period.to})`,
    html: renderHtml(summary),
  });
  return { sent: list.length, recipients: list };
}

let lastSentDate = '';
/** Даваа гараг бүр 09 цагт (WEEKLY_REPORT=true үед) — server.ts цагт нэг дуудна */
export async function weeklyJob() {
  if (process.env.WEEKLY_REPORT !== 'true' || !smtpConfigured()) return;
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, hour: 'numeric', hour12: false }).format(new Date()));
  const today = localDate();
  if (localWeekday() !== 1 || hour !== 9 || lastSentDate === today) return;
  lastSentDate = today;
  const r = await sendWeekly();
  console.log(`[weekly-report] ${r.sent} хүлээн авагчид илгээлээ`);
}
