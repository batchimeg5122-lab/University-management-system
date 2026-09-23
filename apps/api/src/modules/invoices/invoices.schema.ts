import { z } from 'zod';

const status = z.enum(['pending', 'partial', 'paid', 'cancelled', 'overdue']);
const optionalText = z.string().trim().optional().nullable().or(z.literal('').transform(() => null));

export const listInvoicesQuery = z.object({
  q: z.string().optional(),
  status: status.optional().or(z.literal('')),
  semester_id: z.string().uuid().optional().or(z.literal('')),
});

export const createInvoiceSchema = z
  .object({
    student_id: z.string().uuid('Оюутан сонгоно уу'),
    semester_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
    tuition_amount: z.coerce.number().min(0, 'Төлбөрийн дүн сөрөг байж болохгүй'),
    discount_amount: z.coerce.number().min(0).default(0),
    discount_note: optionalText,
    due_date: optionalText,
    description: optionalText,
  })
  .refine((i) => i.discount_amount <= i.tuition_amount, { message: 'Хөнгөлөлт төлбөрийн дүнгээс их байж болохгүй', path: ['discount_amount'] });

export const updateInvoiceSchema = z.object({
  discount_amount: z.coerce.number().min(0).optional(),
  discount_note: optionalText,
  due_date: optionalText,
  description: optionalText,
  status: z.enum(['pending', 'cancelled']).optional(), // бусад төлөвийг төлөлтөөр автоматаар тооцно
});

// ---------------------------------------------------------------------
// Бөөнөөр нэхэмжлэх, өр төлбөрийн сануулга
// ---------------------------------------------------------------------

export const bulkInvoiceSchema = z
  .object({
    semester_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
    scope: z.object({
      kind: z.enum(['all', 'school', 'program', 'class', 'students']),
      ids: z.array(z.string().uuid()).max(300).default([]),
      student_codes: z.array(z.string().trim().toUpperCase()).max(3000).default([]),
    }),
    /** fixed — нэг дүн, per_credit — кредит × үнэ */
    mode: z.enum(['fixed', 'per_credit']).default('fixed'),
    amount: z.coerce.number().positive('Дүн оруулна уу'),
    due_date: optionalText,
    description: optionalText,
    apply_rules: z.boolean().default(true),
    /** Тухайн улиралд нэхэмжлэлтэй оюутныг алгасах */
    skip_existing: z.boolean().default(true),
  })
  .refine((v) => v.scope.kind === 'all' || (v.scope.kind === 'students' ? v.scope.student_codes.length > 0 : v.scope.ids.length > 0), {
    message: 'Хамрах хүрээгээ сонгоно уу',
    path: ['scope'],
  });

export const debtorsQuery = z.object({
  overdue_only: z.enum(['true', 'false']).optional(),
  semester_id: z.string().uuid().optional().or(z.literal('')),
});

export const remindSchema = z.object({
  invoice_ids: z.array(z.string().uuid()).min(1, 'Нэхэмжлэл сонгоно уу').max(2000),
  message: z.string().trim().max(500).optional().nullable(),
});
