import { z } from 'zod';

const method = z.enum(['cash', 'bank_transfer', 'card', 'qpay', 'other']);

export const listPaymentsQuery = z.object({
  q: z.string().optional(),
  method: method.optional().or(z.literal('')),
});

export const createPaymentSchema = z.object({
  invoice_id: z.string().uuid('Нэхэмжлэл сонгоно уу'),
  amount: z.coerce.number().positive('Төлөлтийн дүн 0-ээс их байх ёстой'),
  method,
  transaction_reference: z.string().trim().max(100).optional().nullable(),
  payment_date: z.string().optional().nullable(),
  description: z.string().trim().optional().nullable(),
});

// ---------------------------------------------------------------------
// Банкны хуулга тулгах
// ---------------------------------------------------------------------
export const reconcilePreviewSchema = z.object({
  rows: z
    .array(
      z.object({
        row: z.coerce.number().int(),
        date: z.string().trim().max(40).optional().nullable(),
        amount: z.coerce.number(),
        description: z.string().trim().max(500).default(''),
        reference: z.string().trim().max(100).optional().nullable(),
        /** Гараар заасан оюутны код / нэхэмжлэлийн дугаар */
        student_code: z.string().trim().toUpperCase().max(40).optional().nullable(),
        invoice_number: z.string().trim().toUpperCase().max(40).optional().nullable(),
      }),
    )
    .min(1, 'Мөр алга')
    .max(5000, 'Нэг удаад 5,000 мөрөөс ихгүй'),
});

export const bulkPaymentsSchema = z.object({
  rows: z
    .array(
      z.object({
        invoice_id: z.string().uuid(),
        amount: z.coerce.number().positive(),
        payment_date: z.string().optional().nullable(),
        transaction_reference: z.string().trim().max(100).optional().nullable(),
        description: z.string().trim().max(500).optional().nullable(),
      }),
    )
    .min(1)
    .max(5000),
});
