import { useMemo, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Landmark, RefreshCw, Upload } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, Input, PageHeader, Panel, Select, StatStrip } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { automationApi, useImportPayments, type MatchStatus, type ReconcileResult, type StatementRow } from '@/features/finance/automation';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';
import { downloadTemplate, readSpreadsheet } from '@/lib/excel';
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/utils';

type Field = 'date' | 'amount' | 'description' | 'reference';

/** Монголын банкуудын хуулгын түгээмэл толгой нэрс */
const ALIASES: Record<Field, string[]> = {
  date: ['огноо', 'гүйлгээний огноо', 'date', 'transaction date', 'он сар өдөр'],
  amount: ['дүн', 'кредит', 'орлого', 'кредит гүйлгээ', 'гүйлгээний дүн', 'amount', 'credit'],
  description: ['гүйлгээний утга', 'утга', 'тайлбар', 'гүйлгээний тайлбар', 'description', 'narrative', 'details'],
  reference: ['гүйлгээний дугаар', 'журнал', 'журналын дугаар', 'дугаар', 'reference', 'ref', 'transaction id'],
};
const FIELD_LABEL: Record<Field, string> = { date: 'Огноо', amount: 'Дүн (орлого)', description: 'Гүйлгээний утга', reference: 'Гүйлгээний дугаар' };

