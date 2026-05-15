const configuredAdminEmails = import.meta.env.VITE_ADMIN_EMAILS
  ?.split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (!configuredAdminEmails?.length) {
  console.warn('VITE_ADMIN_EMAILS is not set — no super-admins will have access. Set this env var before deploying.');
}

export const ADMIN_EMAILS = configuredAdminEmails ?? [];
