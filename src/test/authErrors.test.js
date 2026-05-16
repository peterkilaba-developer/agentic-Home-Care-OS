import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapAuthError } from '../utils/authErrors';

describe('mapAuthError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns identical generic message for user-not-found vs wrong-password (no enumeration)', () => {
    const userNotFound = mapAuthError({ code: 'auth/user-not-found', message: 'no user' });
    const wrongPw = mapAuthError({ code: 'auth/wrong-password', message: 'bad pw' });
    expect(userNotFound).toBe(wrongPw);
    expect(userNotFound).toMatch(/invalid email or password/i);
    expect(userNotFound).not.toMatch(/not found/i);
    expect(userNotFound).not.toMatch(/wrong/i);
  });

  it('maps invalid-credential variants to the same generic message', () => {
    expect(mapAuthError({ code: 'auth/invalid-credential' }))
      .toBe(mapAuthError({ code: 'auth/invalid-login-credentials' }));
  });

  it('maps known codes to user-friendly messages without leaking the raw code', () => {
    const msg = mapAuthError({ code: 'auth/too-many-requests' });
    expect(msg).toMatch(/too many attempts/i);
    expect(msg).not.toContain('auth/');
  });

  it('maps permission-denied to setup-failed message', () => {
    expect(mapAuthError({ code: 'permission-denied' })).toMatch(/account setup failed/i);
  });

  it('returns a generic message for unknown codes and does not echo err.message', () => {
    const msg = mapAuthError({ code: 'auth/some-novel-error-code', message: 'leaky internal detail' });
    expect(msg).toMatch(/please try again/i);
    expect(msg).not.toContain('leaky internal detail');
    expect(msg).not.toContain('auth/some-novel');
  });

  it('handles null / undefined input gracefully', () => {
    expect(mapAuthError(null)).toMatch(/unknown error/i);
    expect(mapAuthError(undefined)).toMatch(/unknown error/i);
  });
});
