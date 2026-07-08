import { describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(async () => null),
}));

import {
  canAssignAdminRole,
  canManageUserAccount,
  isAdmin,
  isAdminOrEditor,
} from '@/lib/auth-helpers';

describe('auth-helpers', () => {
  it('isAdmin reconoce solo rol admin', () => {
    expect(isAdmin({ id: '1', role: 'admin' })).toBe(true);
    expect(isAdmin({ id: '1', role: 'editor' })).toBe(false);
    expect(isAdmin({ id: '1', role: 'viewer' })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it('isAdminOrEditor incluye admin y editor', () => {
    expect(isAdminOrEditor({ id: '1', role: 'admin' })).toBe(true);
    expect(isAdminOrEditor({ id: '1', role: 'editor' })).toBe(true);
    expect(isAdminOrEditor({ id: '1', role: 'viewer' })).toBe(false);
  });

  it('canAssignAdminRole solo permite a admin', () => {
    expect(canAssignAdminRole({ id: '1', role: 'admin' })).toBe(true);
    expect(canAssignAdminRole({ id: '1', role: 'editor' })).toBe(false);
  });

  it('canManageUserAccount bloquea editor sobre admin', () => {
    expect(canManageUserAccount('admin', 'admin')).toBe(true);
    expect(canManageUserAccount('admin', 'editor')).toBe(true);
    expect(canManageUserAccount('editor', 'viewer')).toBe(true);
    expect(canManageUserAccount('editor', 'admin')).toBe(false);
    expect(canManageUserAccount('viewer', 'viewer')).toBe(true);
  });
});
