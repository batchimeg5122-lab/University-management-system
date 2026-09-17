import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './payments.controller';
import { createPaymentSchema, listPaymentsQuery } from './payments.schema';

export const paymentsRoutes = Router();

paymentsRoutes.get('/payments/me', requireRole('student'), c.mine);
paymentsRoutes.get('/payments', requireRole('finance', 'management'), validate({ query: listPaymentsQuery }), c.list);
paymentsRoutes.post('/payments', requireRole('finance'), validate({ body: createPaymentSchema }), c.create);
