import { describe, expect, it } from 'vitest';
import { resolveGoogleSignIn, type DbAuthUser } from '@/lib/auth-google';

const activeUser: DbAuthUser = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'viewer',
  avatar_url: null,
  is_active: true,
  can_view_all_tasks: false,
};

describe('resolveGoogleSignIn', () => {
  it('rechaza email no registrado', () => {
    expect(resolveGoogleSignIn(null)).toEqual({ ok: false, reason: 'not_registered' });
  });

  it('rechaza cuenta desactivada', () => {
    expect(resolveGoogleSignIn({ ...activeUser, is_active: false })).toEqual({
      ok: false,
      reason: 'inactive',
    });
  });

  it('permite usuario activo existente', () => {
    expect(resolveGoogleSignIn(activeUser)).toEqual({ ok: true, user: activeUser });
  });
});
