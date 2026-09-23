import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './devices.controller';
import { registerDeviceSchema, unregisterDeviceSchema } from './devices.schema';

export const devicesRoutes = Router();

// Mobile app push notification token бүртгэх / устгах
devicesRoutes.post('/devices', validate({ body: registerDeviceSchema }), c.register);
devicesRoutes.post('/devices/unregister', validate({ body: unregisterDeviceSchema }), c.unregister);
devicesRoutes.get('/devices/stats', requireRole('management'), c.stats);
