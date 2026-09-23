import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './discount-rules.controller';
import { ruleSchema, toggleRuleSchema } from './discount-rules.schema';

export const discountRulesRoutes = Router();

discountRulesRoutes.get('/discount-rules', requireRole('finance', 'management'), c.list);
discountRulesRoutes.post('/discount-rules', requireRole('finance'), validate({ body: ruleSchema }), c.create);
discountRulesRoutes.put('/discount-rules/:id', requireRole('finance'), validate({ body: ruleSchema }), c.update);
discountRulesRoutes.patch('/discount-rules/:id', requireRole('finance'), validate({ body: toggleRuleSchema }), c.update);
discountRulesRoutes.delete('/discount-rules/:id', requireRole('finance'), c.remove);
