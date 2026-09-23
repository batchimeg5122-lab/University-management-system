import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Panel, Spinner } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage, get } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { STUDENT_STATUS_LABEL } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { StudentStatus } from '@/types/models';

interface CardVerifyResult {
  valid: boolean;
  reason: 'ok' | 'invalid' | 'expired_qr' | 'inactive' | 'expired_card';
  checked_at: string;
  card: {
    full_name: string;
    student_code: string;
    program_name: string | null;
    department_name: string | null;
    school_name: string | null;
    class_name: string | null;
    year_level: number | null;
    status: StudentStatus;
    avatar_url: string | null;
    semester: string | null;
    valid_until: string | null;
  } | null;
}

const REASON: Record<CardVerifyResult['reason'], string> = {
  ok: 'Оюутны үнэмлэх хүчинтэй',
  invalid: 'Хүчингүй QR код — үнэмлэх баталгаажсангүй',
  expired_qr: 'QR кодын хугацаа дууссан. Оюутнаас апп-аа дахин нээлгэнэ үү.',
  inactive: 'Оюутан одоогоор суралцаагүй байна (идэвхгүй)',
  expired_card: 'Үнэмлэхийн хүчинтэй хугацаа дууссан',
};

/**
 * Нээлттэй хуудас: хамгаалагч / номын сангийн ажилтан утасны камераар
 * оюутны апп дээрх QR-ыг уншуулахад энэ хуудас нээгдэнэ.
 */
export default function VerifyStudentCardPage() {
  useDocumentTitle('Оюутны үнэмлэх шалгах');
  const { token = '' } = useParams();
  const [result, setResult] = useState<CardVerifyResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get<CardVerifyResult>(`/student-card/verify/${encodeURIComponent(token)}`)
      .then(setResult)
      .catch((err) => setError(errorMessage(err)));
  }, [token]);

  const c = result?.card;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-5 flex items-center gap-3">
        <img src={BRAND.logo} alt="" className="h-10 w-10 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        <div>
          <p className="font-semibold text-ink">{BRAND.name}</p>
          <p className="text-[13px] text-muted">Цахим оюутны үнэмлэх шалгах</p>
        </div>
      </div>

      <Panel>
        {!result && !error && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {result && (
          <>
            <p
              className={`flex items-center gap-2 rounded-field px-3 py-3 text-[15px] font-semibold ${
                result.valid ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
              }`}
            >
              {result.valid ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
              {REASON[result.reason]}
            </p>

            {c && (
              <div className="mt-5">
                <div className="flex items-center gap-4">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-24 w-20 rounded-lg border border-line object-cover" />
                  ) : (
                    <div className="flex h-24 w-20 items-center justify-center rounded-lg bg-accent-soft text-xl font-semibold text-accent">
                      {c.full_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-ink">{c.full_name}</p>
                    <p className="num text-sm tracking-wider text-muted">{c.student_code}</p>
                  </div>
                </div>

                <dl className="mt-4 text-sm">
                  {[
                    ['Сургууль', c.school_name],
                    ['Тэнхим', c.department_name],
                    ['Хөтөлбөр', c.program_name],
                    ['Анги', c.class_name],
                    ['Курс', c.year_level ? `${c.year_level}-р курс` : null],
                    ['Төлөв', STUDENT_STATUS_LABEL[c.status] ?? c.status],
                    ['Хүчинтэй', c.valid_until ? `${formatDate(c.valid_until)} хүртэл` : '—'],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-6 border-b border-line py-2.5 last:border-0">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right font-medium text-ink">{v ?? '—'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <p className="mt-4 flex items-center gap-1.5 text-xs text-faint">
              <Clock className="h-3.5 w-3.5" />
              Шалгасан: {new Date(result.checked_at).toLocaleString('mn-MN')}
            </p>
          </>
        )}
      </Panel>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-faint">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Зураг, нэр нь үнэмлэх үзүүлж буй хүнтэй таарч байгаа эсэхийг шалгана уу.
      </p>
    </div>
  );
}
