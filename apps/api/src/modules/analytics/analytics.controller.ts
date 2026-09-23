import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { atRisk, notifyAdvisors } from './risk.service';
import { trends } from './trends.service';
import { renderHtml, sendWeekly, smtpConfigured, weeklySummary } from './weekly.service';

export const risk = asyncHandler(async (req, res) => ok(res, await atRisk(String(req.query.semester_id || '') || null)));
export const notify = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.student_ids) ? (req.body.student_ids as string[]).slice(0, 2000) : [];
  const result = await notifyAdvisors(ids, req.user!.id);
  audit(req, 'NOTIFY_ADVISORS', 'students', null, result);
  ok(res, result);
});
export const trend = asyncHandler(async (req, res) => ok(res, await trends(req.query.fresh === 'true')));
export const weekly = asyncHandler(async (_req, res) => {
  const summary = await weeklySummary();
  ok(res, { summary, html: renderHtml(summary), smtp: smtpConfigured() });
});
export const weeklySend = asyncHandler(async (req, res) => {
  const to = Array.isArray(req.body?.to) ? (req.body.to as string[]).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).slice(0, 50) : undefined;
  const result = await sendWeekly(to);
  audit(req, 'SEND_WEEKLY_REPORT', 'reports', null, { sent: result.sent });
  ok(res, result);
});
