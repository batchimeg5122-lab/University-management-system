import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './payments.controller';
import { bulkPaymentsSchema, createPaymentSchema, listPaymentsQuery, reconcilePreviewSchema } from './payments.schema';

export const paymentsRoutes = Router();

paymentsRoutes.get('/payments/me', requireRole('student'), c.mine);
// Төлбөр төлсөн баримт — оюутан зөвхөн өөрийнхөө (service шалгана)
paymentsRoutes.get('/payments/:id/receipt', requireRole('student', 'finance', 'academic', 'management'), c.receipt);
paymentsRoutes.get('/payments', requireRole('finance', 'management'), validate({ query: listPaymentsQuery }), c.list);
paymentsRoutes.post('/payments', requireRole('finance'), validate({ body: createPaymentSchema }), c.create);

// Банкны хуулга тулгах
paymentsRoutes.post('/payments/reconcile/preview', requireRole('finance'), validate({ body: reconcilePreviewSchema }), c.reconcilePreview);
paymentsRoutes.post('/payments/bulk', requireRole('finance'), validate({ body: bulkPaymentsSchema }), c.bulkCreate);
