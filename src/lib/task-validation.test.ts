import { describe, expect, it } from 'vitest';
import { taskFormSchema } from '@/lib/task-validation';

describe('taskFormSchema', () => {
  it('requiere título no vacío', () => {
    const result = taskFormSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rechaza títulos mayores a 80 caracteres', () => {
    const result = taskFormSchema.safeParse({ title: 'a'.repeat(81) });
    expect(result.success).toBe(false);
  });

  it('acepta datos mínimos válidos', () => {
    const result = taskFormSchema.safeParse({ title: 'Revisar informe' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.frequency).toBe('one_time');
      expect(result.data.priority).toBe('normal');
    }
  });

  it('valida groupId como UUID', () => {
    const bad = taskFormSchema.safeParse({
      title: 'Tarea',
      groupId: 'no-es-uuid',
    });
    expect(bad.success).toBe(false);

    const good = taskFormSchema.safeParse({
      title: 'Tarea',
      groupId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(good.success).toBe(true);
  });
});
