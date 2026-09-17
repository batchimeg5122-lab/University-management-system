import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * service_role client — RLS-ийг тойрдог тул эрхийн хяналтыг
 * middleware (requireRole, requireCourseAccess) заавал гүйцэтгэнэ.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
