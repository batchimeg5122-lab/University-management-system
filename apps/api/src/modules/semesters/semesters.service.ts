import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { required, run } from '../../utils/api-response';
import type { createSemesterSchema } from './semesters.schema';

export const list = () => run(supabase.from('semesters').select('*').order('start_date', { ascending: false }));
export const current = () => run(supabase.from('semesters').select('*').eq('is_current', true).maybeSingle());

export async function currentId(): Promise<string | null> {
  const row = await current();
  return row?.id ?? null;
}

export const create = (input: z.infer<typeof createSemesterSchema>) =>
  run(supabase.from('semesters').insert({ ...input, is_current: false }).select().single());

export async function setCurrent(id: string) {
  required(await run(supabase.from('semesters').select('id').eq('id', id)), 'Улирал олдсонгүй.');
  await run(supabase.from('semesters').update({ is_current: false }).neq('id', id).eq('is_current', true).select('id'));
  return (await run(supabase.from('semesters').update({ is_current: true }).eq('id', id).select()))[0];
}
