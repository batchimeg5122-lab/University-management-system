import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import type { ruleSchema } from './discount-rules.schema';

export interface DiscountRule {
  id: string;
  name: string;
  kind: 'gpa' | 'program' | 'year_level' | 'students';
  percent: number | null;
  amount: number | null;
  params: { min_gpa?: number; program_ids?: string[]; year_levels?: number[]; student_codes?: string[] };
  stackable: boolean;
  is_active: boolean;
  note: string | null;
}

/** Хөнгөлөлт тооцоход хэрэгтэй оюутны мэдээлэл */
export interface DiscountSubject {
  student_code: string;
  program_id: string | null;
  year_level: number | null;
  gpa: number | null;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const mapRule = (r: any): DiscountRule => ({ ...r, percent: num(r.percent), amount: num(r.amount), params: r.params ?? {} });

export async function list() {
  const { data, error } = await supabase.from('discount_rules').select('*').order('created_at');
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return [];
    throw error;
  }
  return (data ?? []).map(mapRule);
}

export const activeRules = async () => (await list()).filter((r) => r.is_active);

export async function create(input: z.infer<typeof ruleSchema>, actor: AuthUser) {
  return mapRule(await run(supabase.from('discount_rules').insert({ ...input, percent: input.percent ?? null, amount: input.amount ?? null, created_by: actor.id }).select().single()));
}

export async function update(id: string, input: Partial<z.infer<typeof ruleSchema>>) {
  required(await run(supabase.from('discount_rules').select('id').eq('id', id)), 'Дүрэм олдсонгүй.');
  const patch: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
  if ('percent' in input || 'amount' in input) {
    patch.percent = input.percent ?? null;
    patch.amount = input.amount ?? null;
  }
  return mapRule(await run(supabase.from('discount_rules').update(patch).eq('id', id).select().single()));
}

export async function remove(id: string) {
  await run(supabase.from('discount_rules').delete().eq('id', id).select('id'));
  return { deleted: true };
}

function matches(rule: DiscountRule, s: DiscountSubject) {
  const p = rule.params;
  switch (rule.kind) {
    case 'gpa':
      return s.gpa !== null && p.min_gpa !== undefined && s.gpa >= p.min_gpa;
    case 'program':
      return !!s.program_id && !!p.program_ids?.includes(s.program_id);
    case 'year_level':
      return s.year_level !== null && !!p.year_levels?.includes(s.year_level);
    case 'students':
      return !!p.student_codes?.includes(s.student_code.toUpperCase());
  }
}

/**
 * Дүрмүүдийг хэрэглэнэ:
 * - Хуримтлагдахгүй (stackable=false) дүрмээс ХАМГИЙН ИХ нэгийг
 * - Хуримтлагдах дүрмүүдийг бүгдийг нэмнэ
 * - Нийт хөнгөлөлт төлбөрөөс хэтрэхгүй
 */
export function applyRules(rules: DiscountRule[], s: DiscountSubject, tuition: number) {
  const hits = rules.filter((r) => matches(r, s)).map((r) => ({ rule: r, value: Math.round(r.percent ? (tuition * r.percent) / 100 : (r.amount ?? 0)) }));
  const exclusive = hits.filter((h) => !h.rule.stackable).sort((a, b) => b.value - a.value)[0];
  const stack = hits.filter((h) => h.rule.stackable);
  const applied = [...(exclusive ? [exclusive] : []), ...stack];
  const total = Math.min(tuition, applied.reduce((sum, h) => sum + h.value, 0));
  return {
    amount: total,
    note: applied.length ? applied.map((h) => `${h.rule.name}${h.rule.percent ? ` ${h.rule.percent}%` : ''}`).join(', ') : null,
  };
}
