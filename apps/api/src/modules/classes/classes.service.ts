import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { required, run } from '../../utils/api-response';
import type { createClassSchema, listClassesQuery, updateClassSchema } from './classes.schema';

export async function list(q: z.infer<typeof listClassesQuery>) {
  let query = supabase.from('classes').select('*, programs(name), employees(users(full_name)), students(count)').order('code');
  if (q.program_id) query = query.eq('program_id', q.program_id);
  const rows = await run(query);
  return rows.map(({ programs, employees, students, ...r }: any) => ({
    ...r,
    program_name: programs?.name ?? null,
    advisor_name: employees?.users?.full_name ?? null,
    student_count: students?.[0]?.count ?? 0,
  }));
}

export const create = (input: z.infer<typeof createClassSchema>) =>
  run(supabase.from('classes').insert({ ...input, name: input.name || `${input.code} анги` }).select().single());

export async function update(id: string, input: z.infer<typeof updateClassSchema>) {
  return required(await run(supabase.from('classes').update(input).eq('id', id).select()))[0];
}
