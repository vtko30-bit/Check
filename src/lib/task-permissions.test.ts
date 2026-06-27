import { describe, expect, it } from 'vitest';
import {
  canUserModifyTask,
  getModifyTaskPermission,
} from '@/lib/task-permissions';

describe('task-permissions', () => {
  const admin = { id: 'admin-1', role: 'admin' };
  const editor = { id: 'user-1', role: 'editor' };

  it('admin puede modificar cualquier tarea', () => {
    expect(canUserModifyTask(admin, 'otro-usuario')).toBe(true);
    expect(canUserModifyTask(admin, null)).toBe(true);
  });

  it('no-admin solo puede modificar tareas asignadas', () => {
    expect(canUserModifyTask(editor, 'user-1')).toBe(true);
    expect(canUserModifyTask(editor, 'user-2')).toBe(false);
    expect(canUserModifyTask(editor, null)).toBe(false);
  });

  it('getModifyTaskPermission devuelve errores claros', () => {
    expect(getModifyTaskPermission(null, 'user-1', true)).toEqual({
      ok: false,
      error: 'No autenticado',
    });
    expect(getModifyTaskPermission(editor, 'user-1', false)).toEqual({
      ok: false,
      error: 'Tarea no encontrada',
    });
    expect(getModifyTaskPermission(editor, 'user-2', true)).toEqual({
      ok: false,
      error: 'No tienes permiso para modificar esta tarea',
    });
    expect(getModifyTaskPermission(editor, 'user-1', true)).toEqual({ ok: true });
  });
});
