import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { Badge, Button, Modal, ProgressBar } from '@/components/ui';
import { useClasses } from '@/features/classes/hooks';
import { errorMessage } from '@/lib/api';
import { downloadTemplate, exportExcel, readSpreadsheet } from '@/lib/excel';
import { studentsApi } from '../api';

type Key = 'last_name' | 'first_name' | 'student_code' | 'class_code' | 'register_number' | 'email' | 'phone' | 'enrollment_year';

/** Импортын баганууд — толгойн нэрийг Монгол эсвэл Англи хоёуланг таньна */
const FIELDS: { key: Key; label: string; aliases: string[]; required?: boolean; note: string }[] = [
  { key: 'last_name', label: 'Овог', aliases: ['овог', 'last_name', 'lastname'], required: true, note: 'Жишээ: Батын' },
  { key: 'first_name', label: 'Нэр', aliases: ['нэр', 'first_name', 'firstname'], required: true, note: 'Жишээ: Дорж' },
  { key: 'student_code', label: 'Оюутны код', aliases: ['оюутны код', 'код', 'student_code', 'code'], required: true, note: 'Давтагдашгүй. Жишээ: ST26SE001' },
  { key: 'class_code', label: 'Анги', aliases: ['анги', 'ангийн код', 'class', 'class_code'], required: true, note: 'Системд бүртгэлтэй ангийн код. Жишээ: SE-1A' },
  { key: 'register_number', label: 'Регистр', aliases: ['регистр', 'регистрийн дугаар', 'register_number'], note: 'Жишээ: УБ05231234' },
  { key: 'email', label: 'И-мэйл', aliases: ['и-мэйл', 'имэйл', 'email', 'e-mail'], note: 'Хоосон бол <код>@student домэйн автоматаар үүснэ' },
  { key: 'phone', label: 'Утас', aliases: ['утас', 'phone'], note: '8 оронтой' },
  { key: 'enrollment_year', label: 'Элссэн он', aliases: ['элссэн он', 'enrollment_year', 'year'], note: 'Хоосон бол энэ он' },
];

type Row = Record<Key, string> & { _line: number; _errors: string[]; _classId?: string };
type Result = { line: number; code: string; name: string; ok: boolean; message?: string; email?: string | null; password?: string | null };

const norm = (s: string) => s.toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();

