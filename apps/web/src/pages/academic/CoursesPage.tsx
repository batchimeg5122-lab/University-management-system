import { useEffect, useState, type FormEvent } from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import { Button, DataTable, ExportButton, Input, Modal, PageHeader, Panel, Select } from '@/components/ui';
import { CourseStatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useClasses } from '@/features/classes/hooks';
import { useCourses, useSaveCourse } from '@/features/courses/hooks';
import { useTeachers } from '@/features/employees/hooks';
import { useCurrentSemester, useSemesters } from '@/features/semesters/hooks';
import { useSubjects } from '@/features/subjects/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { COURSE_STATUS_LABEL } from '@/lib/constants';
import { exportExcel } from '@/lib/excel';
import { shortName } from '@/lib/utils';
import type { Course } from '@/types/models';

const empty = { subject_id: '', class_id: '', teacher_id: '', semester_id: '', max_students: '40', status: 'planned' };

export default function CoursesPage() {
  useDocumentTitle('Хичээл хуваарилалт');
  const toast = useToast();
  const { can } = useRole();
  const { data: current } = useCurrentSemester();
  const { data: semesters } = useSemesters();
  const [semesterId, setSemesterId] = useState('');
  const [classId, setClassId] = useState('');
  const activeSemester = semesterId || current?.id || '';
  const { data, isLoading, error, refetch } = useCourses({ semester_id: activeSemester, class_id: classId });
  const { data: subjects } = useSubjects();
  const { data: classes } = useClasses();
  const { data: teachers } = useTeachers();
  const save = useSaveCourse();
  const [editing, setEditing] = useState<Course | 'new' | null>(null);
  const { values, bind, reset } = useFormState(empty);

  useEffect(() => {
    if (editing === 'new') reset({ ...empty, semester_id: activeSemester });
    else if (editing) reset({ subject_id: editing.subject_id, class_id: editing.class_id ?? '', teacher_id: editing.teacher_id ?? '', semester_id: editing.semester_id, max_students: String(editing.max_students ?? 40), status: editing.status });
  }, [editing, reset, activeSemester]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing === 'new') {
        await save.mutateAsync({ ...(values as unknown as Partial<Course>), teacher_id: values.teacher_id || null, max_students: Number(values.max_students) });
        toast.success('Хичээл ангид хуваарилагдлаа');
      } else if (editing) {
        await save.mutateAsync({ id: editing.id, teacher_id: values.teacher_id || null, status: values.status as Course['status'], max_students: Number(values.max_students) });
        toast.success('Хичээлийн мэдээлэл шинэчлэгдлээ');
      }
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const isNew = editing === 'new';

  return (
    <>
      <PageHeader
        title="Хичээл хуваарилалт"
        description="Хичээлийн сангаас улирал бүр ангид хичээл оноож, багш хуваарилна. Ангийн оюутнууд автоматаар бүртгэгдэнэ."
        actions={
          <>
            <ExportButton
              disabled={!data?.length}
              onExport={() =>
                exportExcel('hicheel-huvaarilalt', 'Хичээл', [
                  { header: 'Хичээлийн код', value: (r) => r.subject_code, width: 14 },
                  { header: 'Хичээл', value: (r) => r.subject_name, width: 34 },
                  { header: 'Кредит', value: (r) => r.credit },
                  { header: 'Анги', value: (r) => r.class_name, width: 14 },
                  { header: 'Багш', value: (r) => r.teacher_name, width: 26 },
                  { header: 'Оюутан', value: (r) => r.student_count },
                  { header: 'Улирал', value: (r) => r.semester_name, width: 20 },
                  { header: 'Төлөв', value: (r) => COURSE_STATUS_LABEL[r.status] ?? r.status, width: 14 },
                ], data ?? [])
              }
            />
            {can('courses') && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Хичээл хуваарилах</Button>}
          </>
        }
      />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <Select className="sm:w-60" value={activeSemester} onChange={(e) => setSemesterId(e.target.value)} options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} ${s.name}` }))} />
          <Select className="sm:w-40" value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Бүх анги" options={(classes ?? []).map((c) => ({ value: c.id, label: c.code }))} />
          <p className="num text-[13px] text-muted sm:ml-auto">{data?.length ?? 0} хичээл</p>
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          onRowClick={can('courses') ? (r) => setEditing(r) : undefined}
          empty={{ icon: LayoutGrid, title: 'Энэ улиралд хичээл хуваарилаагүй байна', description: 'Хичээлийн сангаас сонгож ангид хуваарилна уу.' }}
          columns={[
            { key: 'sub', header: 'Хичээл', cell: (r) => <div><p className="font-medium">{r.subject_name}</p><p className="text-xs text-faint">{r.subject_code}, {r.credit} кредит</p></div> },
            { key: 'class', header: 'Анги', cell: (r) => r.class_name },
            { key: 'teacher', header: 'Багш', cell: (r) => (r.teacher_name ? shortName(r.teacher_name) : <span className="text-warn">Оноогоогүй</span>) },
            { key: 'count', header: 'Оюутан', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.student_count} / {r.max_students}</span> },
            { key: 'status', header: 'Төлөв', align: 'right', cell: (r) => <CourseStatusBadge status={r.status} /> },
          ]}
        />
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? 'Хичээл хуваарилах' : 'Хичээл засах'}
        description={!isNew && editing ? `${editing.subject_name}, ${editing.class_name}` : undefined}
        footer={<><Button onClick={() => setEditing(null)}>Болих</Button><Button variant="primary" type="submit" form="course-form" loading={save.isPending}>{isNew ? 'Хуваарилах' : 'Хадгалах'}</Button></>}
      >
        <form id="course-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          {isNew && (
            <>
              <Select label="Улирал" required wrapperClassName="sm:col-span-2" options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} ${s.name}` }))} {...bind('semester_id')} />
              <Select label="Хичээл" required placeholder="Сонгох" wrapperClassName="sm:col-span-2" options={(subjects ?? []).map((s) => ({ value: s.id, label: `${s.code} ${s.name}` }))} {...bind('subject_id')} />
              <Select label="Анги" required placeholder="Сонгох" options={(classes ?? []).map((c) => ({ value: c.id, label: `${c.code} (${c.student_count} оюутан)` }))} {...bind('class_id')} />
            </>
          )}
          <Select label="Багш" placeholder="Дараа оноох" wrapperClassName={isNew ? '' : 'sm:col-span-2'} options={(teachers ?? []).map((t) => ({ value: t.id, label: `${t.full_name}${t.department_name ? `, ${t.department_name}` : ''}` }))} {...bind('teacher_id')} />
          <Input label="Дээд хязгаар" type="number" min={1} {...bind('max_students')} />
          {!isNew && <Select label="Төлөв" options={Object.entries(COURSE_STATUS_LABEL).map(([value, label]) => ({ value, label }))} {...bind('status')} />}
        </form>
      </Modal>
    </>
  );
}
