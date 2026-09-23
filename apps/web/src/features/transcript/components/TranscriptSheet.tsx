import { forwardRef, useMemo } from 'react';
import { BRAND } from '@/lib/brand';
import { GRADE_SCALE, STUDENT_STATUS_LABEL } from '@/lib/constants';
import { weightedGpa } from '@/lib/gpa';
import { formatDate } from '@/lib/utils';
import type { Enrollment, StudentView } from '@/types/models';

export type TranscriptStudent = Pick<
  StudentView,
  'full_name' | 'student_code' | 'register_number' | 'program_name' | 'department_name' | 'class_name' | 'enrollment_year' | 'status' | 'gpa' | 'earned_credits'
>;

/** Баталгаажсан дүнгүүдийг улирлаар бүлэглэнэ */
export function groupTranscript(enrollments: Enrollment[]) {
  const approved = enrollments.filter((e) => e.grade_status === 'approved' && e.gpa_point !== null);
  const map = new Map<string, Enrollment[]>();
  approved.forEach((e) => map.set(e.semester_name ?? '—', [...(map.get(e.semester_name ?? '—') ?? []), e]));
  const semesters = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, rows]) => ({
      name,
      rows: rows.sort((a, b) => (a.subject_code ?? '').localeCompare(b.subject_code ?? '')),
      credits: rows.reduce((s, r) => s + Number(r.credit ?? 0), 0),
      gpa: weightedGpa(rows.map((r) => ({ credit: Number(r.credit ?? 0), gpa_point: r.gpa_point }))),
    }));
  const all = semesters.flatMap((s) => s.rows);
  return {
    semesters,
    totalCredits: all.reduce((s, r) => s + Number(r.credit ?? 0), 0),
    totalGpa: weightedGpa(all.map((r) => ({ credit: Number(r.credit ?? 0), gpa_point: r.gpa_point }))),
    count: all.length,
  };
}

/**
 * Дүнгийн хуудас (Academic Transcript) — A4, хэвлэх / PDF.
 * Зөвхөн Сургалтын алба БАТАЛГААЖУУЛСАН дүнг оруулна.
 */
export const TranscriptSheet = forwardRef<HTMLDivElement, { student: TranscriptStudent; enrollments: Enrollment[] }>(({ student, enrollments }, ref) => {
  const t = useMemo(() => groupTranscript(enrollments), [enrollments]);
  const issued = new Date();
  const docNo = `ДХ-${student.student_code}-${issued.toISOString().slice(0, 10).replace(/-/g, '')}`;

  const info: [string, string | number | null | undefined][] = [
    ['Овог нэр', student.full_name],
    ['Оюутны код', student.student_code],
    ['Регистрийн дугаар', student.register_number],
    ['Хөтөлбөр', student.program_name],
    ['Тэнхим', student.department_name],
    ['Анги', student.class_name],
    ['Элссэн он', student.enrollment_year],
    ['Төлөв', STUDENT_STATUS_LABEL[student.status] ?? student.status],
  ];

  return (
    <div ref={ref} className="w-[794px] bg-white px-10 py-9 text-[12px] text-ink">
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

      <h1 className="mt-6 text-center text-[19px] font-semibold tracking-[0.08em]">ДҮНГИЙН ХУУДАС</h1>
      <p className="text-center text-[11px] tracking-[0.2em] text-muted">ACADEMIC TRANSCRIPT</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-8">
        {info.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line py-1.5">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium">{v ?? '—'}</dd>
          </div>
        ))}
      </dl>

      {t.semesters.length === 0 ? (
        <p className="mt-8 text-center text-muted">Баталгаажсан дүн одоогоор алга.</p>
      ) : (
        t.semesters.map((s) => (
          <section key={s.name} className="mt-5" style={{ breakInside: 'avoid' }}>
            <h2 className="mb-1.5 text-[13px] font-semibold">{s.name}</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-accent-soft text-left">
                  <th className="border border-line px-2 py-1 font-medium">№</th>
                  <th className="border border-line px-2 py-1 font-medium">Код</th>
                  <th className="border border-line px-2 py-1 font-medium">Хичээлийн нэр</th>
                  <th className="border border-line px-2 py-1 text-center font-medium">Кредит</th>
                  <th className="border border-line px-2 py-1 text-center font-medium">Оноо</th>
                  <th className="border border-line px-2 py-1 text-center font-medium">Үнэлгээ</th>
                  <th className="border border-line px-2 py-1 text-center font-medium">Голч</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="num border border-line px-2 py-1 text-muted">{i + 1}</td>
                    <td className="num border border-line px-2 py-1">{r.subject_code}</td>
                    <td className="border border-line px-2 py-1">{r.subject_name}</td>
                    <td className="num border border-line px-2 py-1 text-center">{r.credit}</td>
                    <td className="num border border-line px-2 py-1 text-center">{r.total_score}</td>
                    <td className="border border-line px-2 py-1 text-center font-semibold">{r.letter_grade}</td>
                    <td className="num border border-line px-2 py-1 text-center">{r.gpa_point?.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <td colSpan={3} className="border border-line px-2 py-1 text-right text-muted">Улирлын дүн</td>
                  <td className="num border border-line px-2 py-1 text-center">{s.credits}</td>
                  <td colSpan={2} className="border border-line px-2 py-1 text-right text-muted">GPA</td>
                  <td className="num border border-line px-2 py-1 text-center">{s.gpa?.toFixed(2) ?? '—'}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        ))
      )}

      <div className="mt-6 flex items-center justify-between rounded-md border border-accent/40 bg-accent-soft px-4 py-3">
        <p>
          Нийт судалсан: <b className="num">{t.count}</b> хичээл · Нийт кредит: <b className="num">{t.totalCredits}</b>
        </p>
        <p className="text-[14px]">
          Нийт голч (GPA): <b className="num text-accent">{t.totalGpa?.toFixed(2) ?? '—'}</b>
        </p>
      </div>

      <div className="mt-5 text-[10.5px] text-muted">
        <p className="mb-1 font-medium text-ink">Үнэлгээний шкал</p>
        <p className="num">{GRADE_SCALE.map((g) => `${g.letter} ${g.min}+ (${g.point.toFixed(1)})`).join(' · ')}</p>
      </div>

      <footer className="mt-10 flex items-end justify-between">
        <p className="max-w-[360px] text-[10.5px] leading-relaxed text-muted">
          Энэхүү дүнгийн хуудсанд зөвхөн Сургалтын алба баталгаажуулсан дүн орсон болно. Албан ёсны хувь нь Сургалтын албаны гарын үсэг, тамгатай байна.
        </p>
        <div className="text-center">
          <p className="mb-9 text-muted">Сургалтын албаны дарга</p>
          <p className="w-52 border-t border-ink pt-1">/ гарын үсэг, тамга /</p>
        </div>
      </footer>
    </div>
  );
});
TranscriptSheet.displayName = 'TranscriptSheet';
