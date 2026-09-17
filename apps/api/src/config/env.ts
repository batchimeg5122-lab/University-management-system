import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url('SUPABASE_URL буруу байна'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY тохируулаагүй байна'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** И-мэйлгүй оюутанд нэвтрэх хаяг үүсгэх домэйн: st26se001@student.ikhzasag.edu.mn */
  STUDENT_EMAIL_DOMAIN: z.string().default('student.ikhzasag.edu.mn'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n.env тохиргоо дутуу байна:');
  parsed.error.issues.forEach((i) => console.error(`  - ${i.path.join('.')}: ${i.message}`));
  console.error('\n.env.example файлыг .env болгон хуулж бөглөнө үү.\n');
  process.exit(1);
}

// Түгээмэл алдаа: URL-ийн төгсгөлд "/" эсвэл "/rest/v1" хуулж оруулах
const supabaseUrl = parsed.data.SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

export const env = {
  ...parsed.data,
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: parsed.data.SUPABASE_SERVICE_ROLE_KEY.trim(),
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((s) => s.trim()),
  isProd: parsed.data.NODE_ENV === 'production',
};
