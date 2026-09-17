import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClasses } from '@/features/classes/hooks';
import { CredentialsDialog, type Credentials } from '@/features/users/components/CredentialsDialog';
import { useFormState } from '@/hooks/useFormState';
import { errorMessage } from '@/lib/api';
import { STUDENT_STATUS_LABEL } from '@/lib/constants';
import type { StudentView } from '@/types/models';
import { useSaveStudent } from '../hooks';

const empty = {
  last_name: '', first_name: '', student_code: '', register_number: '', email: '', phone: '',
  class_id: '', enrollment_year: String(new Date().getFullYear()), status: 'active', password: '',
};

export function StudentFormModal({ open, onClose, student }: { open: boolean; onClose: () => void; student?: StudentView | null }) {
  const toast = useToast();
  const { data: classes } = useClasses();
  const save = useSaveStudent();
  const { values, bind, reset } = useFormState(empty);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  useEffect(() => {
    if (!open) return;
    reset(
      student
        ? {
            ...empty,
            last_name: student.last_name, first_name: student.first_name, student_code: student.student_code,
            register_number: student.register_number ?? '', email: student.email ?? '', phone: student.phone ?? '',
            class_id: student.class_id ?? '', enrollment_year: String(student.enrollment_year ?? ''), status: student.status,
          }
        : empty,
    );
  }, [open, student, reset]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!student && values.password && values.password.length < 8) {
      toast.error('Нууц үг хамгийн багадаа 8 тэмдэгт байна.');
      return;
    }
    try {
      if (student) {
        await save.mutateAsync({
          id: student.id,
          last_name: values.last_name, first_name: values.first_name, phone: values.phone,
          register_number: values.register_number, class_id: values.class_id,
          enrollment_year: Number(values.enrollment_year), status: values.status as StudentView['status'],
        });
        toast.success('Оюутны мэдээлэл шинэчлэгдлээ');
        onClose();
        return;
      }

      const created = await save.mutateAsync({
        last_name: values.last_name, first_name: values.first_name, student_code: values.student_code.trim().toUpperCase(),
        register_number: values.register_number, email: values.email.trim(), phone: values.phone,
        class_id: values.class_id, enrollment_year: Number(values.enrollment_year),
        password: values.password || undefined,
      });
      toast.success('Оюутан бүртгэгдлээ');
      onClose();
      setCredentials({
        fullName: created.full_name,
        loginIds: [
          { label: 'Оюутны код', value: created.student_code },
          ...(created.email ? [{ label: 'И-мэйл', value: created.email }] : []),
        ],
        password: created.initial_password ?? null,
      });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={student ? 'Оюутны мэдээлэл засах' : 'Шинэ оюутан бүртгэх'}
        description={student ? student.student_code : 'Бүртгэсний дараа ангийн хичээлүүдэд автоматаар хамрагдана.'}
        footer={
          <>
            <Button onClick={onClose}>Болих</Button>
            <Button variant="primary" type="submit" form="student-form" loading={save.isPending}>{student ? 'Хадгалах' : 'Бүртгэх'}</Button>
          </>
        }
      >
        <form id="student-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Овог" required {...bind('last_name')} />
          <Input label="Нэр" required {...bind('first_name')} />
          <Input label="Оюутны код" required placeholder="ST26SE001" {...bind('student_code')} disabled={!!student} />
          <Input label="Регистрийн дугаар" placeholder="УБ01234567" {...bind('register_number')} />
          <Input
            label="И-мэйл"
            type="email"
            {...bind('email')}
            disabled={!!student}
            hint={student ? undefined : 'Хоосон бол оюутны кодоор нэвтрэх хаяг автоматаар үүснэ'}
          />
          <Input label="Утас" inputMode="tel" {...bind('phone')} />
          <Select label="Анги" required placeholder="Сонгох" options={(classes ?? []).map((c) => ({ value: c.id, label: `${c.code}, ${c.program_name}` }))} {...bind('class_id')} />
          <Input label="Элссэн он" type="number" min={2000} max={2100} {...bind('enrollment_year')} />
          {student ? (
            <Select label="Төлөв" wrapperClassName="sm:col-span-2" options={Object.entries(STUDENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))} {...bind('status')} />
          ) : (
            <Input
              label="Анхны нууц үг"
              type="text"
              autoComplete="new-password"
              wrapperClassName="sm:col-span-2"
              placeholder="Хоосон бол автоматаар үүснэ"
              hint="Бүртгэсний дараа нэвтрэх мэдээллийг нэг удаа харуулна"
              {...bind('password')}
            />
          )}
        </form>
      </Modal>

      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </>
  );
}
