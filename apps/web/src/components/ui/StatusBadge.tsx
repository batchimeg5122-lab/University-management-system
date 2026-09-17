import {
  ATTENDANCE_LABEL, COURSE_STATUS_LABEL, GRADE_STATUS_LABEL, INVOICE_STATUS_LABEL, STUDENT_STATUS_LABEL, USER_STATUS_LABEL,
} from '@/lib/constants';
import type { AttendanceStatus, CourseStatus, GradeStatus, InvoiceStatus, StudentStatus, UserStatus } from '@/types/models';
import { Badge, type Tone } from './Badge';

const invoiceTone: Record<InvoiceStatus, Tone> = { pending: 'neutral', partial: 'warn', paid: 'success', cancelled: 'neutral', overdue: 'danger' };
const gradeTone: Record<GradeStatus, Tone> = { draft: 'neutral', submitted: 'accent', approved: 'success', rejected: 'danger' };
const studentTone: Record<StudentStatus, Tone> = { active: 'success', leave: 'warn', graduated: 'accent', withdrawn: 'neutral', suspended: 'danger' };
const courseTone: Record<CourseStatus, Tone> = { planned: 'neutral', active: 'accent', completed: 'success', cancelled: 'neutral' };
const userTone: Record<UserStatus, Tone> = { active: 'success', inactive: 'neutral', suspended: 'danger' };
export const attendanceTone: Record<AttendanceStatus, Tone> = { present: 'success', late: 'warn', absent: 'danger', sick: 'accent', excused: 'neutral' };

export const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => <Badge tone={invoiceTone[status]} dot>{INVOICE_STATUS_LABEL[status]}</Badge>;
export const GradeStatusBadge = ({ status }: { status: GradeStatus }) => <Badge tone={gradeTone[status]} dot>{GRADE_STATUS_LABEL[status]}</Badge>;
export const StudentStatusBadge = ({ status }: { status: StudentStatus }) => <Badge tone={studentTone[status]} dot>{STUDENT_STATUS_LABEL[status]}</Badge>;
export const CourseStatusBadge = ({ status }: { status: CourseStatus }) => <Badge tone={courseTone[status]} dot>{COURSE_STATUS_LABEL[status]}</Badge>;
export const UserStatusBadge = ({ status }: { status: UserStatus }) => <Badge tone={userTone[status]} dot>{USER_STATUS_LABEL[status]}</Badge>;
export const AttendanceBadge = ({ status }: { status: AttendanceStatus }) => <Badge tone={attendanceTone[status]}>{ATTENDANCE_LABEL[status]}</Badge>;
