import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { HttpError } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { GRADE_SCALE } from '../../utils/gpa';
import { SETTING_SCHEMAS, type SettingKey } from './settings.schema';

type Values = { [K in SettingKey]: z.infer<(typeof SETTING_SCHEMAS)[K]> };

export const DEFAULTS: Values = {
  grading: { scale: GRADE_SCALE },
  security: { require_staff_mfa: false, single_session: false, single_session_roles: [] },
  finance: { auto_remind: process.env.FINANCE_AUTO_REMIND !== 'false', remind_days_before: 3, overdue_repeat_days: 7 },
  general: { university_name: 'Их Засаг Их Сургууль', academic_office_phone: null, support_email: null },
};

const TTL = 60_000;
let cache: { at: number; values: Values } | null = null;

/** Бүх тохиргоо (DB + анхдагч), 60 сек cache */
export async function all(): Promise<Values> {
  if (cache && Date.now() - cache.at < TTL) return cache.values;
  const values: Values = structuredClone(DEFAULTS);
  const { data, error } = await supabase.from('system_settings').select('key, value');
  if (!error) {
    for (const row of data ?? []) {
      const key = row.key as SettingKey;
      const parsed = SETTING_SCHEMAS[key]?.safeParse(row.value);
      if (parsed?.success) (values as Record<string, unknown>)[key] = parsed.data;
    }
  }
  cache = { at: Date.now(), values };
  return values;
}

export async function get<K extends SettingKey>(key: K): Promise<Values[K]> {
  return (await all())[key];
}

export async function set(key: string, value: unknown, actor: AuthUser) {
  const schema = SETTING_SCHEMAS[key as SettingKey];
  if (!schema) throw new HttpError(404, 'Ийм тохиргоо алга.');
  const parsed = schema.parse(value);
  if (key === 'grading') {
    // Доод оноогоор буурах дарааллаар хадгална
    (parsed as Values['grading']).scale.sort((a, b) => b.min - a.min);
  }
  const { error } = await supabase.from('system_settings').upsert({ key, value: parsed, updated_by: actor.id, updated_at: new Date().toISOString() });
  if (error) throw new HttpError(500, error.message);
  cache = null;
  return parsed;
}

/** Бүх хэрэглэгчид хэрэгтэй хэсэг (үнэлгээний шкал, байгууллагын мэдээлэл) */
export async function publicSettings() {
  const v = await all();
  return { grading: v.grading, general: v.general, security: { require_staff_mfa: v.security.require_staff_mfa, single_session: v.security.single_session } };
}

/** Одоогийн үнэлгээний шкал (grades.service ашиглана) */
export const gradeScale = async () => (await get('grading')).scale;
