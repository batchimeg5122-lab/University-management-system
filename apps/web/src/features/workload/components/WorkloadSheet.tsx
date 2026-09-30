import { forwardRef } from 'react';
import { BRAND } from '@/lib/brand';
import { formatDate } from '@/lib/utils';
import { SESSION_KIND_LABEL, type SessionKind, type WorkloadReport } from '../api';

const KINDS: SessionKind[] = ['lecture', 'seminar', 'lab', 'exam'];

/**
 * Хичээлийн цагийн тодорхойлолт — A4, хэвлэх / PDF.
 * Багш өөрийн ачааллыг тэнхим, санхүү, удирдлагад тайлагнахад ашиглана.
 */
export const WorkloadSheet = forwardRef<HTMLDivElement, { report: WorkloadReport }>(({ report: w }, ref) => {
  const issued = new Date();
  const docNo = `ХЦ-${(w.teacher?.id ?? '').slice(0, 8).toUpperCase()}-${issued.toISOString().slice(0, 10).replace(/-/g, '')}`;

  return (
    <div ref={ref} className="w-[794px] bg-white px-10 py-9 text-[11.5px] text-ink">
      <header className="flex items-start justify-between gap-6 border-b-2 border-accent pb-4">
        <div className="flex items-center gap-3">
          <img src={BRAND.logo} alt="" className="h-14 w-14 object-contain" crossOrigin="anonymous" />
          <div>
            <p className="text-[16px] font-semibold leading-tight">{BRAND.name}</p>
            <p className="text-muted">Сургалтын алба</p>
          </div>
        </div>
        <div className="text-right leading-relaxed text-muted">
          <p className="num">Дугаар: {docNo}</p>
          <p className="num">Огноо: {formatDate(issued)}</p>
        </div>
      </header>

      <h1 className="mt-6 text-center text-[18px] font-semibold tracking-wide">ХИЧЭЭЛИЙН ЦАГИЙН ТОДОРХОЙЛОЛТ</h1>
      <p className="mt-1 text-center text-muted">{w.semester?.label ?? 'Улирал тодорхойгүй'}</p>

      <table className="mt-5 w-full border-collapse">
        <tbody>
          {(
            [
              ['Багшийн нэр', w.teacher?.name ?? '—'],
              ['Албан тушаал', w.teacher?.position ?? '—'],
              ['Тэнхим', w.teacher?.department ?? '—'],
              ['Улирлын хугацаа', w.semester?.start_date ? `${formatDate(w.semester.start_date)} – ${formatDate(w.semester.end_date)} (${w.weeks} долоо хоног)` : `${w.weeks} долоо хоног`],
            ] as [string, string][]
          ).map(([k, v]) => (
            <tr key={k} className="border-b border-line/70">
              <th scope="row" className="w-[170px] py-1.5 pr-4 text-left font-medium text-muted">
                {k}
              </th>
              <td className="py-1.5 font-medium">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="mt-6 w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-paper">
            <th className="border border-line px-2 py-1.5 text-left font-medium">#</th>
            <th className="border border-line px-2 py-1.5 text-left font-medium">Хичээл</th>
            <th className="border border-line px-2 py-1.5 text-left font-medium">Анги</th>
            <th className="border border-line px-2 py-1.5 text-right font-medium">Кредит</th>
            <th className="border border-line px-2 py-1.5 text-right font-medium">Оюутан</th>
            {KINDS.map((k) => (
              <th key={k} className="border border-line px-2 py-1.5 text-right font-medium">
                {SESSION_KIND_LABEL[k]}
              </th>
            ))}
            <th className="border border-line px-2 py-1.5 text-right font-medium">7 хоног</th>
            <th className="border border-line px-2 py-1.5 text-right font-medium">Улирал</th>
          </tr>
        </thead>
        <tbody>
          {w.rows.map((r, i) => (
            <tr key={r.course_id}>
              <td className="num border border-line px-2 py-1 text-muted">{i + 1}</td>
              <td className="border border-line px-2 py-1">
                <span className="font-medium">{r.subject_name ?? '—'}</span>
                {r.subject_code ? <span className="num text-faint"> · {r.subject_code}</span> : null}
              </td>
              <td className="border border-line px-2 py-1">{r.class_name ?? '—'}</td>
              <td className="num border border-line px-2 py-1 text-right">{r.credit ?? '—'}</td>
              <td className="num border border-line px-2 py-1 text-right">{r.student_count}</td>
              {KINDS.map((k) => (
                <td key={k} className="num border border-line px-2 py-1 text-right">
                  {r.weekly[k] || '—'}
                </td>
              ))}
              <td className="num border border-line px-2 py-1 text-right font-semibold">{r.weekly_total}</td>
              <td className="num border border-line px-2 py-1 text-right">{r.semester_total}</td>
            </tr>
          ))}
          {!w.rows.length && (
            <tr>
              <td colSpan={10} className="border border-line px-2 py-4 text-center text-muted">
                Энэ улиралд оноогдсон хичээл алга.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-accent-soft/50 font-semibold">
            <td className="border border-line px-2 py-1.5" colSpan={3}>
              Нийт ({w.totals.courses} хичээл, {w.totals.classes} анги)
            </td>
            <td className="num border border-line px-2 py-1.5 text-right">{w.totals.credits}</td>
            <td className="num border border-line px-2 py-1.5 text-right">{w.totals.students}</td>
            {KINDS.map((k) => (
              <td key={k} className="num border border-line px-2 py-1.5 text-right">
                {w.totals.by_type[k] || '—'}
              </td>
            ))}
            <td className="num border border-line px-2 py-1.5 text-right">{w.totals.weekly_hours}</td>
            <td className="num border border-line px-2 py-1.5 text-right">{w.totals.semester_hours}</td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-3 text-[10.5px] text-faint">
        Нэг хичээлийн цаг = {w.academic_minutes} минут. Долоо хоногийн нийт {w.totals.weekly_minutes} минут ({w.totals.weekly_hours} академик цаг).
        Улирлын цагийг {w.weeks} долоо хоногоор бодов.
        {w.totals.cancelled ? ` Хугацаанд ${w.totals.cancelled} удаагийн хичээл цуцлагдсан.` : ''}
      </p>

      <div className="mt-12 flex items-end justify-between gap-10">
        <div className="flex-1">
          <div className="border-b border-ink/60 pb-8" />
          <p className="mt-1.5 text-center text-muted">Багш (нэр, гарын үсэг)</p>
        </div>
        <div className="flex-1">
          <div className="border-b border-ink/60 pb-8" />
          <p className="mt-1.5 text-center text-muted">Тэнхимийн эрхлэгч</p>
        </div>
        <div className="flex-1">
          <div className="border-b border-ink/60 pb-8" />
          <p className="mt-1.5 text-center text-muted">Сургалтын алба</p>
        </div>
      </div>
    </div>
  );
});
WorkloadSheet.displayName = 'WorkloadSheet';
