import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { MockHttpError, getMockSession, routes } from './handlers';

type Compiled = { method: string; regex: RegExp; keys: string[]; handler: (typeof routes)[string] };

const compiled: Compiled[] = Object.entries(routes).map(([key, handler]) => {
  const [method, path] = key.split(' ');
  const keys: string[] = [];
  const pattern = path.replace(/:([a-zA-Z_]+)/g, (_, k) => {
    keys.push(k);
    return '([^/]+)';
  });
  return { method, regex: new RegExp(`^${pattern}$`), keys, handler };
});
// Статик зам (/semesters/current)-ыг параметртэй замаас түрүүлж шалгана
compiled.sort((a, b) => a.keys.length - b.keys.length);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return { data, status, statusText: String(status), headers: new AxiosHeaders(), config };
}

export const mockAdapter: AxiosAdapter = async (config) => {
  await delay(120 + Math.random() * 180);

  const method = (config.method ?? 'get').toUpperCase();
  const url = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
  const route = compiled.find((r) => r.method === method && r.regex.test(url));

  const fail = (status: number, message: string) => {
    const response = respond(config, status, { error: { message } });
    throw new AxiosError(message, String(status), config, null, response);
  };

  if (!route) return fail(404, `Mock route олдсонгүй: ${method} ${url}`);

  const session = getMockSession();
  if (!session) return fail(401, 'Нэвтрэх шаардлагатай.');

  const match = url.match(route.regex)!;
  const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
  const query = Object.fromEntries(
    Object.entries((config.params ?? {}) as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  );
  let body: unknown = config.data;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      /* ignore */
    }
  }

  try {
    const data = route.handler({ params, query, body: body ?? {}, session });
    // Бодит API шиг объект хуулбар буцаана
    return respond(config, method === 'POST' ? 201 : 200, { data: structuredClone(data) });
  } catch (err) {
    if (err instanceof MockHttpError) return fail(err.status, err.message);
    console.error(err);
    return fail(500, 'Серверийн алдаа гарлаа.');
  }
};
