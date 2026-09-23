import { useMemo, useState } from 'react';
import { ErrorState, PageHeader, PageLoader, Panel, StatStrip } from '@/components/ui';
import { GradeStatusBadge } from '@/components/ui/StatusBadge';
import { useMyGrades } from '@/features/grades/hooks';
import { TranscriptButton } from '@/features/transcript/components/TranscriptButton';
import { useSession } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { GRADE_SCALE } from '@/lib/constants';
import { weightedGpa } from '@/lib/gpa';
import { cn, formatNumber } from '@/lib/utils';
import type { Enrollment } from '@/types/models';

export default function MyGradesPage() {
  useDocumentTitle('Дүн');
  const session = useSession();
  const { data, isLoading, error, refetch } = useMyGrades();
  const [openProgress, setOpenProgress] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Enrollment[]>();
    data?.forEach((e) => map.set(e.semester_name ?? '', [...(map.get(e.semester_name ?? '') ?? []), e]));
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  const approved = data?.filter((e) => e.grade_status === 'approved') ?? [];
  const withProgress = data?.filter((e) => e.grade_status !== 'approved' && (e.progress?.graded_max ?? 0) > 0).length ?? 0;

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Миний дүн"
        description="Багшийн оруулсан явцын оноог шууд харна. Үсгэн үнэлгээ, голч оноо нь сургалтын алба баталгаажуулсны дараа гарна."
        actions={<TranscriptButton student={session.student} enrollments={data} />}
      />

      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Нийт голч', value: session.student?.gpa?.toFixed(2) ?? '—' },
          { label: 'Цуглуулсан кредит', value: formatNumber(session.student?.earned_credits) },
          { label: 'Баталгаажсан хичээл', value: approved.length },
          { label: 'Явцын дүнтэй', value: withProgress, sub: 'Баталгаажаагүй' },
        ]}
      />

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([semester, rows]) => {
            const gpa = weightedGpa(rows.filter((r) => r.grade_status === 'approved').map((r) => ({ credit: r.credit ?? 0, gpa_point: r.gpa_point })));
            const credits = rows.reduce((s, r) => s + (r.credit ?? 0), 0);
            return (
              <Panel
                key={semester}
                flush
                title={semester}
                description={`${rows.length} хичээл, ${credits} кредит`}
                actions={
                  <p className="text-[13px] text-muted">
                    Улирлын голч <span className="num ml-1 text-base font-semibold text-ink">{gpa?.toFixed(2) ?? '—'}</span>
                  </p>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-[12.5px] text-muted">
                        <th className="px-5 py-2.5 text-left font-medium">Хичээл</th>
                        <th className="px-3 py-2.5 text-right font-medium">Кредит</th>
                        <th className="px-3 py-2.5 text-right font-medium">Оноо</th>
                        <th className="px-3 py-2.5 text-center font-medium">Үнэлгээ</th>
                        <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Голч оноо</th>
                        <th className="px-5 py-2.5 text-right font-medium">Төлөв</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.flatMap((r) => [
                        <tr key={r.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-3">
                            <p className="font-medium text-ink">{r.subject_name}</p>
                            <p className="text-xs text-faint">{r.subject_code}</p>
                          </td>
                          <td className="num px-3 py-3 text-right">{r.credit}</td>
                          <td className="num px-3 py-3 text-right">
                            {r.total_score ?? (r.progress?.percent !== null && r.progress?.percent !== undefined ? <span className="text-muted">{r.progress.earned} / {r.progress.graded_max}</span> : '—')}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {r.letter_grade ? (
                              <span className={cn('inline-flex h-7 min-w-[34px] items-center justify-center rounded-md px-1.5 text-[13px] font-semibold', r.letter_grade.startsWith('F') ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent-ink')}>
                                {r.letter_grade}
                              </span>
                            ) : (
                              <span className="text-faint">—</span>
                            )}
                          </td>
                          <td className="num hidden px-3 py-3 text-right sm:table-cell">{r.gpa_point?.toFixed(1) ?? '—'}</td>
                          <td className="px-5 py-3 text-right">
                            {r.grade_status === 'approved' ? (
                              <GradeStatusBadge status="approved" />
                            ) : r.grade_status === 'submitted' ? (
                              <span className="text-xs text-accent">Хянагдаж байна</span>
                            ) : r.progress?.graded_max ? (
                              <button type="button" onClick={() => setOpenProgress(openProgress === r.id ? null : r.id)} className="text-xs font-medium text-accent hover:underline">
                                Явцын дүн харах
                              </button>
                            ) : (
                              <span className="text-xs text-faint">Дүн гараагүй</span>
                            )}
                          </td>
                        </tr>,
                        openProgress === r.id && r.progress ? (
                          <tr key={`${r.id}-progress`} className="border-b border-line bg-paper/60">
                            <td colSpan={6} className="px-5 py-4">
                              <p className="mb-2 text-[13px] font-medium text-ink-soft">
                                Явцын дүн, {r.progress.earned} / {r.progress.graded_max} оноо
                                {r.progress.percent !== null && <span className="ml-1.5 font-normal text-muted">({r.progress.percent}%)</span>}
                              </p>
                              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {r.progress.items.map((item) => (
                                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-field border border-line bg-white px-3 py-2">
                                    <span className="truncate text-[13px] text-ink-soft">{item.name}</span>
                                    <span className="num shrink-0 text-[13px]">
                                      {item.score === null ? <span className="text-faint">— / {item.max_score}</span> : <span className="font-medium text-ink">{item.score} / {item.max_score}</span>}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-2.5 text-xs text-faint">
                                Үлдсэн {r.progress.remaining_max} оноо шалгалт, даалгавраар цуглуулна. Эцсийн үнэлгээ сургалтын алба баталгаажуулсны дараа гарна.
                              </p>
                            </td>
                          </tr>
                        ) : null,
                      ])}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })}

          <details className="rounded-box border border-line bg-white px-5 py-3 text-sm">
            <summary className="cursor-pointer select-none font-medium text-ink-soft">Үнэлгээний шкал</summary>
            <div className="mt-3 grid grid-cols-3 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-4 lg:grid-cols-6">
              {GRADE_SCALE.map((g, i) => (
                <p key={g.letter} className="num flex justify-between gap-2 text-muted">
                  <span className="font-medium text-ink">{g.letter}</span>
                  <span>{g.min}{i === 0 ? '–100' : `–${GRADE_SCALE[i - 1].min - 1}`}</span>
                  <span>{g.point.toFixed(1)}</span>
                </p>
              ))}
            </div>
          </details>
        </div>
      )}
    </>
  );
}
