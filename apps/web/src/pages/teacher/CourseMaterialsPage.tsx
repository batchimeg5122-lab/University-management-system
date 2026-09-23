import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button, ErrorState, PageLoader, Panel } from '@/components/ui';
import { CourseHeader } from '@/features/courses/components/CourseHeader';
import { useCourse } from '@/features/courses/hooks';
import { MaterialAccessModal } from '@/features/materials/components/MaterialAccessModal';
import { MaterialList } from '@/features/materials/components/MaterialList';
import { MaterialUploadModal } from '@/features/materials/components/MaterialUploadModal';
import { useCourseMaterials, useMaterialStats } from '@/features/materials/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatBytes } from '@/lib/utils';

export default function CourseMaterialsPage() {
  const { courseId = '' } = useParams();
  useDocumentTitle('Материал');
  const { data, isLoading, error, refetch } = useCourseMaterials(courseId);
  const { data: course } = useCourse(courseId);
  const { data: stats } = useMaterialStats(courseId);
  const [uploading, setUploading] = useState(false);
  const [accessId, setAccessId] = useState<string | null>(null);

  const published = data?.filter((m) => m.is_published).length ?? 0;
  const totalSize = data?.reduce((s, m) => s + m.size_bytes, 0) ?? 0;

  return (
    <>
      <CourseHeader courseId={courseId} />

      <Panel
        flush
        title={data?.length ? `${data.length} материал, ${published} нь харагдана` : 'Хичээлийн материал'}
        description={data?.length ? `Нийт хэмжээ ${formatBytes(totalSize)}. Тоон дээр дарж хэн үзсэнийг харна.` : 'Лекц, гарын авлага, бие даалтын заавар зэргийг нэмнэ.'}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setUploading(true)}>
            Материал нэмэх
          </Button>
        }
      >
        {isLoading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : <MaterialList materials={data ?? []} canManage stats={stats} onShowAccess={setAccessId} />}
      </Panel>

      <MaterialAccessModal materialId={accessId} onClose={() => setAccessId(null)} />

      <MaterialUploadModal
        open={uploading}
        onClose={() => setUploading(false)}
        courseId={courseId}
        courseName={course ? `${course.subject_name}, ${course.class_name}` : undefined}
      />
    </>
  );
}
