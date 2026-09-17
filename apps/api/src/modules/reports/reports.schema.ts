import { z } from 'zod';

export const departmentsReportQuery = z.object({ school_id: z.string().uuid().optional().or(z.literal('')) });
export const financeReportQuery = z.object({ semester_id: z.string().uuid().optional().or(z.literal('')) });
