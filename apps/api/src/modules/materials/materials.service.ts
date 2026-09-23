import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { forbidden, HttpError, notFound, unprocessable } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { ALLOWED_MIME, MAX_SIZE, type createMaterialSchema, type updateMaterialSchema, type uploadUrlSchema } from './materials.schema';

export const BUCKET = 'course-materials';

const SELECT = '*, users(full_name), courses(subject_id, teacher_id, class_id, subjects(code, name), classes(code))';

/** Вэб дээр шууд үзэж болох төрлүүд */
export const PREVIEWABLE = ['application/pdf', 'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4'];

const mapMaterial = ({ users, courses, ...m }: any) => ({
  ...m,
  size_bytes: Number(m.size_bytes ?? 0),
  can_preview: PREVIEWABLE.includes(m.mime_type ?? ''),
  uploaded_by_name: users?.full_name ?? null,
  subject_code: courses?.subjects?.code,
  subject_name: courses?.subjects?.name,
  class_name: courses?.classes?.code ?? null,
});

function assertFileAllowed(mime: string, size: number) {
  if (!ALLOWED_MIME.includes(mime)) throw unprocessable('Энэ төрлийн файл дэмжигдэхгүй байна (PDF, Word, PowerPoint, Excel, зураг, видео, ZIP).');
  if (size > MAX_SIZE) throw unprocessable('Файлын хэмжээ 50MB-аас хэтэрсэн байна.');
}

const extOf = (name: string) => {
  const m = name.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return m ? `.${m[1]}` : '';
};

