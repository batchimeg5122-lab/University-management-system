import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './broadcasts.controller';
import { createBroadcastSchema, previewSchema } from './broadcasts.schema';

export const broadcastsRoutes = Router();

broadcastsRoutes.get('/broadcasts', requireRole('academic', 'management'), c.list);
broadcastsRoutes.post('/broadcasts/preview', requireRole('academic', 'management'), validate({ body: previewSchema }), c.preview);
broadcastsRoutes.post('/broadcasts', requireRole('academic', 'management'), validate({ body: createBroadcastSchema }), c.create);
broadcastsRoutes.delete('/broadcasts/:id', requireRole('academic', 'management'), c.remove);
