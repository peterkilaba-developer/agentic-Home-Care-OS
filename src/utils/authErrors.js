const GENERIC_INVALID_CREDS = 'Invalid email or password. Check your credentials and try again.';

const FIREBASE_AUTH_ERROR_MAP = {
  'auth/user-not-found': GENERIC_INVALID_CREDS,
  'auth/wrong-password': GENERIC_INVALID_CREDS,
  'auth/invalid-credential': GENERIC_INVALID_CREDS,
  'auth/invalid-login-credentials': GENERIC_INVALID_CREDS,
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/email-already-in-use': 'An account already exists for this email.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes before trying again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Sign-in popup was blocked by the browser. Please allow popups and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Contact support.',
  'auth/account-exists-with-different-credential': 'An account with this email already exists using a different sign-in method.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
  'auth/invalid-verification-code': 'Invalid verification code.',
  'auth/invalid-verification-id': 'Verification expired. Please request a new code.',
  'auth/code-expired': 'Verification code expired. Please request a new code.',
  'auth/missing-verification-code': 'Please enter the verification code.',
  'auth/quota-exceeded': 'Sign-in service temporarily unavailable. Try again later.',
};

export function mapAuthError(err) {
  if (!err) return 'Unknown error. Please try again.';
  const code = err.code || '';
  if (FIREBASE_AUTH_ERROR_MAP[code]) return FIREBASE_AUTH_ERROR_MAP[code];
  // Firestore permission-denied during post-auth doc creation:
  if (code === 'permission-denied') {
    return 'Sign-in succeeded but account setup failed. Please contact support.';
  }
  // Unknown — log to console for ops, return generic UI message.
  if (typeof console !== 'undefined') console.error('[auth] unmapped error', code, err.message);
  return 'Sign-in failed. Please try again or contact support if the problem persists.';
}
