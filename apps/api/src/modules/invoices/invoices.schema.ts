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
