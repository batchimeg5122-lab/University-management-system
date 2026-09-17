import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { required, run } from '../../utils/api-response';
import type { createProgramSchema, listProgramsQuery, updateProgramSchema } from './programs.schema';

export async function list(q: z.infer<typeof listProgramsQuery>) {
  let query = supabase.from('programs').select('*, departments(name)').order('name');
  if (q.department_id) query = query.eq('department_id', q.department_id);
  const rows = await run(query);
  return rows.map(({ departments, ...r }: any) => ({ ...r, department_name: departments?.name ?? null }));
}

export const create = (input: z.infer<typeof createProgramSchema>) => run(supabase.from('programs').insert(input).select().single());

export async function update(id: string, input: z.infer<typeof updateProgramSchema>) {
  return required(await run(supabase.from('programs').update(input).eq('id', id).select()))[0];
}
