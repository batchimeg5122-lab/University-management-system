import { useState } from 'react';
import { ChevronDown, ClipboardCheck } from 'lucide-react';
import { Button, EmptyState, ErrorState, ExportButton, Modal, PageHeader, PageLoader, Panel, Textarea } from '@/components/ui';
import { GradeDistributionChart } from '@/components/charts/GradeDistributionChart';
import { useToast } from '@/components/ui/Toast';
import { usePendingGrades, useReviewGrades } from '@/features/grades/hooks';
import type { PendingGradeGroup } from '@/features/grades/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { exportExcel } from '@/lib/excel';
import { letterBucket } from '@/lib/gpa';
import { cn, formatDateTime, shortName } from '@/lib/utils';

/** Хичээлээр бүлэглэсэн дүнг Excel-д тохирох нэг хүснэгт болгоно */
function flatPending(groups: PendingGradeGroup[]) {
  return groups.flatMap((g) =>
    g.rows.map((r) => ({
      subject_name: g.course.subject_name ?? null,
      class_name: g.course.class_name ?? null,
      teacher_name: g.course.teacher_name ?? null,
      submitted_at: g.submitted_at ? formatDateTime(g.submitted_at) : null,
      student_code: r.student_code ?? null,
      student_name: r.student_name ?? null,
      total_score: r.total_score,
      letter_grade: r.letter_grade,
      gpa_point: r.gpa_point,
    })),
  );
}

function distributionOf(g: PendingGradeGroup) {
  const d = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  g.rows.forEach((r) => { const b = letterBucket(r.letter_grade); if (b) d[b]++; });
  return d;
}

export default function GradeApprovalPage() {
  useDocumentTitle('Дүн баталгаажуулалт');
  const toast = useToast();
  const { can } = useRole();
  const { data, isLoading, error, refetch } = usePendingGrades();
  const { approve, reject } = useReviewGrades();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingGradeGroup | null>(null);
  const [reason, setReason] = useState('');

  const onApprove = async (g: PendingGradeGroup) => {
    try {
      const res = await approve.mutateAsync(g.course.id);
      toast.success(`${res.approved} оюутны дүн баталгаажлаа. Оюутнуудад мэдэгдэл илгээгдлээ.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const onReject = async () => {
    try {
      await reject.mutateAsync({ courseId: rejecting!.course.id, reason });
      toast.success('Дүнг багш руу буцаалаа');
      setRejecting(null);
      setReason('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Дүн баталгаажуулалт"
        description="Багш нарын илгээсэн дүнг хянаж баталгаажуулна. Баталгаажсаны дараа оюутанд харагдаж, голч дүн дахин бодогдоно."
        actions={
          <ExportButton
            label="Илгээсэн дүн"
            disabled={!data?.length}
            onExport={() =>
              // Хичээл × оюутны нэг хүснэгт — хянахад бэлэн
              exportExcel('ilgeesen-dun', 'Илгээсэн дүн', [
                { header: 'Хичээл', value: (r) => r.subject_name, width: 32 },
                { header: 'Анги', value: (r) => r.class_name, width: 14 },
                { header: 'Багш', value: (r) => r.teacher_name, width: 26 },
                { header: 'Илгээсэн', value: (r) => r.submitted_at, width: 18 },
                { header: 'Оюутны код', value: (r) => r.student_code, width: 14 },
                { header: 'Оюутан', value: (r) => r.student_name, width: 28 },
                { header: 'Нийт оноо', value: (r) => r.total_score },
                { header: 'Үнэлгээ', value: (r) => r.letter_grade },
                { header: 'Голч (4.0)', value: (r) => r.gpa_point },
              ], flatPending(data ?? []))
            }
          />
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <Panel><EmptyState icon={ClipboardCheck} title="Хянах дүн алга" description="Багш дүн илгээхэд энд харагдана." /></Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((g) => {
            const open = expanded === g.course.id;
            const failing = g.rows.filter((r) => r.letter_grade === 'F').length;
            return (
              <Panel key={g.course.id} flush>
                <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center">
                  <button onClick={() => setExpanded(open ? null : g.course.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-faint transition-transform', open && 'rotate-180')} />
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-ink">{g.course.subject_name}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        {g.course.class_name}, {shortName(g.course.teacher_name)} багш, {formatDateTime(g.submitted_at)}
                      </span>
                    </span>
                  </button>
                  <dl className="num flex gap-6 pl-7 text-[13px] md:pl-0">
                    <div><dt className="text-faint">Оюутан</dt><dd className="font-semibold text-ink">{g.count}</dd></div>
                    <div><dt className="text-faint">Дундаж</dt><dd className="font-semibold text-ink">{g.avg_score.toFixed(1)}</dd></div>
                    <div><dt className="text-faint">F үнэлгээ</dt><dd className={cn('font-semibold', failing ? 'text-danger' : 'text-ink')}>{failing}</dd></div>
                  </dl>
                  {can('grades_approve') && (
                    <div className="flex gap-2 pl-7 md:pl-0">
                      <Button size="sm" variant="danger" onClick={() => setRejecting(g)}>Буцаах</Button>
                      <Button size="sm" variant="primary" onClick={() => onApprove(g)} loading={approve.isPending && approve.variables === g.course.id}>Баталгаажуулах</Button>
                    </div>
                  )}
                </div>
                {open && (
                  <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <GradeDistributionChart distribution={distributionOf(g)} />
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-line text-[12.5px] text-muted">
                            <th className="py-2 text-left font-medium">Оюутан</th>
                            <th className="py-2 text-right font-medium">Оноо</th>
                            <th className="py-2 text-right font-medium">Үнэлгээ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.map((r) => (
                            <tr key={r.id} className="border-b border-line last:border-0">
                              <td className="py-2">{r.student_name} <span className="text-xs text-faint">{r.student_code}</span></td>
                              <td className="num py-2 text-right">{r.total_score}</td>
                              <td className={cn('py-2 text-right font-semibold', r.letter_grade === 'F' ? 'text-danger' : 'text-ink')}>{r.letter_grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        size="sm"
        title="Дүнг буцаах"
        description={rejecting ? `${rejecting.course.subject_name}, ${rejecting.course.class_name}` : undefined}
        footer={<><Button onClick={() => setRejecting(null)}>Болих</Button><Button variant="danger" onClick={onReject} loading={reject.isPending} disabled={!reason.trim()}>Буцаах</Button></>}
      >
        <Textarea label="Буцаах шалтгаан" required placeholder="Жишээ нь: Бие даалтын оноо 3 оюутанд дутуу байна." value={reason} onChange={(e) => setReason(e.target.value)} hint="Багшид мэдэгдлээр очно." />
      </Modal>
    </>
  );
}
