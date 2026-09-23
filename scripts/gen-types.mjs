/**
 * Supabase DB бүтцээс TypeScript төрөл үүсгэнэ:  npm run db:types
 * Шаардлага: `npx supabase login` (нэг удаа, access token)
 * Project ref-ийг SUPABASE_PROJECT_ID эсвэл apps/api/.env-ийн SUPABASE_URL-аас авна.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

let ref = process.env.SUPABASE_PROJECT_ID;
if (!ref && existsSync('apps/api/.env')) {
  const url = /SUPABASE_URL\s*=\s*"?(https:\/\/([a-z0-9]+)\.supabase\.co)/.exec(readFileSync('apps/api/.env', 'utf8'));
  ref = url?.[2];
}
if (!ref) {
  console.error('Project ref олдсонгүй. SUPABASE_PROJECT_ID=xxxx гэж өгөх эсвэл apps/api/.env-д SUPABASE_URL бөглөнө үү.');
  process.exit(1);
}

console.log(`Supabase project: ${ref} → төрөл үүсгэж байна...`);
const r = spawnSync('npx', ['-y', 'supabase', 'gen', 'types', 'typescript', '--project-id', ref, '--schema', 'public'], { encoding: 'utf8', shell: true, maxBuffer: 50 * 1024 * 1024 });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  console.error('\nАлдаа: эхлээд "npx supabase login" хийсэн эсэхээ шалгана уу.');
  process.exit(r.status ?? 1);
}
const header = '// АВТОМАТААР ҮҮСГЭСЭН — гараар бүү засварла. `npm run db:types`\n';
for (const target of ['apps/api/src/types/database.ts', 'apps/web/src/types/database.ts']) {
  writeFileSync(target, header + r.stdout);
  console.log(`✔ ${target}`);
}
