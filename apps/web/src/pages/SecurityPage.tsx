import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, KeyRound, LogOut, Monitor, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Input, PageHeader, Panel } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { del, get } from '@/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';

interface ActiveSession {
  platform: 'web' | 'mobile';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
}

interface LoginRow {
  id: string;
  platform: 'web' | 'mobile';
  aal: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const browserOf = (ua: string | null) => {
  if (!ua) return '—';
  const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /okhttp|Expo|CFNetwork/i.test(ua) ? 'Mobile апп' : 'Бусад';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [b, os].filter(Boolean).join(' · ');
};

/** Хэрэглэгч бүрийн аюулгүй байдал: 2FA (TOTP), нууц үг, бусад session, нэвтрэлтийн түүх */
export default function SecurityPage() {
  useDocumentTitle('Аюулгүй байдал');
  const toast = useToast();
  const { session } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const history = useQuery({ queryKey: ['login-history', 'me'], queryFn: () => get<LoginRow[]>('/auth/login-history'), enabled: !env.useMock });
  const qc = useQueryClient();
  const sessions = useQuery({
    queryKey: ['sessions', 'me'],
    queryFn: () => get<{ current: { platform: string }; enforced: boolean; sessions: ActiveSession[] }>('/auth/sessions'),
    enabled: !env.useMock,
  });

  const loadFactors = async () => {
    if (!supabase) return setLoadingFactors(false);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactorId(data?.totp?.find((f) => f.status === 'verified')?.id ?? null);
    setLoadingFactors(false);
  };
  useEffect(() => {
    void loadFactors();
  }, []);

  const startEnroll = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      // Өмнө дуусаагүй (unverified) factor байвал цэвэрлэнэ
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Их Засаг ${new Date().toISOString().slice(0, 10)}` });
      if (error) throw error;
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      toast.error(`2FA эхлүүлж чадсангүй: ${(err as Error).message}. Supabase → Authentication → MFA хэсэгт TOTP идэвхтэй эсэхийг шалгана уу.`);
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!supabase || !enroll) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.replace(/\s/g, '') });
    setBusy(false);
    if (error) return toast.error('Код буруу байна. Апп дахь шинэ кодыг оруулна уу.');
    toast.success('2FA идэвхжлээ. Дараагийн нэвтрэлтээс код асууна.');
    setEnroll(null);
    setCode('');
    void loadFactors();
  };

  const disable = async () => {
    if (!supabase || !factorId) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    setConfirmOff(false);
    if (error) return toast.error(error.message);
    toast.success('2FA унтарлаа');
    void loadFactors();
  };

  const changePassword = async () => {
    if (!supabase) return;
    if (pw.next.length < 8) return toast.error('Нууц үг хамгийн багадаа 8 тэмдэгт.');
    if (pw.next !== pw.confirm) return toast.error('Нууц үг таарахгүй байна.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPw({ next: '', confirm: '' });
    toast.success('Нууц үг солигдлоо');
  };

  const signOutOthers = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) toast.error(error.message);
    else toast.success('Бусад бүх төхөөрөмжөөс гаргалаа');
  };

  return (
    <>
      <PageHeader title="Аюулгүй байдал" description={`${session?.user.full_name ?? ''} — нэвтрэлт, хоёр шатлалт баталгаажуулалт`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Хоёр шатлалт баталгаажуулалт (2FA)" description="Нууц үгээс гадна утасны апп дахь 6 оронтой кодыг асууна.">
          {loadingFactors ? null : factorId ? (
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-success" />
              <div className="flex-1">
                <p className="font-medium text-success">Идэвхтэй</p>
                <p className="text-[13px] text-muted">Нэвтрэх бүрт баталгаажуулах код асууна.</p>
              </div>
              <Button variant="ghost" icon={<ShieldOff className="h-4 w-4" />} onClick={() => setConfirmOff(true)}>Унтраах</Button>
            </div>
          ) : enroll ? (
            <div className="flex flex-col gap-4">
              <ol className="list-decimal pl-5 text-[13px] leading-relaxed text-ink-soft">
                <li>Утсандаа <b>Google Authenticator</b> эсвэл <b>Microsoft Authenticator</b> суулгана.</li>
                <li>Апп-аар доорх QR кодыг уншуулна (эсвэл нууц түлхүүрийг гараар оруулна).</li>
                <li>Апп-д гарсан 6 оронтой кодыг оруулна.</li>
              </ol>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <img src={enroll.qr} alt="2FA QR код" className="h-44 w-44 rounded-lg border border-line bg-white p-2" />
                <div className="min-w-0">
                  <p className="text-[12px] text-muted">Нууц түлхүүр</p>
                  <code className="num block break-all rounded bg-paper px-2 py-1 text-[13px]">{enroll.secret}</code>
                </div>
              </div>
              <div className="flex gap-2">
                <Input wrapperClassName="flex-1" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="num text-center tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))} />
                <Button variant="primary" loading={busy} disabled={code.length !== 6} onClick={confirmEnroll}>Баталгаажуулах</Button>
              </div>
              <button className="self-start text-[13px] text-muted hover:text-ink" onClick={() => setEnroll(null)}>Болих</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ShieldOff className="h-8 w-8 text-faint" />
              <div className="flex-1">
                <p className="font-medium">Идэвхгүй</p>
                <p className="text-[13px] text-muted">Дүн, санхүүгийн эрхтэй ажилтанд зайлшгүй зөвлөнө.</p>
              </div>
              <Button variant="primary" icon={<KeyRound className="h-4 w-4" />} loading={busy} onClick={startEnroll} disabled={env.useMock}>Идэвхжүүлэх</Button>
            </div>
          )}
        </Panel>

        <Panel title="Нууц үг солих">
          <div className="flex flex-col gap-3">
            <Input label="Шинэ нууц үг" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} hint="Хамгийн багадаа 8 тэмдэгт" />
            <Input label="Давтах" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" loading={busy} disabled={!pw.next || env.useMock} onClick={changePassword}>Солих</Button>
              <Button icon={<LogOut className="h-4 w-4" />} onClick={signOutOthers} disabled={env.useMock}>Бусад төхөөрөмжөөс гаргах</Button>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Идэвхтэй нэвтрэлт"
        className="mt-6"
        description={
          sessions.data?.enforced
            ? 'Байгууллагын тохиргоогоор платформ тус бүрт нэг л нэвтрэлт байна: web дээр нэг, mobile дээр нэг. Шинээр нэвтрэхэд өмнөх нь автоматаар хаагдана.'
            : 'Одоо ашиглаж буй төхөөрөмжүүд.'
        }
      >
        <ul className="flex flex-col gap-3">
          {(sessions.data?.sessions ?? []).map((s) => (
            <li key={s.platform} className="flex items-center gap-3 rounded-field border border-line px-3 py-2.5">
              {s.platform === 'mobile' ? <Smartphone className="h-5 w-5 text-muted" /> : <Monitor className="h-5 w-5 text-muted" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {s.platform === 'mobile' ? 'Mobile апп' : 'Web'}
                  {sessions.data?.current.platform === s.platform && <Badge tone="success" className="ml-2">Энэ төхөөрөмж</Badge>}
                </p>
                <p className="text-[12px] text-muted">
                  {browserOf(s.user_agent)} · {s.ip_address ?? '—'} · сүүлд {formatDateTime(s.last_seen_at)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await del(`/auth/sessions/${s.platform}`);
                  await qc.invalidateQueries({ queryKey: ['sessions', 'me'] });
                  toast.success(s.platform === sessions.data?.current.platform ? 'Энэ төхөөрөмжийн бүртгэл цэвэрлэгдлээ' : 'Тухайн нэвтрэлт хаагдлаа');
                }}
              >
                Гаргах
              </Button>
            </li>
          ))}
          {!sessions.data?.sessions.length && <li className="py-4 text-center text-sm text-muted">Бүртгэгдсэн идэвхтэй нэвтрэлт алга</li>}
        </ul>
      </Panel>

      <Panel flush title="Сүүлийн нэвтрэлтүүд" className="mt-6" description="Танихгүй нэвтрэлт харагдвал нууц үгээ даруй солиод бусад төхөөрөмжөөс гарна уу.">
        <ul className="divide-y divide-line">
          {(history.data ?? []).map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              {h.platform === 'mobile' ? <Smartphone className="h-4 w-4 text-muted" /> : <Monitor className="h-4 w-4 text-muted" />}
              <span className="num w-40 shrink-0 text-muted">{formatDateTime(h.created_at)}</span>
              <span className="flex-1 truncate">{browserOf(h.user_agent)}</span>
              <span className="num hidden text-[12px] text-faint sm:inline">{h.ip_address}</span>
              {h.aal === 'aal2' ? <Badge tone="success"><CheckCircle2 className="mr-1 inline h-3 w-3" />2FA</Badge> : <Badge>Нууц үг</Badge>}
            </li>
          ))}
          {!history.data?.length && <li className="px-5 py-6 text-center text-sm text-muted">Түүх алга</li>}
        </ul>
      </Panel>

      <ConfirmDialog
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        onConfirm={disable}
        loading={busy}
        tone="danger"
        title="2FA унтраах уу?"
        description="Зөвхөн нууц үгээр нэвтрэх болно. Байгууллагын тохиргоонд 2FA заавал бол зарим хуудас хаагдана."
        confirmLabel="Унтраах"
      />
    </>
  );
}
