import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { unprocessable } from '../../middleware/error.middleware';
import { required, run } from '../../utils/api-response';
import type { createDepartmentSchema, listDepartmentsQuery, updateDepartmentSchema } from './departments.schema';

const PARENT_LEVEL = { campus: null, school: 'campus', department: 'school' } as const;

export async function list(q: z.infer<typeof listDepartmentsQuery>) {
  let query = supabase.from('departments').select('*').order('name');
  if (q.level) query = query.eq('level', q.level);
  if (q.parent_id) query = query.eq('parent_id', q.parent_id);
  return run(query);
}

export async function create(input: z.infer<typeof createDepartmentSchema>) {
  if (input.parent_id) {
    const parent = await run(supabase.from('departments').select('level').eq('id', input.parent_id).single());
    if (parent.level !== PARENT_LEVEL[input.level]) throw unprocessable('Харьяалах нэгжийн түвшин тохирохгүй байна (цогцолбор → сургууль → тэнхим).');
  }
  return run(supabase.from('departments').insert(input).select().single());
}

export async function update(id: string, input: z.infer<typeof updateDepartmentSchema>) {
  return required(await run(supabase.from('departments').update(input).eq('id', id).select()))[0];
}
