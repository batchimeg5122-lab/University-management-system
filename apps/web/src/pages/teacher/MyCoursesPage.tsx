import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, PageLoader } from '@/components/ui';
import { CourseStatusBadge } from '@/components/ui/StatusBadge';
import { useMyCourses } from '@/features/courses/hooks';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function TeacherCoursesPage() {
  useDocumentTitle('Миний хичээлүүд');
  const { data: semester } = useCurrentSemester();
  const { data, isLoading, error, refetch } = useMyCourses(semester?.id);

  return (
    <>
      <PageHeader title="Миний хичээлүүд" description="Танд оноогдсон хичээлүүд. Зөвхөн эдгээр хичээлийн оюутны ирц, дүнг удирдах боломжтой." />
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon={BookOpen} title="Энэ улиралд хичээл оноогдоогүй байна" description="Сургалтын алба хичээл оноосны дараа энд харагдана." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((c) => (
            <article key={c.id} className="flex flex-col rounded-box border border-line bg-white">
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-faint">{c.subject_code}, {c.credit} кредит</p>
                  <CourseStatusBadge status={c.status} />
                </div>
                <h2 className="mt-1.5 text-[17px] font-semibold leading-snug text-ink">{c.subject_name}</h2>
                <p className="mt-3 flex items-baseline gap-2 text-sm text-muted">
                  <span className="text-2xl font-semibold tracking-tight text-ink">{c.class_name}</span>
                  <span className="num">{c.student_count} оюутан</span>
                </p>
              </div>
              <div className="grid grid-cols-2 border-t border-line text-[13px] font-medium sm:grid-cols-4">
                <Link to={`/teacher/courses/${c.id}/attendance`} className="border-r border-line py-3 text-center text-ink-soft hover:bg-paper hover:text-ink">Ирц</Link>
                <Link to={`/teacher/courses/${c.id}/grades`} className="py-3 text-center text-ink-soft hover:bg-paper hover:text-ink sm:border-r sm:border-line">Дүн</Link>
                <Link to={`/teacher/courses/${c.id}/materials`} className="border-r border-t border-line py-3 text-center text-ink-soft hover:bg-paper hover:text-ink sm:border-t-0">Материал</Link>
                <Link to={`/teacher/courses/${c.id}/stats`} className="border-t border-line py-3 text-center text-ink-soft hover:bg-paper hover:text-ink sm:border-t-0">Статистик</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
