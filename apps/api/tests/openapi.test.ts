import { describe, expect, it } from 'vitest';
import { buildOpenApi } from '../src/docs/openapi';
import { routes } from '../src/routes';

describe('Swagger баримт бичиг', () => {
  const spec = buildOpenApi(routes) as any;
  it('олон endpoint-тэй', () => expect(Object.keys(spec.paths).length).toBeGreaterThan(60));
  it('нээлттэй замыг ялгана', () => {
    expect(spec.paths['/auth/lookup'].post.security).toEqual([]);
    expect(spec.paths['/student-card/verify/{token}'].get.security).toEqual([]);
  });
  it('эрхийг харуулна', () => {
    expect(spec.paths['/invoices/bulk'].post.description).toContain('finance');
    expect(spec.paths['/auth/me'].get.security).toEqual([{ bearerAuth: [] }]);
  });
});
