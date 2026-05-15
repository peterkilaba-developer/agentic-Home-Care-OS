# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0.0] - 2026-05-15

### Added
- Initial release of Home Care platform
- Firebase Auth, Firestore, Storage, Cloud Functions (Node 22)
- React 19 + Vite 8 + Tailwind CSS 4 frontend
- Stripe payment integration
- Resident intake pipeline with document upload
- Staff onboarding with QR-code invite flow
- Caregiver portal with shift tracking, medications, and daily chores
- Clinical notes (shift-locked after completion)
- Dashboard with occupancy, billing, and HR views
- Super-admin panel with impersonation and business management
- Family invite flow with intake document signing
- Firestore security rules with role-based access (owner, staff, business member, super-admin)
- Firebase custom claims for super-admin authorization
- Vitest test suite (9 tests passing)

### Security
- Removed all hardcoded Firebase credential fallbacks — config driven by env vars only
- Removed hardcoded admin email list — driven by `VITE_ADMIN_EMAILS` env var
- Fixed Firestore rule: authenticated-only read on `homes` (was unauthenticated)
- Fixed Firestore rule: blocked self-escalation of `isAdmin`, `isSuperAdmin`, `role` fields
- Fixed Firestore rule: added explicit `family_invites` rule scoped to email match
- Fixed Firestore rule: `isConfiguredSuperAdmin()` uses Firebase custom claims only
- Fixed auth bypass in CaregiverPortal — gated to `DEV + localhost` only
- Fixed Cloud Function: hard-stop on cross-home staff deprovisioning
- Fixed Cloud Function: redacted PII (phone numbers, UIDs) from server logs
- Fixed Cloud Function: removed placeholder email fallback from `getAdminEmails()`
- Fixed Cloud Function: aligned Twilio env var name (`TWILIO_FROM_NUMBER`)