const STATUS: Record<MatchStatus, { label: string; tone: 'success' | 'accent' | 'warn' | 'danger' | 'neutral' | 'gold' }> = {
  matched: { label: 'Тулсан', tone: 'success' },
  overpaid: { label: 'Илүү төлөлт', tone: 'gold' },
  duplicate: { label: 'Давхардсан', tone: 'neutral' },
  unmatched: { label: 'Олдсонгүй', tone: 'danger' },
  ambiguous: { label: 'Тодорхойгүй', tone: 'warn' },
  no_invoice: { label: 'Нэхэмжлэлгүй', tone: 'warn' },
  skip: { label: 'Алгассан', tone: 'neutral' },
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const parseAmount = (v: string) => {
  const s = String(v ?? '').replace(/[₮\s,]/g, '').replace(/^\((.*)\)$/, '-$1');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Банкны хуулга тулгах: хуулгын Excel-ийг оруулахад гүйлгээний утгаас
 * оюутны код / нэхэмжлэлийн дугаарыг таньж төлөлтийг бөөнөөр бүртгэнэ.
 */
export default function ReconcilePage() {
  useDocumentTitle('Банкны хуулга тулгах');
  const toast = useToast();
  const importPayments = useImportPayments();

  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, string>[]>([]);
  const [map, setMap] = useState<Record<Field, string>>({ date: '', amount: '', description: '', reference: '' });
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<{ created: number; duplicates: number; errors: number } | null>(null);

  const onFile = async (file: File) => {
    setResult(null);
    setDone(null);
    setOverrides({});
    try {
      const { headers: h, rows } = await readSpreadsheet(file);
      setFileName(file.name);
      setHeaders(h);
      setRaw(rows);
      const auto = { date: '', amount: '', description: '', reference: '' } as Record<Field, string>;
      (Object.keys(ALIASES) as Field[]).forEach((f) => (auto[f] = h.find((x) => ALIASES[f].includes(norm(x))) ?? ''));
      setMap(auto);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const statement = useMemo<StatementRow[]>(
    () =>
      raw.map((r, i) => ({
        row: i + 2,
        date: map.date ? r[map.date] : null,
        amount: map.amount ? parseAmount(r[map.amount]) : 0,
        description: map.description ? r[map.description] ?? '' : '',
        reference: map.reference ? r[map.reference] || null : null,
        student_code: overrides[i + 2] || null,
      })),
    [raw, map, overrides],
  );

  const runMatch = async () => {
    setLoading(true);
    try {
      const res = await automationApi.reconcile(statement);
      setResult(res);
      setExcluded(new Set());
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const ready = (result?.rows ?? []).filter((r) => (r.status === 'matched' || r.status === 'overpaid') && !excluded.has(r.row));
  const readyTotal = ready.reduce((s, r) => s + r.amount, 0);

  const doImport = async () => {
    try {
      const res = await importPayments.mutateAsync(
        ready.map((r) => ({ invoice_id: r.invoice_id!, amount: r.amount, payment_date: r.payment_date, transaction_reference: r.reference ?? null, description: r.description?.slice(0, 500) || null })),
      );
      setDone({ created: res.created, duplicates: res.duplicates, errors: res.errors.length });
      toast.success(`${formatNumber(res.created)} төлөлт бүртгэгдлээ`);
      setConfirm(false);
      setResult(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const s = result?.summary;

  return (
    <>
      <PageHeader
        title="Банкны хуулга тулгах"
        description="Банкны апп/интернэт банкнаас татсан хуулгыг (.xlsx, .csv) оруулна. Гүйлгээний утгад оюутны код эсвэл нэхэмжлэлийн дугаар (INV-2026-00012) байвал автоматаар тулгана."
        actions={
          <Button
            icon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={() =>
              downloadTemplate(
                'bank-khuulga-zagvar.xlsx',
                [
                  { key: 'date', label: 'Огноо', required: true, note: '2026.09.21 эсвэл 21/09/2026' },
                  { key: 'amount', label: 'Дүн', required: true, note: 'Орлогын дүн. Зарлага (сөрөг) мөрийг алгасна' },
                  { key: 'description', label: 'Гүйлгээний утга', required: true, note: 'Оюутны код эсвэл нэхэмжлэлийн дугаар агуулсан байх' },
                  { key: 'reference', label: 'Гүйлгээний дугаар', note: 'Давхар бүртгэхээс сэргийлнэ' },
                ],
                { date: '2026.09.21', amount: '1000000', description: 'ST26SE001 Батын Дорж сургалтын төлбөр', reference: 'TRX0012345' },
              )
            }
          >
            Загвар
          </Button>
        }
      />

      {done && (
        <p className="mb-4 flex items-center gap-2 rounded-field bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {formatNumber(done.created)} төлөлт бүртгэгдэж, оюутнуудад мэдэгдэл очлоо.
          {done.duplicates ? ` ${done.duplicates} давхардлыг алгасав.` : ''}
          {done.errors ? ` ${done.errors} алдаа.` : ''}
        </p>
      )}

      <Panel title="1. Хуулга оруулах">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-field border border-dashed border-line-strong px-4 py-6 text-sm text-muted hover:border-accent hover:text-accent">
          <Upload className="h-4 w-4" />
          {fileName ? `${fileName} · ${formatNumber(raw.length)} мөр` : '.xlsx эсвэл .csv хуулга сонгох'}
          <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
        </label>

        {headers.length > 0 && (
          <>
            <p className="mb-2 mt-5 text-[13px] font-medium text-ink-soft">Баганын тохируулга (автоматаар таньсан — шаардлагатай бол засна)</p>
            <div className="grid gap-3 sm:grid-cols-4">
              {(Object.keys(FIELD_LABEL) as Field[]).map((f) => (
                <Select key={f} label={FIELD_LABEL[f]} value={map[f]} onChange={(e) => setMap((m) => ({ ...m, [f]: e.target.value }))} placeholder="— сонгох —" options={headers.map((h) => ({ value: h, label: h }))} />
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="primary" icon={<RefreshCw className="h-4 w-4" />} loading={loading} disabled={!map.amount || !map.description} onClick={runMatch}>
                Тулгах
              </Button>
            </div>
          </>
        )}
      </Panel>

      {result && (
        <>
          <StatStrip
            className="my-6"
            items={[
              { label: 'Тулсан', value: formatNumber((s?.matched ?? 0) + (s?.overpaid ?? 0)), tone: 'success' },
              { label: 'Тулаагүй', value: formatNumber(s?.unmatched), tone: s?.unmatched ? 'danger' : 'default' },
              { label: 'Давхардсан / алгассан', value: `${formatNumber(s?.duplicate)} / ${formatNumber(s?.skipped)}` },
              { label: 'Бүртгэх дүн', value: formatMoney(readyTotal) },
            ]}
          />
          <Panel
            flush
            title="2. Шалгах"
            description="Тулаагүй мөрөнд оюутны кодыг гараар оруулаад дахин тулгана. Бүртгэхгүй мөрийн чагтыг авна."
            actions={
              <>
                <Button size="sm" icon={<RefreshCw className="h-4 w-4" />} loading={loading} onClick={runMatch}>Дахин тулгах</Button>
                <Button size="sm" variant="primary" icon={<Landmark className="h-4 w-4" />} disabled={!ready.length} onClick={() => setConfirm(true)}>
                  {formatNumber(ready.length)} төлөлт бүртгэх
                </Button>
              </>
            }
          >
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-paper text-left text-muted">
                  <tr>
                    <th className="w-8 px-3 py-2" />
                    <th className="px-3 py-2">Мөр</th>
                    <th className="px-3 py-2">Огноо</th>
                    <th className="px-3 py-2 text-right">Дүн</th>
                    <th className="px-3 py-2">Гүйлгээний утга</th>
                    <th className="px-3 py-2">Тулгалт</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => {
                    const ok = r.status === 'matched' || r.status === 'overpaid';
                    const fixable = r.status === 'unmatched' || r.status === 'ambiguous' || r.status === 'no_invoice';
                    return (
                      <tr key={r.row} className={cn('border-t border-line align-top', !ok && r.status !== 'skip' && r.status !== 'duplicate' && 'bg-danger-soft/30', (r.status === 'skip' || r.status === 'duplicate') && 'text-faint')}>
                        <td className="px-3 py-2">
                          {ok && (
                            <input
                              type="checkbox"
                              checked={!excluded.has(r.row)}
                              onChange={() => setExcluded((e) => { const n = new Set(e); n.has(r.row) ? n.delete(r.row) : n.add(r.row); return n; })}
                              className="h-4 w-4 accent-[#1E4B8F]"
                              aria-label="Бүртгэх"
                            />
                          )}
                        </td>
                        <td className="num px-3 py-2 text-faint">{r.row}</td>
                        <td className="num whitespace-nowrap px-3 py-2">{r.payment_date ? formatDate(r.payment_date) : r.date ?? '—'}</td>
                        <td className="num whitespace-nowrap px-3 py-2 text-right font-medium">{formatMoney(r.amount)}</td>
                        <td className="max-w-[280px] px-3 py-2">
                          <p className="line-clamp-2">{r.description}</p>
                          {r.reference && <p className="num text-[11px] text-faint">{r.reference}</p>}
                        </td>
                        <td className="min-w-[240px] px-3 py-2">
                          <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                          {r.invoice_number && (
                            <p className="mt-1">
                              <span className="font-medium">{r.student_name}</span> <span className="num text-muted">{r.student_code}</span>
                              <br />
                              <span className="num text-[12px] text-muted">{r.invoice_number} · үлдэгдэл {formatMoney(r.balance ?? 0)}</span>
                            </p>
                          )}
                          {r.note && <p className="mt-1 text-[12px] text-muted">{r.note}{r.candidates?.length ? `: ${r.candidates.join(', ')}` : ''}</p>}
                          {fixable && (
                            <Input
                              wrapperClassName="mt-1.5"
                              className="h-8 text-[13px]"
                              placeholder="Оюутны код"
                              value={overrides[r.row] ?? ''}
                              onChange={(e) => setOverrides((o) => ({ ...o, [r.row]: e.target.value.toUpperCase() }))}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {!headers.length && !done && (
        <Panel className="mt-6">
          <EmptyState icon={Landmark} title="Хуулга оруулаагүй байна" description="Хаан, Голомт, ХХБ, Төрийн банкны Excel хуулгын толгойг автоматаар танина. Бусад тохиолдолд баганаа гараар сонгоно." />
        </Panel>
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doImport}
        loading={importPayments.isPending}
        title="Төлөлт бүртгэх үү?"
        description={`${formatNumber(ready.length)} гүйлгээ, нийт ${formatMoney(readyTotal)}-ийг "Банкны шилжүүлэг" төлөлтөөр бүртгэж, нэхэмжлэлийн төлөвийг шинэчилнэ. Оюутнуудад мэдэгдэл очно.`}
        confirmLabel="Бүртгэх"
      />
    </>
  );
}
