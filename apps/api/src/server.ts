import { app } from './app';
import { env } from './config/env';
import { supabase } from './config/supabase';
import { processScheduled } from './modules/broadcasts/broadcasts.service';
import { runFinanceJobs } from './modules/invoices/invoices.reminders';
import { weeklyJob } from './modules/analytics/weekly.service';

/** JWT key-ийн payload-ийг задлах (anon / service_role ялгах) */
function jwtRole(key: string): string | null {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function fail(title: string, lines: string[]) {
  console.error(`\n✖ ${title}`);
  lines.forEach((l) => console.error(`  ${l}`));
  console.error('');
  process.exit(1);
}

async function checkSupabase() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY.trim();

  // 1. Key-ийн төрөл
  if (key.startsWith('sb_publishable_')) {
    fail('SUPABASE_SERVICE_ROLE_KEY-д publishable (нийтийн) key хийсэн байна.', [
      'Supabase Dashboard → Project Settings → API Keys → "secret" key (sb_secret_...) эсвэл',
      'Legacy API Keys → "service_role" key-г хуулна уу.',
    ]);
  }
  const role = jwtRole(key);
  if (role === 'anon') {
    fail('SUPABASE_SERVICE_ROLE_KEY-д anon key хийсэн байна.', [
      'Dashboard → Project Settings → API → "service_role" (secret) key-г хуулна уу.',
      'anon key нь зөвхөн apps/web/.env → VITE_SUPABASE_ANON_KEY-д орно.',
    ]);
  }
  if (!key.startsWith('sb_secret_') && role !== 'service_role') {
    console.warn('⚠ SUPABASE_SERVICE_ROLE_KEY танигдахгүй хэлбэртэй байна (service_role JWT эсвэл sb_secret_... байх ёстой).');
  }

  // 2. Бодит хүсэлт (HEAD биш GET — алдааны дэлгэрэнгүй мессеж ирэхийн тулд)
  let result;
  try {
    result = await supabase.from('semesters').select('id').limit(1);
  } catch (err) {
    fail('Supabase сервер рүү хүсэлт илгээж чадсангүй.', [
      `Алдаа: ${err instanceof Error ? err.message : String(err)}`,
      `SUPABASE_URL: ${env.SUPABASE_URL}`,
      'Интернэт холболт, proxy/firewall, URL зөв эсэхийг шалгана уу.',
    ]);
    return;
  }

  const { error, status } = result;
  if (!error) return;

  const info = [`HTTP ${status}`, error.code && `code: ${error.code}`, error.message && `message: ${error.message}`, error.details && `details: ${error.details}`, error.hint && `hint: ${error.hint}`]
    .filter(Boolean)
    .map(String);

  const msg = `${error.message} ${error.details ?? ''}`.toLowerCase();

  if (error.message?.includes('fetch failed') || status === 0) {
    fail('Supabase сервер рүү холбогдож чадсангүй (сүлжээ).', [...info, `SUPABASE_URL: ${env.SUPABASE_URL}`, 'URL зөв эсэх, төсөл pause хийгдээгүй эсэхийг Dashboard дээр шалгана уу.']);
  }
  if (status === 401 || status === 403 || msg.includes('invalid api key') || msg.includes('jwt')) {
    fail('API key буруу эсвэл өөр төслийнх байна.', [...info, 'SUPABASE_URL болон SUPABASE_SERVICE_ROLE_KEY нэг төслийнх эсэхийг шалгана уу.']);
  }
  if (error.code === 'PGRST205' || error.code === '42P01' || status === 404) {
    fail('`semesters` хүснэгт олдсонгүй — v3 schema (migration) энэ төсөлд ажиллаагүй байна.', [
      ...info,
      'Supabase Dashboard → SQL Editor дээр v3 schema SQL файлаа бүтнээр нь ажиллуулна уу.',
      'Хүснэгтүүд "public" schema дотор үүссэн эсэхийг Table Editor-оос шалгана уу.',
    ]);
  }
  fail('Supabase алдаа буцаалаа.', info);
}

async function start() {
  await checkSupabase();
  console.log('✔ Supabase холболт амжилттай');

  const server = app.listen(env.PORT, () => {
    console.log(`API ажиллаж байна: http://localhost:${env.PORT}/api  (${env.NODE_ENV})`);
  });

  // Товлосон мэдэгдлийн push — минут тутамд
  const timer = setInterval(() => void processScheduled().catch((e) => console.warn('[scheduler]', e.message)), 60_000);

  // Санхүү: хугацаа хэтрэлт, автомат сануулга — цагт нэг (эхлээд 1 минутын дараа)
  const runFinance = () => {
    void runFinanceJobs().catch((e) => console.warn('[finance-job]', e.message));
    void weeklyJob().catch((e) => console.warn('[weekly-report]', e.message));
  };
  const financeStart = setTimeout(runFinance, 60_000);
  const financeTimer = setInterval(runFinance, 60 * 60_000);

  const shutdown = () => {
    clearTimeout(financeStart);
    clearInterval(financeTimer);
    clearInterval(timer);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void start();