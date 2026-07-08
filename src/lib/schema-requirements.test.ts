import { describe, expect, it } from 'vitest';
import { formatMissingSchema } from '@/lib/schema-requirements';

describe('formatMissingSchema', () => {
  it('incluye tablas y columnas faltantes', () => {
    const msg = formatMissingSchema(['users'], ['tasks.overdue_notified']);
    expect(msg).toContain('npm run db:migrate');
    expect(msg).toContain('users');
    expect(msg).toContain('tasks.overdue_notified');
  });

  it('devuelve mensaje genérico si no hay detalle', () => {
    const msg = formatMissingSchema([], []);
    expect(msg).toContain('npm run db:migrate');
  });
});
