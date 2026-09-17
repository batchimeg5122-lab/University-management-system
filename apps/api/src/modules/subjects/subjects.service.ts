import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { required, run } from '../../utils/api-response';
import { ilike } from '../../utils/pagination';
import type { createSubjectSchema, listSubjectsQuery, updateSubjectSchema } from './subjects.schema';

export async function list(q: z.infer<typeof listSubjectsQuery>) {
  let query = supabase.from('subjects').select('*, departments(name)').order('code');
  if (q.department_id) query = query.eq('department_id', q.department_id);
  if (q.q) query = query.or(`name.ilike.${ilike(q.q)},code.ilike.${ilike(q.q)}`);
  const rows = await run(query);
  return rows.map(({ departments, ...r }: any) => ({ ...r, department_name: departments?.name ?? null }));
}

export const create = (input: z.infer<typeof createSubjectSchema>) => run(supabase.from('subjects').insert(input).select().single());

export async function update(id: string, input: z.infer<typeof updateSubjectSchema>) {
  return required(await run(supabase.from('subjects').update(input).eq('id', id).select()))[0];
}
