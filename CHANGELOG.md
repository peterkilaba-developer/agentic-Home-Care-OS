# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0.0] - 2026-05-15

### Added — Intake Pipeline (state-aware + capability-matched)
- 14-section strict-JSON clinical extraction schema (identity, diagnoses w/ ICD-10, full med table, allergies, 8 ADLs + 6 IADLs, cognitive, safety, dietary, advance directives, insurance, three contact roles, narrative, fit determination)
- State-aware compliance: per-state regulator/law/facility-type injected into both intake + care-plan prompts, validated on care-plan output (regulator, law, facility type, state name must all be cited)
- Facility Match panel: derives required capabilities from extraction (diabetic, dementia, wound, hospice, incontinence, behavioral, ADL, med-admin) and compares against `homeData.capabilities` + bed capacity
- Care plan generation accepts `homeContext` (gaps, capacity) and explicitly addresses each gap with mitigation strategies
- AI fit determination consistency: backend normalizer forces `recommendation`/`feasible`/`reasoning` agreement; UI banner surfaces AI-vs-RCFEM conflicts at admission decision
- Switched to `gemini-2.5-pro` on v1beta endpoint (1.5 family retired off v1); bumped intake maxTokens to 16384

### Added — Security
- Auth error mapper sanitizes Firebase error codes (no more `auth/user-not-found` vs `auth/wrong-password` enumeration)
- Impersonation audit: `impersonation_events` collection with super-admin-only rules; client-side guard prevents non-admins from honoring `?impersonate=`
- Server-side provider onboarding (`completeProviderOnboarding` Cloud Function): validates input, creates business+home+user docs atomically via Admin SDK
- Reseller signup no longer self-grants `isAdmin: true` (admin status via `resellers/{uid}.ownerId`)

### Fixed
- Firestore rule regression: `users/{uid}` write rule referenced `resource.data` which is null on create — split into `create`/`update`/`delete` so first-time sign-in works
- WAC webhook field mismatch: `wacStatus` → `complianceStatus` (matches Firestore rule check)
- Intake extraction silent failure: backend now logs `finishReason`/usage and returns specific errors (parse failed, empty content, truncated); frontend shows persistent error banner with retry
- AI Fit Analysis card no longer hardcoded green "Accept" — now reflects actual recommendation in matching colors with feasibility flag and risk list

### Tests
- 60 tests passing (up from 9): RCFEM scoring, state compliance (5 sample states + 50-state drift check), clinical schema + capability matching, fit-determination normalizer, auth error sanitization

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
