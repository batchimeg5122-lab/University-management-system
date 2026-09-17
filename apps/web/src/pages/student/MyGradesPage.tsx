import { useMemo } from 'react';
import { ErrorState, PageHeader, PageLoader, Panel, StatStrip } from '@/components/ui';
import { GradeStatusBadge } from '@/components/ui/StatusBadge';
import { useMyGrades } from '@/features/grades/hooks';
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

  const groups = useMemo(() => {
    const map = new Map<string, Enrollment[]>();
    data?.forEach((e) => map.set(e.semester_name ?? '', [...(map.get(e.semester_name ?? '') ?? []), e]));
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  const approved = data?.filter((e) => e.grade_status === 'approved') ?? [];
  const pending = (data?.length ?? 0) - approved.length;

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Миний дүн" description="Багшийн оруулсан дүн сургалтын албанд баталгаажсаны дараа энд харагдана." />

      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Нийт голч', value: session.student?.gpa?.toFixed(2) ?? '—' },
          { label: 'Цуглуулсан кредит', value: formatNumber(session.student?.earned_credits) },
          { label: 'Баталгаажсан хичээл', value: approved.length },
          { label: 'Хүлээгдэж буй', value: pending, sub: 'Дүн гараагүй' },
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
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-3">
                            <p className="font-medium text-ink">{r.subject_name}</p>
                            <p className="text-xs text-faint">{r.subject_code}</p>
                          </td>
                          <td className="num px-3 py-3 text-right">{r.credit}</td>
                          <td className="num px-3 py-3 text-right">{r.total_score ?? '—'}</td>
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
                            {r.grade_status === 'approved' ? <GradeStatusBadge status="approved" /> : <span className="text-xs text-faint">Дүн гараагүй</span>}
                          </td>
                        </tr>
                      ))}
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
