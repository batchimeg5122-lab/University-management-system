import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './rooms.controller';
import { createRoomSchema, listRoomsQuery, updateRoomSchema } from './rooms.schema';

export const roomsRoutes = Router();

roomsRoutes.get('/rooms', validate({ query: listRoomsQuery }), c.list);
roomsRoutes.post('/rooms', requireRole('academic'), validate({ body: createRoomSchema }), c.create);
roomsRoutes.patch('/rooms/:id', requireRole('academic'), validate({ body: updateRoomSchema }), c.update);
