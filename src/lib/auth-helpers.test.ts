import { describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(async () => null),
}));

import {
  canAssignAdminRole,
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
});
