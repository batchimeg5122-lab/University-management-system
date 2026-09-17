import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gradesApi } from './api';

export const useGradeItems = (courseId: string | undefined) =>
  useQuery({ queryKey: ['grade-items', courseId], queryFn: () => gradesApi.items(courseId!), enabled: !!courseId });

export const useCourseEnrollments = (courseId: string | undefined) =>
  useQuery({ queryKey: ['enrollments', courseId], queryFn: () => gradesApi.enrollments(courseId!), enabled: !!courseId });

export const usePendingGrades = () => useQuery({ queryKey: ['grades', 'pending'], queryFn: gradesApi.pending });
export const useMyGrades = () => useQuery({ queryKey: ['grades', 'me'], queryFn: gradesApi.mine });

export function useSaveGrades(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: { enrollment_id: string; scores: Record<string, number> }[]) => gradesApi.save(courseId, rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments', courseId] }),
  });
}
export function useSubmitGrades(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gradesApi.submit(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', courseId] });
      qc.invalidateQueries({ queryKey: ['grades'] });
    },
  });
}
export function useReviewGrades() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ['grades'] });
    qc.invalidateQueries({ queryKey: ['enrollments'] });
    qc.invalidateQueries({ queryKey: ['students'] });
  };
  return {
    approve: useMutation({ mutationFn: (courseId: string) => gradesApi.approve(courseId), onSuccess: done }),
    reject: useMutation({ mutationFn: ({ courseId, reason }: { courseId: string; reason: string }) => gradesApi.reject(courseId, reason), onSuccess: done }),
  };
}
