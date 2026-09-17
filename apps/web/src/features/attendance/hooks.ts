import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, type AttendanceRowInput } from './api';

export const useCourseAttendance = (courseId: string | undefined, date?: string) =>
  useQuery({ queryKey: ['attendance', courseId, date ?? 'all'], queryFn: () => attendanceApi.byCourse(courseId!, date), enabled: !!courseId });

export const useAttendanceDates = (courseId: string | undefined) =>
  useQuery({ queryKey: ['attendance', courseId, 'dates'], queryFn: () => attendanceApi.dates(courseId!), enabled: !!courseId });

export const useMyAttendance = () => useQuery({ queryKey: ['attendance', 'me'], queryFn: attendanceApi.mine });

export function useSaveAttendance(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, rows }: { date: string; rows: AttendanceRowInput[] }) => attendanceApi.save(courseId, date, rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', courseId] });
      qc.invalidateQueries({ queryKey: ['reports', 'course', courseId] });
    },
  });
}
