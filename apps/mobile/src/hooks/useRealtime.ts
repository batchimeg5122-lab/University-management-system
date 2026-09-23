import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { isConfigured } from '../constants/env';
import { supabase } from '../services/supabase';
import { qk } from './queries';

/**
 * Supabase Realtime (§42): notifications хүснэгтэд шинэ мөр нэмэгдэхэд
 * мэдэгдэл болон холбогдох мэдээллийг (дүн, хуваарь, төлбөр) шинэчилнэ.
 * RLS-ийн ачаар хэрэглэгч зөвхөн өөрт хамаатай мөрийг хүлээн авна.
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId || !isConfigured) return;
    const channel = supabase
      .channel(`mobile-notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        qc.invalidateQueries({ queryKey: qk.notifications });
        const type = (payload.new as { type?: string } | null)?.type;
        if (type === 'grade') {
          qc.invalidateQueries({ queryKey: qk.grades });
          qc.invalidateQueries({ queryKey: qk.summary });
          qc.invalidateQueries({ queryKey: qk.teacherDashboard });
        }
        if (type === 'schedule') {
          qc.invalidateQueries({ queryKey: ['schedules'] });
          qc.invalidateQueries({ queryKey: ['exams'] });
          qc.invalidateQueries({ queryKey: qk.courses });
          qc.invalidateQueries({ queryKey: qk.teacherDashboard });
        }
        if (type === 'finance') {
          qc.invalidateQueries({ queryKey: qk.invoices });
          qc.invalidateQueries({ queryKey: qk.payments });
          qc.invalidateQueries({ queryKey: qk.summary });
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
