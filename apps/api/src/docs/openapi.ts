import type { Router } from 'express';

/**
 * Express router-оос OpenAPI 3 баримт бичгийг АВТОМАТААР үүсгэнэ.
 * Route нэмэх бүрт баримт бичиг гараар засах шаардлагагүй.
 * - Зам, method, path параметр
 * - Нэвтрэлт шаардах эсэх (requireAuth)
 * - Эрх (requireRole(...) — role.middleware metadata)
 */

type Handle = { stack?: Layer[]; roles?: string[]; name?: string };
type Layer = {
  name?: string;
  route?: { path: string; methods: Record<string, boolean>; stack: Layer[] };
  handle?: Handle;
};

interface Endpoint {
  method: string;
  path: string;
  auth: boolean;
  roles: string[];
}

const TAG_LABEL: Record<string, string> = {
  auth: 'Нэвтрэлт, профайл',
  users: 'Хэрэглэгч',
  departments: 'Бүтэц',
  programs: 'Хөтөлбөр',
  semesters: 'Улирал',
  classes: 'Анги',
  students: 'Оюутан',
  'student-card': 'Цахим үнэмлэх',
  employees: 'Ажилтан',
  subjects: 'Хичээлийн сан',
  courses: 'Хичээл (улирлын)',
  grades: 'Дүн',
  attendance: 'Ирц',
  schedules: 'Хуваарь',
  rooms: 'Өрөө',
  materials: 'Материал',
  certificates: 'Тодорхойлолт',
  invoices: 'Нэхэмжлэл',
  payments: 'Төлбөр',
  notifications: 'Мэдэгдэл, зарлал',
  reports: 'Тайлан',
  'audit-logs': 'Үйлдлийн түүх',
  devices: 'Mobile push',
  teacher: 'Багш (mobile)',
  broadcasts: 'Мэдэгдэл илгээх төв',
  exams: 'Шалгалтын хуваарь',
  'discount-rules': 'Хөнгөлөлтийн дүрэм',
  calendar: 'Академик календарь',
  analytics: 'Шинжилгээ, тайлан',
  settings: 'Системийн тохиргоо',
  admin: 'Админ',
};

function collect(stack: Layer[], authed: boolean, out: Endpoint[]) {
  let auth = authed;
  for (const layer of stack) {
    if (layer.route) {
      const names = layer.route.stack.map((l) => l.name ?? l.handle?.name ?? '');
      const roles = layer.route.stack.flatMap((l) => l.handle?.roles ?? []);
      for (const method of Object.keys(layer.route.methods)) {
        out.push({ method, path: layer.route.path, auth: auth || names.includes('requireAuth') || roles.length > 0, roles });
      }
    } else if (layer.handle?.stack) {
      collect(layer.handle.stack, auth, out);
    } else if ((layer.name ?? layer.handle?.name) === 'requireAuth') {
      // Үүнээс хойших бүх route нэвтрэлт шаардана
      auth = true;
    }
  }
}

export function buildOpenApi(routes: Router, version = '1.0.0') {
  const endpoints: Endpoint[] = [];
  collect((routes as unknown as { stack: Layer[] }).stack, false, endpoints);

  const paths: Record<string, Record<string, unknown>> = {};
  for (const e of endpoints) {
    const oaPath = e.path.replace(/:([A-Za-z_]+)/g, '{$1}');
    const params = [...e.path.matchAll(/:([A-Za-z_]+)/g)].map((m) => ({ name: m[1], in: 'path', required: true, schema: { type: 'string' } }));
    const seg = e.path.split('/').filter(Boolean)[0] ?? 'misc';
    const tag = TAG_LABEL[seg] ?? seg;
    const who = !e.auth ? 'Нээлттэй (нэвтрэх шаардлагагүй)' : e.roles.length ? `Эрх: ${e.roles.join(', ')} (+ super_admin)` : 'Нэвтэрсэн бүх хэрэглэгч';

    paths[oaPath] ??= {};
    paths[oaPath][e.method] = {
      tags: [tag],
      summary: `${e.method.toUpperCase()} ${e.path}`,
      description: who,
      parameters: params,
      ...(e.auth ? { security: [{ bearerAuth: [] }] } : { security: [] }),
      ...(['post', 'put', 'patch'].includes(e.method)
        ? { requestBody: { required: false, content: { 'application/json': { schema: { type: 'object' } } } } }
        : {}),
      responses: {
        200: { description: 'Амжилттай — `{ data }`', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        401: { description: 'Нэвтрээгүй' },
        403: { description: 'Эрхгүй' },
        422: { description: 'Validation алдаа', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Их Засаг — Сургалт, санхүүгийн нэгдсэн систем API',
      version,
      description:
        'Web болон Mobile app-ын нэгдсэн REST API. **Authorize** товч дээр Supabase access token-оо оруулна.\n\n' +
        `Нийт ${endpoints.length} endpoint. Баримт бичиг route-оос автоматаар үүснэ.`,
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Supabase JWT' } },
      schemas: {
        Ok: { type: 'object', properties: { data: {} } },
        Error: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' } } } } },
      },
    },
    tags: Object.values(TAG_LABEL).map((name) => ({ name })),
    paths,
  };
}
