import { describe, expect, it } from 'vitest';
import {
  canCompleteWithStrictOrder,
  canToggleProcedureStep,
  getToggleProcedureStepPermission,
  normalizeAssigneeIds,
} from '@/lib/procedure-permissions';

describe('canToggleProcedureStep', () => {
  it('permite a cualquiera de los asignados', () => {
    expect(canToggleProcedureStep({ id: 'u1', role: 'viewer' }, ['u1', 'u2'])).toBe(true);
    expect(canToggleProcedureStep({ id: 'u2', role: 'viewer' }, ['u1', 'u2'])).toBe(true);
  });

  it('bloquea a quien no está asignado', () => {
    expect(canToggleProcedureStep({ id: 'u3', role: 'viewer' }, ['u1', 'u2'])).toBe(false);
  });

  it('acepta un solo id (compatibilidad)', () => {
    expect(canToggleProcedureStep({ id: 'u1', role: 'viewer' }, 'u1')).toBe(true);
  });

  it('permite admin y editor', () => {
    expect(canToggleProcedureStep({ id: 'a1', role: 'admin' }, ['u1'])).toBe(true);
    expect(canToggleProcedureStep({ id: 'e1', role: 'editor' }, ['u1'])).toBe(true);
  });
});

describe('getToggleProcedureStepPermission', () => {
  it('exige autenticación', () => {
    expect(getToggleProcedureStepPermission(null, ['u1'], true).ok).toBe(false);
  });

  it('exige que el paso exista', () => {
    expect(
      getToggleProcedureStepPermission({ id: 'u1', role: 'viewer' }, ['u1'], false).ok
    ).toBe(false);
  });
});

describe('normalizeAssigneeIds', () => {
  it('deduplica y limpia', () => {
    expect(normalizeAssigneeIds(['a', 'a', '', 'b'])).toEqual(['a', 'b']);
  });
});

describe('canCompleteWithStrictOrder', () => {
  it('sin orden estricto siempre permite', () => {
    expect(canCompleteWithStrictOrder(false, false)).toBe(true);
  });

  it('con orden estricto exige anteriores completos', () => {
    expect(canCompleteWithStrictOrder(true, true)).toBe(true);
    expect(canCompleteWithStrictOrder(true, false)).toBe(false);
  });
});
