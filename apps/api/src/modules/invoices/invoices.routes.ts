import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './invoices.controller';
import { bulkInvoiceSchema, createInvoiceSchema, debtorsQuery, listInvoicesQuery, remindSchema, updateInvoiceSchema } from './invoices.schema';

export const invoicesRoutes = Router();

invoicesRoutes.get('/invoices/me', requireRole('student'), c.mine);
invoicesRoutes.get('/invoices', requireRole('finance', 'management'), validate({ query: listInvoicesQuery }), c.list);
// Тусгай замууд /invoices/:id-ээс өмнө
invoicesRoutes.post('/invoices/bulk/preview', requireRole('finance'), validate({ body: bulkInvoiceSchema }), c.bulkPreview);
invoicesRoutes.post('/invoices/bulk', requireRole('finance'), validate({ body: bulkInvoiceSchema }), c.bulkCreate);
invoicesRoutes.get('/invoices/debtors', requireRole('finance', 'management'), validate({ query: debtorsQuery }), c.debtors);
invoicesRoutes.post('/invoices/remind', requireRole('finance'), validate({ body: remindSchema }), c.remind);
invoicesRoutes.post('/invoices', requireRole('finance'), validate({ body: createInvoiceSchema }), c.create);
invoicesRoutes.patch('/invoices/:id', requireRole('finance'), validate({ body: updateInvoiceSchema }), c.update);
