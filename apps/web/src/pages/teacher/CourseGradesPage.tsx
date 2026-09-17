import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { Button, ConfirmDialog, ErrorState, PageLoader, Panel } from '@/components/ui';
import { GradeStatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { CourseHeader } from '@/features/courses/components/CourseHeader';
import { useCourseEnrollments, useGradeItems, useSaveGrades, useSubmitGrades } from '@/features/grades/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';
import { computeTotal, scoreToGrade } from '@/lib/gpa';
import { cn } from '@/lib/utils';
import type { GradeStatus } from '@/types/models';

type Draft = Record<string, Record<string, string>>;

export default function CourseGradesPage() {
  const { courseId = '' } = useParams();
  useDocumentTitle('Дүн');
  const toast = useToast();
  const { data: items, isLoading: itemsLoading } = useGradeItems(courseId);
  const { data: enrollments, isLoading, error, refetch } = useCourseEnrollments(courseId);
  const saveGrades = useSaveGrades(courseId);
  const submitGrades = useSubmitGrades(courseId);
  const [draft, setDraft] = useState<Draft>({});
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!enrollments) return;
    setDraft(Object.fromEntries(enrollments.map((e) => [e.id, Object.fromEntries(Object.entries(e.scores).map(([k, v]) => [k, String(v)]))])));
  }, [enrollments]);

  const statusSummary = useMemo(() => {
    const map: Partial<Record<GradeStatus, number>> = {};
    enrollments?.forEach((e) => (map[e.grade_status] = (map[e.grade_status] ?? 0) + 1));
    return map;
  }, [enrollments]);

  const locked = !!enrollments?.length && enrollments.every((e) => e.grade_status === 'submitted' || e.grade_status === 'approved');
  const rejected = !!statusSummary.rejected;

  const parsed = (enrollmentId: string) =>
    Object.fromEntries(
      Object.entries(draft[enrollmentId] ?? {})
        .filter(([, v]) => v !== '' && !Number.isNaN(Number(v)))
        .map(([k, v]) => [k, Number(v)]),
    );

  const dirty = enrollments?.some((e) => JSON.stringify(parsed(e.id)) !== JSON.stringify(e.scores)) ?? false;

  const setScore = (eid: string, itemId: string, value: string, max: number) => {
    if (value !== '' && (Number(value) < 0 || Number(value) > max)) return;
    setDraft((d) => ({ ...d, [eid]: { ...d[eid], [itemId]: value } }));
  };

  const onSave = async () => {
    try {
      await saveGrades.mutateAsync(enrollments!.map((e) => ({ enrollment_id: e.id, scores: parsed(e.id) })));
      toast.success('Дүн хадгалагдлаа');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const onSubmit = async () => {
    try {
      if (dirty) await saveGrades.mutateAsync(enrollments!.map((e) => ({ enrollment_id: e.id, scores: parsed(e.id) })));
      const res = await submitGrades.mutateAsync();
      toast.success(`${res.submitted} оюутны дүнг сургалтын албанд илгээлээ`);
      setConfirm(false);
    } catch (err) {
      toast.error(errorMessage(err));
      setConfirm(false);
    }
  };

  const completeCount = enrollments?.filter((e) => items && computeTotal(parsed(e.id), items).complete).length ?? 0;

  return (
    <>
      <CourseHeader courseId={courseId} />

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading || itemsLoading ? (
        <PageLoader />
      ) : (
        <>
          {locked && (
            <p className="mb-4 rounded-field border border-accent/20 bg-accent-soft px-4 py-2.5 text-[13px] text-accent-ink">
              {statusSummary.approved ? 'Дүн баталгаажсан тул засах боломжгүй.' : 'Дүнг сургалтын албанд илгээсэн. Хянаж дуусах хүртэл засах боломжгүй.'}
            </p>
          )}
          {rejected && (
            <p className="mb-4 rounded-field border border-danger/20 bg-danger-soft px-4 py-2.5 text-[13px] text-danger">
              Сургалтын алба дүнг буцаасан байна. Мэдэгдлээс шалтгааныг харж, засаад дахин илгээнэ үү.
            </p>
          )}

          <Panel
            flush
            title={`${completeCount} / ${enrollments?.length ?? 0} оюутны дүн бүрэн`}
            description={items?.map((i) => `${i.name} ${i.max_score}`).join(', ')}
            actions={
              !locked && (
                <>
                  <Button onClick={onSave} loading={saveGrades.isPending} disabled={!dirty}>Хадгалах</Button>
                  <Button variant="primary" icon={<Send className="h-3.5 w-3.5" />} onClick={() => setConfirm(true)}>Илгээх</Button>
                </>
              )
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line text-[12.5px] text-muted">
                    <th className="sticky left-0 z-10 bg-white px-5 py-2.5 text-left font-medium">Оюутан</th>
                    {items?.map((it) => (
                      <th key={it.id} className="px-2 py-2.5 text-center font-medium">
                        <span className="block">{it.name}</span>
                        <span className="num text-xs font-normal text-faint">{it.max_score}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right font-medium">Нийт</th>
                    <th className="px-3 py-2.5 text-center font-medium">Үнэлгээ</th>
                    <th className="px-5 py-2.5 text-right font-medium">Төлөв</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments?.map((e) => {
                    const scores = parsed(e.id);
                    const { total, complete } = computeTotal(scores, items ?? []);
                    const grade = complete ? scoreToGrade(total) : null;
                    const rowLocked = e.grade_status === 'submitted' || e.grade_status === 'approved';
                    return (
                      <tr key={e.id} className="border-b border-line last:border-0 hover:bg-paper/40">
                        <td className="sticky left-0 z-10 bg-white px-5 py-2">
                          <p className="whitespace-nowrap font-medium text-ink">{e.student_name}</p>
                          <p className="text-xs text-faint">{e.student_code}</p>
                        </td>
                        {items?.map((it) => (
                          <td key={it.id} className="px-2 py-2 text-center">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              min={0}
                              max={it.max_score}
                              disabled={rowLocked}
                              value={draft[e.id]?.[it.id] ?? ''}
                              onChange={(ev) => setScore(e.id, it.id, ev.target.value, it.max_score)}
                              aria-label={`${e.student_name}, ${it.name}`}
                              className="num h-8 w-16 rounded-md border border-transparent bg-paper text-center text-sm text-ink transition-colors [appearance:textfield] hover:border-line focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:bg-transparent disabled:text-ink-soft [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        ))}
                        <td className={cn('num px-3 py-2 text-right font-semibold', complete ? 'text-ink' : 'text-faint')}>{total || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {grade ? <span className={cn('text-[13px] font-semibold', grade.letter.startsWith('F') ? 'text-danger' : 'text-accent-ink')}>{grade.letter}</span> : <span className="text-faint">—</span>}
                        </td>
                        <td className="px-5 py-2 text-right"><GradeStatusBadge status={e.grade_status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={onSubmit}
        loading={submitGrades.isPending || saveGrades.isPending}
        title="Дүнг илгээх үү?"
        confirmLabel="Илгээх"
        description={`${enrollments?.length ?? 0} оюутны дүнг сургалтын албанд хянуулахаар илгээнэ. Илгээсний дараа баталгаажих эсвэл буцаагдах хүртэл засах боломжгүй.`}
      />
    </>
  );
}
