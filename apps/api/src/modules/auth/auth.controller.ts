import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './auth.service';
import * as sessions from './sessions.service';

export const me = asyncHandler(async (req, res) => ok(res, await service.getSession(req.user!)));
export const lookup = asyncHandler(async (req, res) => ok(res, await service.lookupEmail(req.body.identifier)));
export const avatarUploadUrl = asyncHandler(async (req, res) => ok(res, await service.avatarUploadUrl(req.user!, req.body), 201));
export const updateMe = asyncHandler(async (req, res) => {
  const result = await service.updateMe(req.user!, req.body);
  audit(req, 'UPDATE_PROFILE', 'users', req.user!.id, { phone: req.body.phone !== undefined, avatar: req.body.avatar_path !== undefined });
  ok(res, result);
});

export const loginEvent = asyncHandler(async (req, res) => {
  const platform = sessions.platformOf(req.body?.platform ?? req.headers['x-client-platform']);
  const meta = { ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
  await service.recordLogin(req.user!, { platform, ...meta });
  // Энэ төхөөрөмжийг тухайн платформын идэвхтэй нэвтрэлт болгоно (өмнөх нь хаагдана)
  const claimed = await sessions.claim(req.user!, platform, meta);
  ok(res, { ok: true, platform, ...claimed }, 201);
});

export const mySessions = asyncHandler(async (req, res) =>
  ok(res, {
    current: { platform: sessions.platformOf(req.headers['x-client-platform']), session_id: req.user!.sessionId ?? null },
    enforced: await sessions.enforcedFor(req.user!.role),
    sessions: await sessions.list(req.user!.id),
  }),
);

export const revokeSession = asyncHandler(async (req, res) => ok(res, await sessions.revoke(req.user!.id, sessions.platformOf(req.params.platform))));
export const myLoginHistory = asyncHandler(async (req, res) => ok(res, await service.loginHistory(req.user!.id, 30)));
export const allLoginHistory = asyncHandler(async (req, res) => ok(res, await service.loginHistory(String(req.query.user_id || '') || null, Number(req.query.limit) || 200)));
