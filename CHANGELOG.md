# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0.0] - 2026-05-15

### Added — Resident Discharge / End-of-Care Workflow
- Discharge Resident modal on every active resident card in the Roster view
- 7 discharge types: Returned Home / Family, Hospitalized, Transferred to SNF, Transferred to another ALF/AFH, Against Medical Advice (AMA), Deceased, Other
- Required date picker (capped at today) and clinical discharge summary field; warning banner clarifies the action cannot be undone without re-admitting through the intake pipeline
- Writes `status: 'discharged'`, `dischargeType`, `dischargeDate`, `dischargeReason`, `dischargedAt` (server timestamp) to resident doc
- Creates a `RESIDENT_DISCHARGED` system log entry automatically
- Discharged residents are hidden from the active roster by default; a "Show Discharged (N)" toggle reveals a muted historical section where clinical charts remain accessible as read-only records

### Added — Incident / Accident Reporting
- New Incidents module at `/dashboard/incidents` with full Firestore integration — state-mandated incident logging for all 50 states
- 8 incident types: Fall / Near-Fall, Medication Error, Behavioral, Medical Emergency, Elopement / Wandering, Property Damage, Suspected Abuse / Neglect, Other
- 4 severity levels with plain-language descriptions (Low through Critical)
- Notification checklist: Family / Emergency Contact, Physician, DOH, Case Manager, EMS, Law Enforcement, Long-Term Care Ombudsman — with notes field for documentation of who was contacted and when
- Summary stats: total incidents, this-month count, serious + critical count (highlighted in red when non-zero)
- Filter tabs by incident type; expandable accordion cards showing full detail; browser print-to-PDF for physical record keeping
- Incidents sidebar nav entry added between State Compliance and System Logs

### Added — Firestore Security
- `incidents` collection rules: home staff create + read; home managers update (for follow-up documentation); super-admin-only delete to preserve the immutable audit chain

### Fixed — Security
- `storage.rules` `isSuperAdmin()` was hardcoding two email strings (`admin@agentic.com`, `superadmin@homecare.com`) that could not be rotated without a rules redeploy. Now uses Firebase custom claims (`superAdmin: true`) with user-doc fallback (`isSuperAdmin == true && role == 'admin'`), matching `firestore.rules` exactly. Also aligned `canAccessHome()` to check `activeHomeId` alongside `homeId`.

### Fixed — Incidents Form
- `incidentTime` field was marked required (`*`) in the UI but not validated in `handleSubmit`; users could submit without entering a time, breaking audit trail completeness — validation now enforced
- Resident selector in incident form shows `(Unnamed Resident)` fallback when both `r.name` and `r.identity?.name` are undefined

### Tests
- 138 tests passing (up from 60): all prior tests preserved; no regressions

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
