import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { materialsApi, uploadMaterial, type MaterialInput } from './api';

export const useCourseMaterials = (courseId: string | undefined) =>
  useQuery({ queryKey: ['materials', 'course', courseId], queryFn: () => materialsApi.byCourse(courseId!), enabled: !!courseId });

export const useMyMaterials = () => useQuery({ queryKey: ['materials', 'me'], queryFn: materialsApi.mine });

/** Материал бүрийг хэдэн оюутан татсан (багш, алба) */
export const useMaterialStats = (courseId: string | undefined) =>
  useQuery({ queryKey: ['materials', 'stats', courseId], queryFn: () => materialsApi.courseStats(courseId!), enabled: !!courseId });

/** Тухайн материалд хэн хандсан, хэн хандаагүй */
export const useMaterialAccess = (materialId: string | null) =>
  useQuery({ queryKey: ['materials', 'access', materialId], queryFn: () => materialsApi.access(materialId!), enabled: !!materialId });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['materials'] });
}

export function useUploadMaterial(courseId: string) {
  const done = useInvalidate();
  return useMutation({ mutationFn: ({ file, ...meta }: MaterialInput & { file: File }) => uploadMaterial(courseId, file, meta), onSuccess: done });
}

export function useUpdateMaterial() {
  const done = useInvalidate();
  return useMutation({ mutationFn: ({ id, ...body }: Partial<MaterialInput> & { id: string }) => materialsApi.update(id, body), onSuccess: done });
}

export function useDeleteMaterial() {
  const done = useInvalidate();
  return useMutation({ mutationFn: (id: string) => materialsApi.remove(id), onSuccess: done });
}

/** Материалыг үзэх үед хандалтын тоо шинэчлэгдэх тул жагсаалтыг дахин уншина */
export function useViewMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => materialsApi.viewUrl(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  });
}
