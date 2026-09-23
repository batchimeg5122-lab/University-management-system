import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Schedule } from '../types/models';
import { SESSION_TYPE_LABEL } from '../utils/constants';

/**
 * Хичээл эхлэхийн өмнөх ЛОКАЛ сануулга.
 * Утсан дээр долоо хоног бүр давтагдах мэдэгдэл товлоно —
 * backend, EAS, интернет шаардлагагүй. Android Expo Go дээр ч ажиллана.
 */
const PREFIX = 'class-reminder:';
const CHANNEL = 'reminders';
/** iOS нэг апп-д 64 хүртэл товлосон мэдэгдэл зөвшөөрдөг */
const MAX = 60;

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Хичээлийн сануулга',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 150, 200],
    lightColor: '#1E4B8F',
  });
}

export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Зөвхөн энэ модулийн товлосон сануулгуудыг устгана (push-д нөлөөлөхгүй) */
export async function cancelClassReminders() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch {
    /* web эсвэл дэмжигдэхгүй орчин */
  }
}

/**
 * Манай day_of_week: 1=Даваа ... 7=Ням
 * Expo weekly trigger: 1=Ням, 2=Даваа ... 7=Бямба
 * "N минутын өмнө" нь өмнөх өдөр рүү шилжиж болно (жишээ нь 00:10-ийн хичээл).
 */
function triggerFor(day: number, startTime: string, minutesBefore: number) {
  const [h, m] = startTime.split(':').map(Number);
  let total = (day - 1) * 1440 + h * 60 + m - minutesBefore; // Даваа 00:00-оос хойших минут
  total = ((total % 10080) + 10080) % 10080;
  const ourDay = Math.floor(total / 1440) + 1; // 1..7 (Даваа..Ням)
  const rest = total % 1440;
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: (ourDay % 7) + 1,
    hour: Math.floor(rest / 60),
    minute: rest % 60,
    channelId: CHANNEL,
  } as const;
}

/** Хуваарь эсвэл тохиргоо өөрчлөгдөх бүрт бүгдийг шинээр товлоно */
export async function syncClassReminders(schedules: Schedule[], minutesBefore: number, teacherView: boolean) {
  if (Platform.OS === 'web') return 0;
  await cancelClassReminders();
  await ensureChannel();

  const rows = [...schedules]
    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
    .slice(0, MAX);

  for (const s of rows) {
    const place = s.is_online ? 'Онлайн' : [s.building, s.room].filter(Boolean).join(' ') || '';
    const who = teacherView ? s.class_name : s.teacher_name;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${s.id}`,
      content: {
        title: `${minutesBefore} минутын дараа: ${s.subject_name ?? 'Хичээл'}`,
        body: [`${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`, SESSION_TYPE_LABEL[s.session_type ?? 'lecture'], place, who].filter(Boolean).join(' · '),
        sound: 'default',
        data: { type: 'reminder', course_id: s.course_id },
      },
      trigger: triggerFor(s.day_of_week, s.start_time, minutesBefore),
    });
  }
  return rows.length;
}

// ---------------------------------------------------------------------
// Шалгалтын сануулга (тодорхой огноотой, нэг удаагийн)
// ---------------------------------------------------------------------
const EXAM_PREFIX = 'exam-reminder:';

export async function cancelExamReminders() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter((n) => n.identifier.startsWith(EXAM_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch {
    /* дэмжигдэхгүй орчин */
  }
}

/**
 * Шалгалт бүрт 2 сануулга: өмнөх өдрийн 20:00, эхлэхээс 1 цагийн өмнө.
 * Өнгөрсөн цагийг алгасна. iOS-ийн 64 хязгаарыг хүндэтгэж 20 шалгалт хүртэл.
 */
export async function syncExamReminders(exams: { id: string; exam_date: string; start_time: string; end_time: string; subject_name?: string; room?: string | null; building?: string | null; is_online: boolean; exam_type: string }[], typeLabel: Record<string, string>) {
  if (Platform.OS === 'web') return 0;
  await cancelExamReminders();
  await ensureChannel();
  const now = Date.now();
  let count = 0;

  for (const e of [...exams].sort((a, b) => `${a.exam_date}${a.start_time}`.localeCompare(`${b.exam_date}${b.start_time}`)).slice(0, 20)) {
    const [y, m, d] = e.exam_date.split('-').map(Number);
    const [h, min] = e.start_time.split(':').map(Number);
    const start = new Date(y, m - 1, d, h, min);
    const place = e.is_online ? 'Онлайн' : [e.building, e.room].filter(Boolean).join(' ') || '';
    const label = typeLabel[e.exam_type] ?? 'Шалгалт';

    const eveBefore = new Date(y, m - 1, d - 1, 20, 0);
    const hourBefore = new Date(start.getTime() - 60 * 60_000);

    const items = [
      { id: `${EXAM_PREFIX}${e.id}:eve`, at: eveBefore, title: `Маргааш ${label}: ${e.subject_name ?? ''}` },
      { id: `${EXAM_PREFIX}${e.id}:hour`, at: hourBefore, title: `1 цагийн дараа ${label}: ${e.subject_name ?? ''}` },
    ];
    for (const it of items) {
      if (it.at.getTime() <= now + 60_000) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: it.id,
        content: {
          title: it.title,
          body: [`${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}`, place, 'Амжилт хүсье! 🍀'].filter(Boolean).join(' · '),
          sound: 'default',
          data: { type: 'exam-reminder', kind: 'exam', exam_id: e.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: it.at, channelId: CHANNEL },
      });
      count++;
    }
  }
  return count;
}
