const configuredAdminEmails = import.meta.env.VITE_ADMIN_EMAILS
  ?.split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS = configuredAdminEmails?.length ? configuredAdminEmails : [
  'admin@agentic.com',
  'superadmin@homecare.com',
  'peterkilaba@gmail.com',
];
