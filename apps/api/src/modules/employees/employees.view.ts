import { supabase } from '../../config/supabase';
import { run } from '../../utils/api-response';
import { ilike } from '../../utils/pagination';

/**
 * Ажилтны "view" мэдээллийг v_employees-ээс биш, үндсэн хүснэгтүүдээс JOIN хийж үүсгэнэ.
 * DB дээрх view-ийн баганы бүтцээс хамаарахгүй.
 */
export const EMPLOYEE_SELECT = '*, users(last_name, first_name, full_name, email, phone, role), departments(name)';

export const mapEmployee = ({ users, departments, ...e }: any) => ({
  ...e,
  last_name: users?.last_name ?? '',
  first_name: users?.first_name ?? '',
  full_name: users?.full_name ?? `${users?.last_name ?? ''} ${users?.first_name ?? ''}`.trim(),
  email: users?.email ?? null,
  phone: users?.phone ?? null,
  role: users?.role ?? null,
  department_name: departments?.name ?? null,
});

export async function getEmployeeView(id: string) {
  return mapEmployee(await run(supabase.from('employees').select(EMPLOYEE_SELECT).eq('id', id).single()));
}

export async function findEmployeeViewByUser(userId: string) {
  const row = await run(supabase.from('employees').select(EMPLOYEE_SELECT).eq('user_id', userId).maybeSingle());
  return row ? mapEmployee(row) : null;
}

export async function employeeSearchFilter(q: string) {
  const like = ilike(q);
  const users = await run(supabase.from('users').select('id').neq('role', 'student').or(`full_name.ilike.${like},email.ilike.${like}`).limit(300));
  const parts = [`employee_code.ilike.${like}`];
  if (users.length) parts.push(`user_id.in.(${users.map((u: { id: string }) => u.id).join(',')})`);
  return parts.join(',');
}
