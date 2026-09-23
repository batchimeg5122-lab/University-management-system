import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { exportNodeToPdf } from '@/lib/pdf';
import type { Enrollment } from '@/types/models';
import { groupTranscript, TranscriptSheet, type TranscriptStudent } from './TranscriptSheet';

/**
 * "Дүнгийн хуудас (PDF)" товч.
 * Хуудсыг дэлгэцээс гадна (off-screen) зурж PDF болгоно — хэрэглэгчид харагдахгүй.
 */
export function TranscriptButton({ student, enrollments, disabled }: { student: TranscriptStudent | null | undefined; enrollments: Enrollment[] | undefined; disabled?: boolean }) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);
  const count = enrollments ? groupTranscript(enrollments).count : 0;

  const run = async () => {
    if (!student || !enrollments) return;
    if (!count) return toast.error('Баталгаажсан дүн алга тул дүнгийн хуудас гаргах боломжгүй.');
    setRendering(true);
    // DOM-д зурагдахыг хүлээнэ
    await new Promise((r) => setTimeout(r, 120));
    try {
      if (!ref.current) throw new Error('Хуудас бэлэн биш');
      await exportNodeToPdf(ref.current, `transcript-${student.student_code}`, { title: `Дүнгийн хуудас ${student.student_code}`, subject: student.full_name });
      toast.success('Дүнгийн хуудас татагдлаа');
    } catch (err) {
      toast.error(`PDF үүсгэж чадсангүй: ${(err as Error).message}`);
    } finally {
      setRendering(false);
    }
  };

  return (
    <>
      <Button icon={<FileText className="h-4 w-4" />} loading={rendering} disabled={disabled || !student || !enrollments} onClick={run}>
        Дүнгийн хуудас
      </Button>
      {rendering && student && enrollments &&
        createPortal(
          <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0 }}>
            <TranscriptSheet ref={ref} student={student} enrollments={enrollments} />
          </div>,
          document.body,
        )}
    </>
  );
}
