import { useMemo, useState } from 'react';
import { ErrorState, PageHeader, PageLoader, Panel, SearchInput, Select } from '@/components/ui';
import { MaterialList } from '@/features/materials/components/MaterialList';
import { useMyMaterials } from '@/features/materials/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatBytes, shortName } from '@/lib/utils';

export default function MyMaterialsPage() {
  useDocumentTitle('Хичээлийн материал');
  const { data, isLoading, error, refetch } = useMyMaterials();
  const [courseId, setCourseId] = useState('');
  const [q, setQ] = useState('');

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    data?.forEach((m) => map.set(m.course_id, m.subject_name ?? ''));
    return [...map.entries()].map(([id, name]) => ({ value: id, label: name }));
  }, [data]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = (data ?? []).filter(
      (m) =>
        (!courseId || m.course_id === courseId) &&
        (!needle || [m.title, m.description, m.file_name, m.subject_name].some((v) => (v ?? '').toLowerCase().includes(needle))),
    );
    const map = new Map<string, typeof rows>();
    rows.forEach((m) => map.set(m.course_id, [...(map.get(m.course_id) ?? []), m]));
    return [...map.entries()];
  }, [data, courseId, q]);

  return (
    <>
      <PageHeader
        title="Хичээлийн материал"
        description="Багш нарын нэмсэн лекц, гарын авлага, заавар. Хичээл тус бүрээр бүлэглэв."
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Гарчиг, файлын нэр" />
            <Select className="w-56" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="Бүх хичээл" options={courses} />
          </>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !groups.length ? (
        <Panel flush>
          <MaterialList materials={[]} />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([id, rows]) => (
            <Panel
              key={id}
              flush
              title={rows[0].subject_name}
              description={`${rows[0].subject_code}${rows[0].uploaded_by_name ? `, ${shortName(rows[0].uploaded_by_name)} багш` : ''}`}
              actions={<span className="num text-[13px] text-muted">{rows.length} файл, {formatBytes(rows.reduce((s, m) => s + m.size_bytes, 0))}</span>}
            >
              <MaterialList materials={rows} />
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
