import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, FilePlus2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, ExportButton, Input, Modal, MultiPicker, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClasses } from '@/features/classes/hooks';
import { useDepartments } from '@/features/departments/hooks';
import { usePrograms } from '@/features/programs/hooks';
import { useCurrentSemester, useSemesters } from '@/features/semesters/hooks';
import { errorMessage } from '@/lib/api';
import { exportExcel } from '@/lib/excel';
import { cn, formatMoney, formatNumber } from '@/lib/utils';
import { automationApi, useBulkInvoices, useDiscountRules, type BulkInvoiceInput, type BulkPreview, type ScopeKind } from '../automation';

const SCOPES: { value: ScopeKind; label: string }[] = [
  { value: 'all', label: 'Бүх оюутан' },
  { value: 'school', label: 'Сургууль' },
  { value: 'program', label: 'Хөтөлбөр' },
  { value: 'class', label: 'Анги' },
  { value: 'students', label: 'Оюутны код' },
];

const SKIP_LABEL = { existing: 'Нэхэмжлэлтэй', no_credit: 'Кредитгүй' } as const;

/** Улирлын нэхэмжлэлийг олон оюутанд нэг дор үүсгэх (хөнгөлөлтийн дүрмээр) */
export function BulkInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { data: current } = useCurrentSemester();
  const { data: semesters } = useSemesters();
  const { data: schools } = useDepartments({ level: 'school' });
  const { data: programs } = usePrograms();
  const { data: classes } = useClasses();
  const { data: rules } = useDiscountRules();
  const create = useBulkInvoices();

  const [semesterId, setSemesterId] = useState('');
  const [kind, setKind] = useState<ScopeKind>('program');
  const [ids, setIds] = useState<string[]>([]);
  const [codes, setCodes] = useState('');
  const [mode, setMode] = useState<'fixed' | 'per_credit'>('fixed');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [description, setDescription] = useState('');
  const [applyRules, setApplyRules] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setPreview(null);
      setSemesterId(current?.id ?? '');
    }
  }, [open, current?.id]);

  const options = useMemo(() => {
    if (kind === 'school') return (schools ?? []).map((d) => ({ value: d.id, label: d.name }));
    if (kind === 'program') return (programs ?? []).map((p) => ({ value: p.id, label: p.name, hint: p.department_name ?? '' }));
    if (kind === 'class') return (classes ?? []).map((c) => ({ value: c.id, label: c.code, hint: `${c.student_count ?? 0} оюутан` }));
    return [];
  }, [kind, schools, programs, classes]);

  const activeRules = (rules ?? []).filter((r) => r.is_active).length;
  const amountNum = Number(amount.replace(/[^\d.]/g, ''));
  const codeList = codes.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);

  const body: BulkInvoiceInput = {
    semester_id: semesterId || null,
    scope: { kind, ids: kind === 'students' || kind === 'all' ? [] : ids, student_codes: kind === 'students' ? codeList : [] },
    mode,
    amount: amountNum,
    due_date: due || null,
    description: description || null,
    apply_rules: applyRules,
    skip_existing: skipExisting,
  };
  const ready = amountNum > 0 && (kind === 'all' || (kind === 'students' ? codeList.length > 0 : ids.length > 0));

  const runPreview = async () => {
    setLoading(true);
    try {
      setPreview(await automationApi.bulkPreview(body));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const doCreate = async () => {
    try {
      const r = await create.mutateAsync(body);
      toast.success(`${formatNumber(r.created)} нэхэмжлэл үүслээ · ${formatMoney(r.total_net)}. Оюутнуудад мэдэгдэл илгээгдлээ.`);
      setConfirm(false);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const t = preview?.totals;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title="Нэхэмжлэл бөөнөөр үүсгэх"
        description={preview ? 'Урьдчилан тооцоолол — шалгаад баталгаажуулна.' : 'Хамрах хүрээ, дүнг сонгоод урьдчилан тооцоолно. Хөнгөлөлтийн дүрэм автоматаар хэрэглэгдэнэ.'}
        footer={
          preview ? (
            <>
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setPreview(null)}>Буцах</Button>
              <ExportButton
                label="Excel"
                onExport={() =>
                  exportExcel('nekhemjlel-tootsoo', 'Тооцоо', [
                    { header: 'Код', value: (r) => r.student_code },
                    { header: 'Оюутан', value: (r) => r.student_name, width: 26 },
                    { header: 'Хөтөлбөр', value: (r) => r.program_name, width: 28 },
                    { header: 'Анги', value: (r) => r.class_name },
                    { header: 'GPA', value: (r) => r.gpa },
                    { header: 'Кредит', value: (r) => r.credits },
                    { header: 'Төлбөр', value: (r) => r.tuition },
                    { header: 'Хөнгөлөлт', value: (r) => r.discount },
                    { header: 'Хөнгөлөлтийн шалтгаан', value: (r) => r.discount_note, width: 30 },
                    { header: 'Төлөх', value: (r) => r.net },
                    { header: 'Алгассан', value: (r) => (r.skip ? SKIP_LABEL[r.skip] : '') },
                  ], preview.rows)
                }
              />
              <Button variant="primary" icon={<FilePlus2 className="h-4 w-4" />} disabled={!t?.create} onClick={() => setConfirm(true)}>
                {formatNumber(t?.create ?? 0)} нэхэмжлэл үүсгэх
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>Болих</Button>
              <Button variant="primary" icon={<Calculator className="h-4 w-4" />} disabled={!ready} loading={loading} onClick={runPreview}>Урьдчилан тооцох</Button>
            </>
          )
        }
      >
        {!preview ? (
          <div className="flex flex-col gap-4">
            <Select label="Улирал" value={semesterId} onChange={(e) => setSemesterId(e.target.value)} options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} ${s.name}${s.is_current ? ' (одоогийн)' : ''}` }))} />

            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Хамрах хүрээ</p>
              <div className="flex flex-wrap gap-1.5">
                {SCOPES.map((s) => (
                  <button key={s.value} type="button" onClick={() => { setKind(s.value); setIds([]); }} className={cn('rounded-full border px-3 py-1 text-[13px]', kind === s.value ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-line-strong')}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {['school', 'program', 'class'].includes(kind) && <MultiPicker label={SCOPES.find((s) => s.value === kind)?.label} options={options} value={ids} onChange={setIds} />}
            {kind === 'students' && (
              <Textarea label={`Оюутны кодууд (${codeList.length})`} rows={4} value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="ST26SE001, ST26SE002 ... (мөр, таслалаар тусгаарлана)" />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Тооцох арга</p>
                <div className="flex gap-1.5">
                  {[
                    { v: 'fixed' as const, l: 'Тогтмол дүн' },
                    { v: 'per_credit' as const, l: 'Кредитээр' },
                  ].map((m) => (
                    <button key={m.v} type="button" onClick={() => setMode(m.v)} className={cn('flex-1 rounded-field border px-3 py-2 text-[13px]', mode === m.v ? 'border-accent bg-accent-soft font-medium text-accent-ink' : 'border-line text-ink-soft')}>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label={mode === 'fixed' ? 'Сургалтын төлбөр (₮)' : 'Нэг кредитийн үнэ (₮)'}
                required
                inputMode="numeric"
                value={amount ? Number(amount.replace(/[^\d]/g, '')).toLocaleString('en-US') : ''}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                placeholder={mode === 'fixed' ? '4,500,000' : '150,000'}
                hint={mode === 'per_credit' ? 'Тухайн улиралд бүртгүүлсэн кредит × үнэ' : undefined}
              />
              <Input label="Төлөх хугацаа" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              <Input label="Тайлбар" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="2026 Намрын улирлын сургалтын төлбөр" />
            </div>

            <div className="flex flex-col gap-2 rounded-field border border-line p-3 text-[13px]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={applyRules} onChange={(e) => setApplyRules(e.target.checked)} className="h-4 w-4 accent-[#1E4B8F]" />
                Хөнгөлөлтийн дүрэм хэрэглэх <Badge tone={activeRules ? 'accent' : 'neutral'}>{activeRules} идэвхтэй дүрэм</Badge>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)} className="h-4 w-4 accent-[#1E4B8F]" />
                Энэ улиралд нэхэмжлэлтэй оюутныг алгасах (давхардуулахгүй)
              </label>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
              {[
                ['Үүсгэх', formatNumber(t?.create)],
                ['Алгассан', formatNumber(t?.skipped)],
                ['Хөнгөлөлттэй', formatNumber(t?.with_discount)],
                ['Нийт хөнгөлөлт', formatMoney(t?.discount ?? 0)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-field border border-line px-3 py-2">
                  <p className="text-muted">{k}</p>
                  <p className="num text-base font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <p className="mb-3 rounded-field bg-accent-soft px-3 py-2 text-sm">
              Нийт төлөх дүн: <b className="num">{formatMoney(t?.net ?? 0)}</b> <span className="text-muted">(хөнгөлөлтийн өмнө {formatMoney(t?.tuition ?? 0)})</span>
            </p>
            <div className="max-h-[44vh] overflow-auto rounded-field border border-line">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-paper text-left text-muted">
                  <tr>
                    <th className="px-3 py-2">Оюутан</th>
                    {mode === 'per_credit' && <th className="px-3 py-2 text-right">Кр</th>}
                    <th className="px-3 py-2 text-right">Төлбөр</th>
                    <th className="px-3 py-2 text-right">Хөнгөлөлт</th>
                    <th className="px-3 py-2 text-right">Төлөх</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 500).map((r) => (
                    <tr key={r.student_id} className={cn('border-t border-line', r.skip && 'text-faint')}>
                      <td className="px-3 py-1.5">
                        <p className={cn('font-medium', r.skip && 'line-through')}>{r.student_name}</p>
                        <p className="num text-[12px] text-muted">
                          {r.student_code} · {r.class_name}
                          {r.skip && <Badge tone="neutral" className="ml-2">{SKIP_LABEL[r.skip]}{r.existing_invoice ? ` ${r.existing_invoice}` : ''}</Badge>}
                        </p>
                      </td>
                      {mode === 'per_credit' && <td className="num px-3 py-1.5 text-right">{r.credits}</td>}
                      <td className="num px-3 py-1.5 text-right">{formatMoney(r.tuition)}</td>
                      <td className="px-3 py-1.5 text-right">
                        {r.discount ? (
                          <>
                            <p className="num text-success">−{formatMoney(r.discount)}</p>
                            <p className="text-[11px] text-muted">{r.discount_note}</p>
                          </>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="num px-3 py-1.5 text-right font-medium">{formatMoney(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rows.length > 500 && <p className="mt-2 text-[12px] text-muted">Эхний 500 мөрийг харуулав. Бүгдийг Excel-ээр татаж шалгана уу.</p>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doCreate}
        loading={create.isPending}
        title="Нэхэмжлэл үүсгэх үү?"
        description={`${formatNumber(t?.create ?? 0)} оюутанд нийт ${formatMoney(t?.net ?? 0)}-ийн нэхэмжлэл үүсгэж, оюутан бүрт мэдэгдэл (push) илгээнэ.`}
        confirmLabel="Үүсгэх"
      />
    </>
  );
}