export function StudentImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: classes } = useClasses();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [parseError, setParseError] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);

  const classByCode = useMemo(() => new Map((classes ?? []).map((c) => [c.code.toUpperCase(), c.id])), [classes]);

  const reset = () => {
    setFileName('');
    setRows([]);
    setParseError('');
    setProgress(null);
    setResults(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => {
    if (progress && !results) return; // импорт явагдаж байхад хаахгүй
    reset();
    onClose();
  };

  const onFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const [{ headers, rows: raw }, existing] = await Promise.all([readSpreadsheet(file), studentsApi.list({})]);
      // Толгойн нэрийг талбарт харгалзуулна
      const map = new Map<string, Key>();
      headers.forEach((h) => {
        const f = FIELDS.find((x) => x.aliases.some((a) => a === norm(h)));
        if (f) map.set(h, f.key);
      });
      const missing = FIELDS.filter((f) => f.required && ![...map.values()].includes(f.key));
      if (missing.length) throw new Error(`Заавал байх багана олдсонгүй: ${missing.map((m) => m.label).join(', ')}. Загвар файлыг ашиглана уу.`);
      if (raw.length > 1000) throw new Error('Нэг удаад 1000-аас ихгүй мөр импортлоно уу.');

      const existingCodes = new Set(existing.map((s) => s.student_code.toUpperCase()));
      const seen = new Map<string, number>();

      const parsed: Row[] = raw.map((r, i) => {
        const row = { _line: i + 2, _errors: [] as string[] } as Row;
        FIELDS.forEach((f) => (row[f.key] = ''));
        for (const [h, key] of map) row[key] = (r[h] ?? '').trim();
        row.student_code = row.student_code.toUpperCase();

        if (!row.last_name) row._errors.push('Овог хоосон');
        if (!row.first_name) row._errors.push('Нэр хоосон');
        if (row.student_code.length < 3) row._errors.push('Оюутны код буруу');
        else if (existingCodes.has(row.student_code)) row._errors.push('Код системд бүртгэлтэй');
        else if (seen.has(row.student_code)) row._errors.push(`Код ${seen.get(row.student_code)}-р мөртэй давхардсан`);
        else seen.set(row.student_code, row._line);

        row._classId = classByCode.get(row.class_code.toUpperCase());
        if (!row.class_code) row._errors.push('Анги хоосон');
        else if (!row._classId) row._errors.push(`"${row.class_code}" анги олдсонгүй`);

        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) row._errors.push('И-мэйл буруу');
        if (row.enrollment_year && !/^(20\d{2}|2100)$/.test(row.enrollment_year)) row._errors.push('Элссэн он буруу');
        return row;
      });
      setRows(parsed);
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  const valid = rows.filter((r) => !r._errors.length);
  const invalid = rows.length - valid.length;

  const runImport = async () => {
    setProgress({ done: 0, total: valid.length });
    const out: Result[] = [];
    // Дараалан бүртгэнэ — Supabase Auth-ийн хязгаарт өртөхгүй, мөр бүрийн алдааг тусад нь харуулна
    for (const [i, r] of valid.entries()) {
      try {
        const created = await studentsApi.create({
          last_name: r.last_name,
          first_name: r.first_name,
          student_code: r.student_code,
          register_number: r.register_number || null,
          email: r.email || undefined,
          phone: r.phone || null,
          class_id: r._classId,
          enrollment_year: r.enrollment_year ? Number(r.enrollment_year) : new Date().getFullYear(),
        } as never);
        out.push({ line: r._line, code: r.student_code, name: `${r.last_name} ${r.first_name}`, ok: true, email: created.email, password: created.initial_password ?? null });
      } catch (err) {
        out.push({ line: r._line, code: r.student_code, name: `${r.last_name} ${r.first_name}`, ok: false, message: errorMessage(err) });
      }
      setProgress({ done: i + 1, total: valid.length });
    }
    setResults(out);
    qc.invalidateQueries({ queryKey: ['students'] });
    qc.invalidateQueries({ queryKey: ['classes'] });
  };

  const okCount = results?.filter((r) => r.ok).length ?? 0;

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Оюутан Excel-ээс импортлох"
      description="Загвар файлыг татаж бөглөөд оруулна. Алдаатай мөрүүдийг бүртгэхээс өмнө харуулна."
      footer={
        results ? (
          <>
            {okCount > 0 && (
              <Button
                icon={<Download className="h-4 w-4" />}
                onClick={() =>
                  exportExcel('newtrekh-medeelel', 'Нэвтрэх мэдээлэл', [
                    { header: 'Оюутны код', value: (r: Result) => r.code },
                    { header: 'Овог нэр', value: (r) => r.name, width: 28 },
                    { header: 'И-мэйл', value: (r) => r.email, width: 34 },
                    { header: 'Анхны нууц үг', value: (r) => r.password ?? '(оруулсан нууц үг)', width: 20 },
                  ], results.filter((r) => r.ok))
                }
              >
                Нэвтрэх мэдээлэл (Excel)
              </Button>
            )}
            <Button variant="primary" onClick={close}>Дуусгах</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close} disabled={!!progress}>Болих</Button>
            <Button variant="primary" icon={<Upload className="h-4 w-4" />} disabled={!valid.length || !!progress} loading={!!progress} onClick={runImport}>
              {valid.length ? `${valid.length} оюутан бүртгэх` : 'Бүртгэх'}
            </Button>
          </>
        )
      }
    >
      {!results && !progress && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            icon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={() =>
              downloadTemplate(
                'oyutan-import-zagvar.xlsx',
                FIELDS.map((f) => ({ key: f.key, label: f.label, required: f.required, note: f.note })),
                { last_name: 'Батын', first_name: 'Дорж', student_code: 'ST26SE001', class_code: classes?.[0]?.code ?? 'SE-1A', register_number: 'УБ05231234', email: '', phone: '99112233', enrollment_year: String(new Date().getFullYear()) },
              )
            }
          >
            Загвар татах
          </Button>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-field border border-dashed border-line-strong px-4 py-3 text-sm text-muted hover:border-accent hover:text-accent">
            <Upload className="h-4 w-4" />
            {fileName || '.xlsx эсвэл .csv файл сонгох'}
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
          </label>
        </div>
      )}

      {parseError && (
        <p className="mt-4 flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {parseError}
        </p>
      )}

      {progress && !results && (
        <div className="mt-2">
          <p className="mb-2 text-sm text-muted">
            Бүртгэж байна… <span className="num font-medium text-ink">{progress.done}/{progress.total}</span>. Цонхыг хаалгүй хүлээнэ үү.
          </p>
          <ProgressBar value={progress.total ? (progress.done / progress.total) * 100 : 0} />
        </div>
      )}

      {rows.length > 0 && !progress && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
            <Badge tone="neutral">{rows.length} мөр</Badge>
            <Badge tone="success">{valid.length} зөв</Badge>
            {invalid > 0 && <Badge tone="danger">{invalid} алдаатай — бүртгэхгүй</Badge>}
          </div>
          <div className="mt-3 max-h-[46vh] overflow-auto rounded-field border border-line">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-paper text-left text-muted">
                <tr>
                  <th className="px-3 py-2">Мөр</th>
                  <th className="px-3 py-2">Код</th>
                  <th className="px-3 py-2">Овог нэр</th>
                  <th className="px-3 py-2">Анги</th>
                  <th className="px-3 py-2">Шалгалт</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._line} className={`border-t border-line ${r._errors.length ? 'bg-danger-soft/50' : ''}`}>
                    <td className="num px-3 py-1.5 text-faint">{r._line}</td>
                    <td className="num px-3 py-1.5">{r.student_code || '—'}</td>
                    <td className="px-3 py-1.5">{`${r.last_name} ${r.first_name}`.trim() || '—'}</td>
                    <td className="px-3 py-1.5">{r.class_code || '—'}</td>
                    <td className="px-3 py-1.5">
                      {r._errors.length ? (
                        <span className="flex items-start gap-1 text-danger">
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {r._errors.join('; ')}
                        </span>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {results && (
        <div>
          <p className={`flex items-center gap-2 rounded-field px-3 py-2.5 text-sm font-medium ${okCount === results.length ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn'}`}>
            <CheckCircle2 className="h-4 w-4" />
            {okCount}/{results.length} оюутан амжилттай бүртгэгдлээ
          </p>
          {okCount > 0 && (
            <p className="mt-2 text-[13px] text-muted">
              Анхны нууц үгийг зөвхөн одоо харах боломжтой. "Нэвтрэх мэдээлэл" Excel-ийг татаж, оюутнуудад аюулгүй хүргэсний дараа устгана уу.
            </p>
          )}
          {results.some((r) => !r.ok) && (
            <ul className="mt-3 max-h-[36vh] overflow-auto rounded-field border border-line text-[13px]">
              {results.filter((r) => !r.ok).map((r) => (
                <li key={r.line} className="flex gap-2 border-b border-line px-3 py-2 last:border-0">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                  <span>
                    <span className="num">{r.line}-р мөр, {r.code}</span> — {r.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
