import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, Input, Panel } from '@/components/ui';
import { certificatesApi, type VerifyResult } from '@/features/certificates/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { formatDate } from '@/lib/utils';

/** Нэвтрэхгүйгээр тодорхойлолтын үнэн эсэхийг шалгах нээлттэй хуудас */
export default function VerifyCertificatePage() {
  useDocumentTitle('Тодорхойлолт шалгах');
  const { code: codeParam } = useParams();
  const [code, setCode] = useState(codeParam ?? '');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async (value: string) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await certificatesApi.verify(value.trim()));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length >= 4) void check(code);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-12">
      <div className="mb-6 flex items-center gap-3">
        <img src={BRAND.logo} alt="" className="h-10 w-10 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        <div>
          <p className="font-semibold text-ink">{BRAND.name}</p>
          <p className="text-[13px] text-muted">Тодорхойлолт шалгах</p>
        </div>
      </div>

      <Panel>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Баталгаажуулах код"
            placeholder="Жишээ нь: K7M2QP4X"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            wrapperClassName="flex-1"
            className="num tracking-[0.2em]"
          />
          <Button type="submit" variant="primary" loading={loading} disabled={code.trim().length < 4}>
            Шалгах
          </Button>
        </form>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {result && (
          <div className="mt-5">
            <p
              className={`flex items-center gap-2 rounded-field px-3 py-2.5 text-sm font-medium ${
                result.is_valid ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
              }`}
            >
              {result.is_valid ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {result.is_valid ? 'Тодорхойлолт хүчинтэй' : result.revoked ? 'Тодорхойлолт хүчингүй болсон' : 'Хүчинтэй хугацаа дууссан'}
            </p>

            <dl className="mt-4 text-sm">
              {[
                ['Дугаар', result.number],
                ['Овог нэр', result.full_name],
                ['Оюутны код', result.student_code],
                ['Мэргэжил', result.program_name],
                ['Анги', result.class_name],
                ['Олгосон', formatDate(result.issued_at)],
                ['Хүчинтэй', result.valid_until ? `${formatDate(result.valid_until)} хүртэл` : 'Хугацаагүй'],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-6 border-b border-line py-2.5 last:border-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Panel>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-faint">
        <ShieldCheck className="h-3.5 w-3.5" />
        Энэ хуудас зөвхөн тодорхойлолтын үнэн эсэхийг шалгана, өөр мэдээлэл харуулахгүй.
      </p>
    </div>
  );
}
