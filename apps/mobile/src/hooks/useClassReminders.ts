import { useEffect, useRef } from 'react';
import { cancelClassReminders, cancelExamReminders, syncClassReminders, syncExamReminders } from '../services/reminders';
import { EXAM_TYPE_LABEL } from '../utils/constants';
import { useAuthStore } from '../store/auth.store';
import { useSettingsStore } from '../store/settings.store';
import { useExams, useSchedules } from './queries';

/**
 * Хуваарь, тохиргоо өөрчлөгдөх бүрт хичээлийн сануулгыг дахин товлоно.
 * Offline үед cache-тай хуваариар ажиллана.
 */
export function useClassReminders() {
  const enabled = useSettingsStore((s) => s.reminderEnabled);
  const minutes = useSettingsStore((s) => s.reminderMinutes);
  const role = useAuthStore((s) => s.profile?.user.role);
  const schedules = useSchedules();
  const exams = useExams(true);
  const lastKey = useRef<string>('');
  const lastExamKey = useRef<string>('');

  useEffect(() => {
    if (!enabled) {
      if (lastKey.current !== 'off') {
        lastKey.current = 'off';
        void cancelClassReminders();
      }
      return;
    }
    if (!schedules.data) return;
    // Зөвхөн утга өөрчлөгдсөн үед дахин товлоно
    const key = JSON.stringify([minutes, schedules.data.map((s) => [s.id, s.day_of_week, s.start_time, s.room, s.is_online])]);
    if (key === lastKey.current) return;
    lastKey.current = key;
    void syncClassReminders(schedules.data, minutes, role === 'teacher');
  }, [enabled, minutes, schedules.data, role]);

  // Шалгалтын сануулга (өмнөх орой 20:00 + 1 цагийн өмнө)
  useEffect(() => {
    if (!enabled) {
      if (lastExamKey.current !== 'off') {
        lastExamKey.current = 'off';
        void cancelExamReminders();
      }
      return;
    }
    if (!exams.data) return;
    const key = JSON.stringify(exams.data.map((e) => [e.id, e.exam_date, e.start_time, e.room]));
    if (key === lastExamKey.current) return;
    lastExamKey.current = key;
    void syncExamReminders(exams.data, EXAM_TYPE_LABEL);
  }, [enabled, exams.data]);
}
