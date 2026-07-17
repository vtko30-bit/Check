import { describe, expect, it } from 'vitest';
import {
  canToggleProcedureStep,
  getToggleProcedureStepPermission,
} from '@/lib/procedure-permissions';

describe('canToggleProcedureStep', () => {
  it('permite al asignado', () => {
    expect(canToggleProcedureStep({ id: 'u1', role: 'viewer' }, 'u1')).toBe(true);
  });

  it('bloquea a otro usuario', () => {
    expect(canToggleProcedureStep({ id: 'u2', role: 'viewer' }, 'u1')).toBe(false);
  });

  it('permite admin y editor aunque no sean asignados', () => {
    expect(canToggleProcedureStep({ id: 'a1', role: 'admin' }, 'u1')).toBe(true);
    expect(canToggleProcedureStep({ id: 'e1', role: 'editor' }, 'u1')).toBe(true);
  });
});

describe('getToggleProcedureStepPermission', () => {
  it('exige autenticación', () => {
    const r = getToggleProcedureStepPermission(null, 'u1', true);
    expect(r.ok).toBe(false);
  });

  it('exige que el paso exista', () => {
    const r = getToggleProcedureStepPermission({ id: 'u1', role: 'viewer' }, 'u1', false);
    expect(r.ok).toBe(false);
  });
});
