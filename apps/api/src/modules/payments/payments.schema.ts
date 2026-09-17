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