/** Багш файлаа шууд Storage руу байршуулах түр зөвшөөрөл авна */
export async function createUploadUrl(courseId: string, input: z.infer<typeof uploadUrlSchema>) {
  assertFileAllowed(input.mime_type, input.size_bytes);
  const path = `${courseId}/${randomUUID()}${extOf(input.file_name)}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new HttpError(400, `Байршуулах холбоос үүсгэж чадсангүй: ${error?.message}`);
  return { path, token: data.token, signed_url: data.signedUrl, bucket: BUCKET };
}

/** Файл байршсаны дараа мэдээллийг бүртгэнэ */
export async function create(courseId: string, input: z.infer<typeof createMaterialSchema>, actor: AuthUser) {
  if (!input.file_path.startsWith(`${courseId}/`)) throw forbidden('Файлын зам энэ хичээлд хамаарахгүй байна.');
  if (input.mime_type) assertFileAllowed(input.mime_type, input.size_bytes);

  // Файл үнэхээр байршсан эсэхийг шалгана
  const name = input.file_path.split('/').slice(1).join('/');
  const { data: files } = await supabase.storage.from(BUCKET).list(courseId, { search: name, limit: 1 });
  if (!files?.length) throw unprocessable('Файл байршаагүй байна. Дахин оролдоно уу.');

  const row = await run(
    supabase
      .from('course_materials')
      .insert({
        course_id: courseId,
        uploaded_by: actor.id,
        title: input.title,
        description: input.description ?? null,
        file_path: input.file_path,
        file_name: input.file_name,
        mime_type: input.mime_type ?? null,
        size_bytes: input.size_bytes,
        is_published: input.is_published,
      })
      .select(SELECT)
      .single(),
  );
  return mapMaterial(row);
}

/** Хичээлийн материалууд. Оюутанд зөвхөн нийтэлсэн материал харагдана */
export async function listByCourse(courseId: string, actor: AuthUser) {
  let query = supabase.from('course_materials').select(SELECT).eq('course_id', courseId).order('created_at', { ascending: false });
  if (actor.role === 'student') query = query.eq('is_published', true);
  return (await run(query)).map(mapMaterial);
}

/** Оюутны бүх хичээлийн материал */
export async function listForStudent(actor: AuthUser) {
  const enrollments = await run(supabase.from('enrollments').select('course_id').eq('student_id', actor.studentId ?? '').neq('status', 'dropped'));
  const ids = enrollments.map((e: { course_id: string }) => e.course_id);
  if (!ids.length) return [];
  const rows = await run(
    supabase.from('course_materials').select(SELECT).in('course_id', ids).eq('is_published', true).order('created_at', { ascending: false }),
  );
  return rows.map(mapMaterial);
}

async function getWithAccess(id: string, actor: AuthUser, forWrite: boolean) {
  const material = required(await run(supabase.from('course_materials').select(SELECT).eq('id', id)), 'Материал олдсонгүй.')[0];
  const course = material.courses ?? {};
  const isStaff = ['super_admin', 'academic', 'management'].includes(actor.role);
  const isTeacher = actor.role === 'teacher' && course.teacher_id === actor.employeeId;

  if (forWrite) {
    if (!isStaff && !isTeacher) throw forbidden('Зөвхөн хичээлийн багш материалаа удирдана.');
    return material;
  }
  if (isStaff || isTeacher) return material;
  if (actor.role === 'student') {
    if (!material.is_published) throw notFound('Материал олдсонгүй.');
    const enrolled = await run(
      supabase.from('enrollments').select('id').eq('course_id', material.course_id).eq('student_id', actor.studentId ?? '').neq('status', 'dropped').maybeSingle(),
    );
    if (enrolled) return material;
  }
  throw forbidden('Энэ материалд хандах эрхгүй байна.');
}

/** Оюутны хандалтыг бүртгэнэ (материал бүрт нэг мөр, тоолуур нэмэгдэнэ) */
async function trackAccess(materialId: string, studentId: string) {
  const existing = await run(
    supabase.from('course_material_access').select('id, download_count').eq('material_id', materialId).eq('student_id', studentId).maybeSingle(),
  );
  const now = new Date().toISOString();
  const { error } = existing
    ? await supabase.from('course_material_access').update({ download_count: Number(existing.download_count) + 1, last_at: now }).eq('id', existing.id)
    : await supabase.from('course_material_access').insert({ material_id: materialId, student_id: studentId, download_count: 1, first_at: now, last_at: now });
  if (error) console.warn('[materials] хандалт бүртгэж чадсангүй:', error.message);
}

/**
 * Түр хугацааны (5 минут) холбоос.
 * mode='download' — файлыг татна, mode='inline' — вэб дээр шууд нээнэ.
 * Оюутны хандалт хоёуланд нь бүртгэгдэнэ.
 */
async function signedUrl(id: string, actor: AuthUser, mode: 'download' | 'inline') {
  const material = await getWithAccess(id, actor, false);
  if (actor.role === 'student' && actor.studentId) await trackAccess(id, actor.studentId);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(material.file_path, 300, mode === 'download' ? { download: material.file_name } : {});
  if (error || !data) throw new HttpError(400, `Холбоос үүсгэж чадсангүй: ${error?.message}`);

  return {
    url: data.signedUrl,
    file_name: material.file_name,
    mime_type: material.mime_type ?? null,
    can_preview: PREVIEWABLE.includes(material.mime_type ?? ''),
    expires_in: 300,
  };
}

export const downloadUrl = (id: string, actor: AuthUser) => signedUrl(id, actor, 'download');

/** Татахгүйгээр вэб дээр үзэх холбоос */
export const viewUrl = (id: string, actor: AuthUser) => signedUrl(id, actor, 'inline');

export async function update(id: string, input: z.infer<typeof updateMaterialSchema>, actor: AuthUser) {
  await getWithAccess(id, actor, true);
  const rows = required(await run(supabase.from('course_materials').update(input).eq('id', id).select(SELECT)), 'Материал олдсонгүй.');
  return mapMaterial(rows[0]);
}

export async function remove(id: string, actor: AuthUser) {
  const material = await getWithAccess(id, actor, true);
  await run(supabase.from('course_materials').delete().eq('id', id).select('id'));
  const { error } = await supabase.storage.from(BUCKET).remove([material.file_path]);
  if (error) console.warn('[materials] файл устгаж чадсангүй:', error.message);
  return { deleted: true };
}

/** Хичээлийн материал бүрийн хандалтын тоо: { [materialId]: сонирхсон оюутны тоо } */
export async function courseStats(courseId: string) {
  const [materials, enrolled] = await Promise.all([
    run(supabase.from('course_materials').select('id').eq('course_id', courseId)),
    run(supabase.from('enrollments').select('student_id').eq('course_id', courseId).neq('status', 'dropped')),
  ]);
  const ids = materials.map((m: { id: string }) => m.id);
  const rows = ids.length ? await run(supabase.from('course_material_access').select('material_id, student_id, download_count').in('material_id', ids)) : [];

  const byMaterial: Record<string, { students: number; downloads: number }> = {};
  ids.forEach((id: string) => (byMaterial[id] = { students: 0, downloads: 0 }));
  rows.forEach((r: { material_id: string; download_count: number }) => {
    const stat = byMaterial[r.material_id];
    if (!stat) return;
    stat.students++;
    stat.downloads += Number(r.download_count);
  });
  return { total_students: enrolled.length, by_material: byMaterial };
}

/** Нэг материалд хэн хандсан, хэн хандаагүй */
export async function accessDetail(id: string, actor: AuthUser) {
  const material = await getWithAccess(id, actor, true);

  const [enrollments, access] = await Promise.all([
    run(supabase.from('enrollments').select('student_id, students(student_code, users(full_name))').eq('course_id', material.course_id).neq('status', 'dropped')),
    run(supabase.from('course_material_access').select('student_id, download_count, first_at, last_at').eq('material_id', id)),
  ]);
  const byStudent = new Map(access.map((a: any) => [a.student_id, a]));

  const students = enrollments
    .map((e: any) => {
      const a = byStudent.get(e.student_id) as { download_count: number; first_at: string; last_at: string } | undefined;
      return {
        student_id: e.student_id,
        student_code: e.students?.student_code ?? '',
        student_name: e.students?.users?.full_name ?? '',
        downloaded: !!a,
        download_count: a ? Number(a.download_count) : 0,
        first_at: a?.first_at ?? null,
        last_at: a?.last_at ?? null,
      };
    })
    .sort((a, b) => Number(b.downloaded) - Number(a.downloaded) || a.student_name.localeCompare(b.student_name));

  return {
    material: { id: material.id, title: material.title },
    total_students: students.length,
    downloaded_count: students.filter((s) => s.downloaded).length,
    students,
  };
}
