import { forwardRef } from 'react';
import { BRAND } from '@/lib/brand';
import { formatDate } from '@/lib/utils';
import type { StudentCertificate } from '@/types/models';
import { CERT_PURPOSE } from '../api';

const STATUS_TEXT: Record<string, string> = {
  active: 'суралцаж байгаа',
  leave: 'чөлөө авсан',
  graduated: 'төгссөн',
  withdrawn: 'сургуулиас гарсан',
  suspended: 'түдгэлзсэн',
};

/**
 * Хэвлэх A4 хуудас. `print:` классууд нь хэвлэхэд зөвхөн энэ хэсгийг үлдээнэ.
 */
export const CertificateSheet = forwardRef<HTMLDivElement, { certificate: StudentCertificate; verifyUrl: string }>(
  ({ certificate, verifyUrl }, ref) => {
    const s = certificate.snapshot;
    const status = STATUS_TEXT[s.status] ?? 'суралцаж байгаа';

    const rows: [string, string | number | null][] = [
      ['Оюутны код', s.student_code],
      ['Регистрийн дугаар', s.register_number],
      ['Сургууль, тэнхим', s.department_name],
      ['Мэргэжил, хөтөлбөр', s.program_name],
      ['Анги', s.class_name],
      ['Курс', s.year_level ? `${s.year_level}-р курс` : null],
      ['Элссэн он', s.enrollment_year],
      ['Суралцах төлөв', STATUS_TEXT[s.status] ?? s.status],
      ['Судалж буй улирал', s.semester],
      ...(certificate.include_gpa
        ? ([
            ['Голч дүн (GPA)', s.gpa !== null ? s.gpa.toFixed(2) : '—'],
            ['Цуглуулсан кредит', s.earned_credits ?? '—'],
          ] as [string, string | number | null][])
        : []),
    ];

    return (
      <div ref={ref} className="mx-auto w-full max-w-[794px] bg-white px-10 py-10 text-ink print:max-w-none print:px-0 print:py-0">
        {/* Толгой */}
        <header className="flex items-start justify-between gap-6 border-b-2 border-accent pb-5">
          <div className="flex items-center gap-3">
            <img src={BRAND.logo} alt="" className="h-14 w-14 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            <div>
              <p className="text-[17px] font-semibold leading-tight">{BRAND.name}</p>
              <p className="text-[12.5px] text-muted">Сургалтын алба</p>
            </div>
          </div>
          <div className="text-right text-[12.5px] leading-relaxed text-muted">
            <p className="num">Дугаар: {certificate.number}</p>
            <p className="num">Огноо: {formatDate(certificate.issued_at)}</p>
            {certificate.valid_until && <p className="num">Хүчинтэй: {formatDate(certificate.valid_until)} хүртэл</p>}
          </div>
        </header>

        <h1 className="mt-10 text-center text-[22px] font-semibold tracking-[0.08em]">ТОДОРХОЙЛОЛТ</h1>

        <p className="mt-8 text-[15px] leading-[1.9]">
          Иргэн <span className="font-semibold">{s.full_name}</span> нь {BRAND.nameGenitive}
          {s.department_name ? ` ${s.department_name}ийн` : ''} <span className="font-semibold">{s.program_name}</span> мэргэжлийн
          {s.year_level ? ` ${s.year_level}-р курсын` : ''} {s.class_name ? `${s.class_name} ангид` : ''}{' '}
          {s.enrollment_year ? `${s.enrollment_year} оноос хойш ` : ''}
          <span className="font-semibold">{status}</span> болохыг тодорхойлов.
        </p>

        <table className="mt-8 w-full border-collapse text-[13.5px]">
          <tbody>
            {rows
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([label, value]) => (
                <tr key={label} className="border-b border-line">
                  <th scope="row" className="w-1/3 py-2 text-left font-normal text-muted">{label}</th>
                  <td className="num py-2 font-medium">{value}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <p className="mt-6 text-[13.5px] text-muted">
          Зориулалт: <span className="text-ink">{CERT_PURPOSE[certificate.purpose] ?? 'Бусад'}</span>
          {certificate.purpose_note ? `, ${certificate.purpose_note}` : ''}
        </p>

        {/* Хөл */}
        <footer className="mt-12 flex items-end justify-between gap-8">
          <div className="max-w-[300px] rounded-md border border-line p-3 text-[11.5px] leading-relaxed text-muted">
            <p className="font-medium text-ink">Баталгаажуулах код</p>
            <p className="num mt-1 text-[18px] font-semibold tracking-[0.18em] text-accent">{certificate.verify_code}</p>
            <p className="mt-1.5 break-all">Энэ тодорхойлолтын үнэн эсэхийг {verifyUrl} хаягаар шалгана уу.</p>
          </div>
          <div className="text-center text-[13px]">
            <p className="mb-10 text-muted">Сургалтын албаны дарга</p>
            <p className="w-56 border-t border-ink pt-1.5">/ гарын үсэг, тамга /</p>
          </div>
        </footer>

        {certificate.revoked_at && (
          <p className="mt-8 rounded-md border border-danger/30 bg-danger-soft px-4 py-2 text-center text-[13px] font-medium text-danger">
            Энэ тодорхойлолт {formatDate(certificate.revoked_at)}-нд хүчингүй болсон.
          </p>
        )}
      </div>
    );
  },
);
CertificateSheet.displayName = 'CertificateSheet';
