const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export function normalizeOrigin(value) {
  return trimTrailingSlash(String(value || '').trim());
}

export const APP_ORIGIN = (() => {
  const configuredOrigin = import.meta.env.VITE_APP_ORIGIN?.trim();
  if (configuredOrigin) return normalizeOrigin(configuredOrigin);

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeOrigin(window.location.origin);
  }

  return 'https://agentic-home-care-os.com';
})();

export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || '';

function configuredInviteOrigin() {
  return normalizeOrigin(
    import.meta.env.VITE_CAREGIVER_INVITE_ORIGIN?.trim() ||
    import.meta.env.VITE_MOBILE_APP_ORIGIN?.trim() ||
    ''
  );
}

export function getCaregiverInviteOrigin() {
  if (typeof window !== 'undefined') {
    const savedOrigin = normalizeOrigin(window.localStorage?.getItem('caregiver_invite_origin'));
    if (savedOrigin) return savedOrigin;
  }

  return configuredInviteOrigin() || APP_ORIGIN;
}

export function saveCaregiverInviteOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (typeof window !== 'undefined') {
    if (normalizedOrigin) {
      window.localStorage?.setItem('caregiver_invite_origin', normalizedOrigin);
    } else {
      window.localStorage?.removeItem('caregiver_invite_origin');
    }
  }
  return normalizedOrigin || APP_ORIGIN;
}

export function isLocalhostOrigin(origin) {
  try {
    const parsed = new URL(origin);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch (_err) {
    return false;
  }
}

export function buildAppUrl(path = '/', origin = APP_ORIGIN) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeOrigin(origin || APP_ORIGIN)}${normalizedPath}`;
}

export function buildCaregiverInviteUrl(path = '/', origin = getCaregiverInviteOrigin()) {
  return buildAppUrl(path, origin);
}

export function buildQrCodeUrl(data, size = 200) {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}
