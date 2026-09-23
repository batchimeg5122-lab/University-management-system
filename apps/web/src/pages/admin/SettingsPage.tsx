import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button, ErrorState, Input, PageHeader, PageLoader, Panel } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useSaveSetting, useSettings, type GradeRow, type SystemSettings } from '@/features/settings/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ROLE_LABEL } from '@/lib/constants';
import { errorMessage } from '@/lib/api';

/** Системийн тохиргоо — кодоор биш UI-аас (super_admin) */
export default function SettingsPage() {
  useDocumentTitle('Системийн тохиргоо');
  const toast = useToast();
  const { data, isLoading, error, refetch } = useSettings();
  const save = useSaveSetting();
  const [form, setForm] = useState<SystemSettings | null>(null);

  useEffect(() => {
    if (data) setForm(structuredClone(data));
  }, [data]);

  if (isLoading || !form) return error ? <ErrorState error={error} onRetry={refetch} /> : <PageLoader />;

  const submit = async <K extends keyof SystemSettings>(key: K) => {
    try {
      await save.mutateAsync({ key, value: form[key] });
      toast.success('Хадгалагдлаа');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const setScale = (rows: GradeRow[]) => setForm({ ...form, grading: { scale: rows } });
  const scale = [...form.grading.scale];

  return (
    <>
      <PageHeader title="Системийн тохиргоо" description="Өөрчлөлт 1 минутын дотор бүх хэрэглэгчид үйлчилнэ. Бүх өөрчлөлт үйлдлийн түүхэнд бүртгэгдэнэ." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Үнэлгээний шкал"
          description="Нийт оноо → үсгэн үнэлгээ, голч оноо. Шинээр оруулах дүнд үйлчилнэ (өмнө баталгаажсан дүн өөрчлөгдөхгүй)."
          actions={<Button size="sm" variant="primary" icon={<Save className="h-4 w-4" />} loading={save.isPending} onClick={() => submit('grading')}>Хадгалах</Button>}
        >
          <table className="w-full text-sm">
            <thead className="text-left text-[12px] text-muted">
              <tr><th className="pb-2">Доод оноо</th><th className="pb-2">Үнэлгээ</th><th className="pb-2">Голч</th><th /></tr>
            </thead>
            <tbody>
              {scale.map((r, i) => (
                <tr key={i}>
                  {(['min', 'letter', 'point'] as const).map((k) => (
                    <td key={k} className="pb-1.5 pr-2">
                      <input
                        className="field num h-8"
                        type={k === 'letter' ? 'text' : 'number'}
                        step={k === 'point' ? '0.1' : '1'}
                        value={r[k]}
                        onChange={(e) => {
                          const next = [...scale];
                          next[i] = { ...r, [k]: k === 'letter' ? e.target.value : Number(e.target.value) };
                          setScale(next);
                        }}
                      />
                    </td>
                  ))}
                  <td className="pb-1.5">
                    <button onClick={() => setScale(scale.filter((_, j) => j !== i))} className="rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger" aria-label="Устгах"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setScale([...scale, { min: 0, letter: '', point: 0 }])}>Мөр нэмэх</Button>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Аюулгүй байдал" actions={<Button size="sm" variant="primary" icon={<Save className="h-4 w-4" />} loading={save.isPending} onClick={() => submit('security')}>Хадгалах</Button>}>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#1E4B8F]" checked={form.security.require_staff_mfa} onChange={(e) => setForm({ ...form, security: { ...form.security, require_staff_mfa: e.target.checked } })} />
              <span>
                <span className="font-medium">Ажилтанд 2FA заавал</span>
                <span className="block text-[13px] text-muted">Админ, удирдлага, сургалт, санхүүгийн ажилтан 2FA-гүйгээр системийн өгөгдөлд хандахгүй. Асаахаас өмнө өөрөө 2FA тохируулсан эсэхээ шалгаарай (Аюулгүй байдал хуудас).</span>
              </span>
            </label>

            <label className="mt-4 flex items-start gap-3 border-t border-line pt-4 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#1E4B8F]" checked={form.security.single_session} onChange={(e) => setForm({ ...form, security: { ...form.security, single_session: e.target.checked } })} />
              <span>
                <span className="font-medium">Платформ тус бүрт нэг нэвтрэлт</span>
                <span className="block text-[13px] text-muted">
                  Web дээр нэг, mobile дээр нэг session зэрэг ажиллана. Шинээр нэвтрэхэд өмнөх төхөөрөмж дараагийн хүсэлт дээрээ гарна.
                  Компьютер дээр дүн оруулж, зэрэг утсаараа ирц бүртгэх боломж хэвээр үлдэнэ.
                </span>
              </span>
            </label>
            {form.security.single_session && (
              <div className="mt-3 pl-7">
                <p className="mb-1.5 text-[13px] text-ink-soft">Хэнд үйлчлэх (юу ч сонгоогүй бол бүх эрхэд)</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => {
                    const on = form.security.single_session_roles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            security: { ...form.security, single_session_roles: on ? form.security.single_session_roles.filter((x) => x !== r) : [...form.security.single_session_roles, r] },
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-[13px] ${on ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-line-strong'}`}
                      >
                        {ROLE_LABEL[r]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Санхүүгийн автомат сануулга" actions={<Button size="sm" variant="primary" icon={<Save className="h-4 w-4" />} loading={save.isPending} onClick={() => submit('finance')}>Хадгалах</Button>}>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[#1E4B8F]" checked={form.finance.auto_remind} onChange={(e) => setForm({ ...form, finance: { ...form.finance, auto_remind: e.target.checked } })} />
                Автомат сануулга (10:00–18:00)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Хугацаанаас өмнө (хоног)" type="number" min={1} max={14} value={form.finance.remind_days_before} onChange={(e) => setForm({ ...form, finance: { ...form.finance, remind_days_before: Number(e.target.value) } })} />
                <Input label="Хэтэрсэн бол давтах (хоног)" type="number" min={1} max={30} value={form.finance.overdue_repeat_days} onChange={(e) => setForm({ ...form, finance: { ...form.finance, overdue_repeat_days: Number(e.target.value) } })} />
              </div>
            </div>
          </Panel>

          <Panel title="Ерөнхий" actions={<Button size="sm" variant="primary" icon={<Save className="h-4 w-4" />} loading={save.isPending} onClick={() => submit('general')}>Хадгалах</Button>}>
            <div className="flex flex-col gap-3">
              <Input label="Байгууллагын нэр" value={form.general.university_name} onChange={(e) => setForm({ ...form, general: { ...form.general, university_name: e.target.value } })} />
              <Input label="Сургалтын албаны утас" value={form.general.academic_office_phone ?? ''} onChange={(e) => setForm({ ...form, general: { ...form.general, academic_office_phone: e.target.value || null } })} />
              <Input label="Тусламжийн и-мэйл" type="email" value={form.general.support_email ?? ''} onChange={(e) => setForm({ ...form, general: { ...form.general, support_email: e.target.value || null } })} />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
