import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { conflict } from '../../middleware/error.middleware';
import { required, run } from '../../utils/api-response';
import type { UserRole } from '../../utils/constants';
import { createAuthUser } from '../users/users.service';
import type { createEmployeeSchema, listEmployeesQuery, updateEmployeeSchema } from './employees.schema';
import { EMPLOYEE_SELECT, employeeSearchFilter, getEmployeeView, mapEmployee } from './employees.view';

const ROLE_BY_TYPE: Record<string, UserRole> = { teacher: 'teacher', academic: 'academic', finance: 'finance', management: 'management', admin: 'super_admin' };

export async function list(q: z.infer<typeof listEmployeesQuery>) {
  let query = supabase.from('employees').select(EMPLOYEE_SELECT).order('employee_code');
  if (q.type) query = query.eq('employee_type', q.type);
  if (q.department_id) query = query.eq('department_id', q.department_id);
  if (q.q) query = query.or(await employeeSearchFilter(q.q));
  return (await run(query)).map(mapEmployee).sort((a: { full_name: string }, b: { full_name: string }) => a.full_name.localeCompare(b.full_name));
}

export async function create(input: z.infer<typeof createEmployeeSchema>) {
  const exists = await run(supabase.from('employees').select('id').eq('employee_code', input.employee_code));
  if (exists.length) throw conflict('Ажилтны код давхцаж байна.');

  const user = await createAuthUser({ ...input, role: ROLE_BY_TYPE[input.employee_type] });
  const { data, error } = await supabase
    .from('employees')
    .insert({
      user_id: user.id,
      employee_code: input.employee_code,
      employee_type: input.employee_type,
      department_id: input.department_id,
      position: input.position,
      specialization: input.specialization,
      academic_degree: input.academic_degree,
      hired_at: input.hired_at,
      is_active: true,
    })
    .select('id')
    .single();
  if (error) {
    await supabase.from('users').delete().eq('id', user.id);
    await supabase.auth.admin.deleteUser(user.id);
    throw conflict(`Ажилтан бүртгэж чадсангүй: ${error.message}`);
  }
  const view = await getEmployeeView(data.id);
  return { ...view, initial_password: user.initial_password };
}

export async function update(id: string, input: z.infer<typeof updateEmployeeSchema>) {
  required(await run(supabase.from('employees').update(input).eq('id', id).select('id')), 'Ажилтан олдсонгүй.');
  return getEmployeeView(id);
}
