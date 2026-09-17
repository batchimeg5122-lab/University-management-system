import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

/**
 * Supabase Realtime: notifications table-д шинэ мөр нэмэгдэхэд жагсаалтыг шинэчилнэ.
 * Туршилтын горимд 60 секунд тутамд л шинэчилнэ.
 */
export function useRealtimeNotifications() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    if (env.useMock || !supabase) {
      const t = setInterval(() => qc.invalidateQueries({ queryKey: ['notifications'] }), 60_000);
      return () => clearInterval(t);
    }
    const client = supabase;
    const channel = client
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        qc.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, qc]);
}
