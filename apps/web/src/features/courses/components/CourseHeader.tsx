import { LinkTabs, PageHeader, Skeleton } from '@/components/ui';
import { useCourse } from '../hooks';

export function CourseHeader({ courseId }: { courseId: string }) {
  const { data: course, isLoading } = useCourse(courseId);
  return (
    <div className="mb-6">
      <PageHeader
        back={{ to: '/teacher/courses', label: 'Миний хичээлүүд' }}
        title={isLoading ? <Skeleton className="h-7 w-64" /> : course?.subject_name}
        description={course && `${course.subject_code}, ${course.class_name} анги, ${course.student_count} оюутан, ${course.credit} кредит`}
      />
      <LinkTabs
        tabs={[
          { to: `/teacher/courses/${courseId}/attendance`, label: 'Ирц' },
          { to: `/teacher/courses/${courseId}/grades`, label: 'Дүн' },
          { to: `/teacher/courses/${courseId}/stats`, label: 'Статистик' },
        ]}
      />
    </div>
  );
}
