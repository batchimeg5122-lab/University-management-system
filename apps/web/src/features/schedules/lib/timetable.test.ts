import { describe, expect, it } from 'vitest';
import { autoPlace } from './autoplace';
import { findConflicts, overlaps } from './timetable';

const base = { course_id: 'c', class_id: 'A', teacher_id: 'T', day_of_week: 1, start_time: '08:00', end_time: '09:20', room: '101', building: 'I байр' };

describe('давхцал', () => {
  it('цаг давхцах', () => {
    expect(overlaps(base, { ...base, start_time: '09:00', end_time: '10:00' })).toBe(true);
    expect(overlaps(base, { ...base, start_time: '09:20', end_time: '10:40' })).toBe(false);
    expect(overlaps(base, { ...base, day_of_week: 2 })).toBe(false);
  });
  it('анги, багш, өрөө', () => {
    expect(findConflicts({ ...base, id: 'x' }, [{ ...base, id: 'y' }])[0].kind).toBe('class');
    expect(findConflicts({ ...base, id: 'x', class_id: 'B' }, [{ ...base, id: 'y' }])[0].kind).toBe('teacher');
    expect(findConflicts({ ...base, id: 'x', class_id: 'B', teacher_id: 'T2' }, [{ ...base, id: 'y' }])[0].kind).toBe('room');
  });
  it('онлайн хичээл өрөө эзлэхгүй', () => {
    expect(findConflicts({ ...base, id: 'x', class_id: 'B', teacher_id: 'T2', is_online: true }, [{ ...base, id: 'y' }])).toHaveLength(0);
  });
  it('нэгдсэн лекцийн мөрүүд хоорондоо давхцахгүй', () => {
    expect(findConflicts({ ...base, id: 'x', class_id: 'B', group_id: 'g' }, [{ ...base, id: 'y', group_id: 'g' }])).toHaveLength(0);
  });
});

describe('автомат байршуулалт', () => {
  const courses: any[] = [
    { id: 'c1', class_id: 'A', teacher_id: 'T1', student_count: 30, subject_name: 'Math' },
    { id: 'c2', class_id: 'A', teacher_id: 'T1', student_count: 30, subject_name: 'Phys' },
    { id: 'c3', class_id: 'B', teacher_id: 'T1', student_count: 60, subject_name: 'Big' },
    { id: 'c4', class_id: 'A', teacher_id: 'T2', student_count: 200, subject_name: 'Huge' },
  ];
  const existing: any[] = [{ id: 's1', course_id: 'x', class_id: 'A', teacher_id: 'T9', day_of_week: 1, start_time: '08:00', end_time: '09:20', room: '101', building: 'I байр' }];
  const rooms = [
    { building: 'I байр', code: '101', capacity: 40, is_active: true },
    { building: 'I байр', code: '201', capacity: 80, is_active: true },
  ];
  const r = autoPlace(courses, existing, rooms);

  it('байршуулсан хичээлүүд хоорондоо давхцахгүй', () => {
    const entries = [...existing, ...r.placed.map((p) => ({ ...p, course_id: p.course.id, class_id: p.course.class_id, teacher_id: p.course.teacher_id }))];
    for (const e of entries) expect(findConflicts(e, entries.filter((x) => x !== e))).toHaveLength(0);
  });
  it('багтаамж хүрэхгүй бол байршуулахгүй', () => expect(r.unplaced.map((u) => u.course.id)).toEqual(['c4']));
  it('өрөөний багтаамжийг хүндэтгэнэ', () => expect(r.placed.find((p) => p.course.id === 'c3')?.room).toBe('201'));
});
