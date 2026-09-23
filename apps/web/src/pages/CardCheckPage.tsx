import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CameraOff, CheckCircle2, Keyboard, MapPin, ShieldAlert, XCircle } from 'lucide-react';
import { Badge, Button, Input, PageHeader, Panel, StatStrip } from '@/components/ui';
import { cardCheckApi, REASON_TEXT, type CardCheckResult } from '@/features/cardcheck/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';

/** Амжилт / алдааны дуу (WebAudio — файл хэрэггүй) */
function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220;
    o.type = ok ? 'sine' : 'square';
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.15 : 0.45));
  } catch {
    /* дуу дэмжигдэхгүй */
  }
}

/**
 * Үнэмлэх шалгах самбар — номын сан, хамгаалалтын ширээнд.
 * Вэбкамераар QR уншуулна, эсвэл USB QR уншигч / гараар код оруулна. Шалгалт бүр түүхэнд хадгалагдана.
 */
export default function CardCheckPage() {
  useDocumentTitle('Үнэмлэх шалгах');
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });
  const busyRef = useRef(false);

  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manual, setManual] = useState('');
  const [location, setLocation] = useState(() => localStorage.getItem('card-check-location') ?? 'Номын сан');
  const [result, setResult] = useState<CardCheckResult | null>(null);
  const [error, setError] = useState('');

  const history = useQuery({ queryKey: ['card-checks'], queryFn: cardCheckApi.history, refetchInterval: 20_000 });

  useEffect(() => localStorage.setItem('card-check-location', location), [location]);

  const check = useCallback(
    async (value: string) => {
      const v = value.trim();
      if (!v || busyRef.current) return;
      // Нэг кодыг 4 секундэд давтан шалгахгүй
      if (lastRef.current.value === v && Date.now() - lastRef.current.at < 4000) return;
      lastRef.current = { value: v, at: Date.now() };
      busyRef.current = true;
      setError('');
      try {
        const res = await cardCheckApi.check(v, location);
        setResult(res);
        beep(res.valid);
        qc.invalidateQueries({ queryKey: ['card-checks'] });
      } catch (err) {
        setError(errorMessage(err));
        beep(false);
      } finally {
        busyRef.current = false;
      }
    },
    [location, qc],
  );

  // 10 секундын дараа үр дүнг цэвэрлэнэ
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 10_000);
    return () => clearTimeout(t);
  }, [result]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera(false);
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera(true);
    } catch (err) {
      const e = err as DOMException;
      setCameraError(
        e.name === 'NotAllowedError'
          ? 'Камерын зөвшөөрөл өгөөгүй байна. Хаягийн мөрний 🔒 дүрс → Camera → Allow.'
          : !window.isSecureContext
            ? 'Камер зөвхөн https эсвэл localhost хаяг дээр ажиллана.'
            : `Камер нээж чадсангүй: ${e.message}`,
      );
    }
  };

  // Камерын зургаас QR уншина (jsQR — бүх хөтөч дээр ажиллана)
  useEffect(() => {
    if (!camera) return;
    let raf = 0;
    let stopped = false;
    let jsQR: typeof import('jsqr').default | null = null;
    void import('jsqr').then((m) => (jsQR = m.default));

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && jsQR && video.readyState === video.HAVE_ENOUGH_DATA) {
        const w = 480;
        const h = Math.round((video.videoHeight / video.videoWidth) * w) || 360;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (code?.data) void check(code.data);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [camera, check]);

  useEffect(() => () => stopCamera(), []);

  const c = result?.card;
  const today = history.data?.today;

  return (
    <>
      <PageHeader title="Цахим үнэмлэх шалгах" description="Оюутны mobile app дээрх QR-ыг камераар уншуулна. USB QR уншигч эсвэл гараар код оруулж болно." />

      <StatStrip
        className="mb-6"
        loading={history.isLoading}
        items={[
          { label: 'Өнөөдөр шалгасан', value: today?.total ?? 0 },
          { label: 'Хүчинтэй', value: today?.valid ?? 0, tone: 'success' },
          { label: 'Татгалзсан', value: today?.invalid ?? 0, tone: (today?.invalid ?? 0) > 0 ? 'danger' : 'default' },
          { label: 'Байршил', value: location || '—' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Уншуулах"
          actions={
            camera ? (
              <Button size="sm" icon={<CameraOff className="h-4 w-4" />} onClick={stopCamera}>Камер унтраах</Button>
            ) : (
              <Button size="sm" variant="primary" icon={<Camera className="h-4 w-4" />} onClick={startCamera}>Камер асаах</Button>
            )
          }
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-field bg-ink">
            <video ref={videoRef} muted playsInline className={camera ? 'h-full w-full object-cover' : 'hidden'} />
            {camera ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-2/3 w-1/2 rounded-xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-white/70">
                <Camera className="h-10 w-10" />
                <p className="text-sm">"Камер асаах" дарна уу</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          {cameraError && <p className="mt-3 rounded-field bg-danger-soft px-3 py-2 text-[13px] text-danger">{cameraError}</p>}

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void check(manual);
              setManual('');
            }}
          >
            <Input
              wrapperClassName="flex-1"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="QR холбоос эсвэл код (USB уншигч энд бичнэ)"
              aria-label="Код оруулах"
            />
            <Button type="submit" icon={<Keyboard className="h-4 w-4" />}>Шалгах</Button>
          </form>
          <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
            <MapPin className="h-4 w-4" />
            <input value={location} onChange={(e) => setLocation(e.target.value.slice(0, 100))} className="field h-8 flex-1 text-[13px]" aria-label="Байршил" placeholder="Байршил (Номын сан, А байрны хаалга...)" />
          </div>
        </Panel>

        <Panel title="Үр дүн">
          {error && (
            <p className="flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          {!result && !error && <p className="py-16 text-center text-sm text-muted">QR уншуулахыг хүлээж байна…</p>}
          {result && (
            <div className={`rounded-box border-2 p-5 ${result.valid ? 'border-success bg-success-soft/40' : 'border-danger bg-danger-soft/40'}`}>
              <p className={`flex items-center gap-2 text-xl font-semibold ${result.valid ? 'text-success' : 'text-danger'}`}>
                {result.valid ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
                {result.valid ? 'ЗӨВШӨӨРНӨ' : 'ТАТГАЛЗАНА'}
              </p>
              <p className="mt-1 text-sm text-muted">{REASON_TEXT[result.reason] ?? result.reason}</p>
              {c && (
                <div className="mt-4 flex gap-4">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-36 w-28 rounded-lg border border-line object-cover" />
                  ) : (
                    <div className="flex h-36 w-28 items-center justify-center rounded-lg bg-white text-3xl font-semibold text-accent">{c.first_name.charAt(0)}</div>
                  )}
                  <dl className="flex-1 text-sm">
                    <dt className="text-muted">{c.last_name}</dt>
                    <dd className="text-2xl font-semibold">{c.first_name}</dd>
                    <dd className="num mt-1 tracking-wider text-accent">{c.student_code}</dd>
                    <dd className="mt-3">{c.program_name}</dd>
                    <dd className="text-muted">{c.class_name}{c.year_level ? ` · ${c.year_level}-р курс` : ''}</dd>
                    <dd className="mt-2 text-[12px] text-muted">Хүчинтэй: {c.valid_until ? formatDate(c.valid_until) : '—'}</dd>
                  </dl>
                </div>
              )}
              {c && !c.avatar_url && <p className="mt-3 text-[12px] text-warn">Оюутан профайл зураг оруулаагүй — өөр бичиг баримтаар танина уу.</p>}
            </div>
          )}
        </Panel>
      </div>

      <Panel flush title="Сүүлийн шалгалтууд" className="mt-6">
        <ul className="divide-y divide-line">
          {(history.data?.rows ?? []).slice(0, 30).map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              {r.valid ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-danger" />}
              <span className="num w-36 shrink-0 text-muted">{formatDateTime(r.created_at)}</span>
              <span className="flex-1 truncate font-medium">{r.student_name ?? 'Тодорхойгүй'}</span>
              <span className="num hidden text-muted sm:inline">{r.student_code}</span>
              <Badge tone={r.valid ? 'success' : 'danger'}>{REASON_TEXT[r.reason] ?? r.reason}</Badge>
              <span className="hidden w-32 truncate text-right text-[12px] text-faint md:inline">{r.location}</span>
            </li>
          ))}
          {!history.data?.rows.length && <li className="px-5 py-8 text-center text-sm text-muted">Шалгасан түүх алга</li>}
        </ul>
      </Panel>
    </>
  );
}
