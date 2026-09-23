import { z } from 'zod';

export const RULE_KINDS = ['gpa', 'program', 'year_level', 'students'] as const;

const base = z.object({
  name: z.string().trim().min(2, 'Нэр оруулна уу').max(120),
  kind: z.enum(RULE_KINDS),
  percent: z.coerce.number().positive().max(100).optional().nullable(),
  amount: z.coerce.number().positive().optional().nullable(),
  params: z
    .object({
      min_gpa: z.coerce.number().min(0).max(4).optional(),
      program_ids: z.array(z.string().uuid()).optional(),
      year_levels: z.array(z.coerce.number().int().min(1).max(8)).optional(),
      student_codes: z.array(z.string().trim().toUpperCase()).max(2000).optional(),
    })
    .default({}),
  stackable: z.boolean().default(false),
  is_active: z.boolean().default(true),
  note: z.string().trim().max(500).optional().nullable(),
});

const valid = (r: z.infer<typeof base>) => {
  if ((r.percent ?? null) === null && (r.amount ?? null) === null) return 'Хувь эсвэл дүнгийн аль нэгийг оруулна уу';
  if (r.percent && r.amount) return 'Хувь, дүнгийн зөвхөн нэгийг оруулна';
  if (r.kind === 'gpa' && r.params.min_gpa === undefined) return 'Доод GPA оруулна уу';
  if (r.kind === 'program' && !r.params.program_ids?.length) return 'Хөтөлбөр сонгоно уу';
  if (r.kind === 'year_level' && !r.params.year_levels?.length) return 'Курс сонгоно уу';
  if (r.kind === 'students' && !r.params.student_codes?.length) return 'Оюутны код оруулна уу';
  return null;
};

export const ruleSchema = base.superRefine((r, ctx) => {
  const msg = valid(r);
  if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
});

export const toggleRuleSchema = z.object({ is_active: z.boolean() });
