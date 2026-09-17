import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './invoices.controller';
import { createInvoiceSchema, listInvoicesQuery, updateInvoiceSchema } from './invoices.schema';

export const invoicesRoutes = Router();

invoicesRoutes.get('/invoices/me', requireRole('student'), c.mine);
invoicesRoutes.get('/invoices', requireRole('finance', 'management'), validate({ query: listInvoicesQuery }), c.list);
invoicesRoutes.post('/invoices', requireRole('finance'), validate({ body: createInvoiceSchema }), c.create);
invoicesRoutes.patch('/invoices/:id', requireRole('finance'), validate({ body: updateInvoiceSchema }), c.update);
