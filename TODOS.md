# Known Issues & Deferred Work

Items below were identified during security and code review. Resolved items are noted with the release version they were fixed in.

---

## RESOLVED — v0.3.0

### ~~[SEC] Hardcoded super-admin emails in storage.rules~~
`storage.rules` `isSuperAdmin()` now uses Firebase custom claims (`superAdmin: true`) and the
user-doc check (`isSuperAdmin == true && role == 'admin'`), matching `firestore.rules`.
No hardcoded email strings remain.

### ~~[FEAT] No discharge / end-of-care workflow~~
`Roster.jsx` — discharge modal with type (home, hospital, SNF, AMA, deceased, other), date, and
clinical summary. Residents move to `status: 'discharged'`; a collapsible section retains
historical charts. System log entry `RESIDENT_DISCHARGED` written on discharge.

### ~~[FEAT] No incident / accident reporting~~
`Incidents.jsx` — full incident reporting module at `/dashboard/incidents`. Stores to
`incidents/{id}` collection. Supports 8 incident types, 4 severity levels, notification
checklist (DOH, family, EMS, ombudsman, etc.), and browser print-to-PDF.
Firestore rules: home staff create/read; super-admin-only delete (immutable audit record).

---

## P2 — Address Before Growth

### [SEC] `?impersonate=<uid>` lacks server-side guard
**File:** `src/pages/Dashboard.jsx`
**Risk:** Impersonation is gated client-side only. A compromised client can impersonate any UID.
Audit events ARE written to `impersonation_events`, but authorization is not server-enforced.
**Fix:** Move authorization to a Cloud Function that issues a short-lived custom token and
writes the audit record atomically.

---

## P3 — Backlog / Nice to Have

### [SEC] Raw Firebase error codes exposed in login UI
**File:** `src/pages/AuthSite.jsx`
**Status:** `authErrors.js` maps most known codes to generic messages; any unmapped code falls
back to a generic string. Verify no raw Firebase error messages reach the DOM.

### [BUG] Webhook writes `wacStatus`, Firestore rule checks `complianceStatus`
**File:** `functions/index.js` vs `firestore.rules`
**Status:** Appears already aligned (`complianceStatus: 'Verified'` in webhook, matching rule).
Verify in staging that marketplace listing works end-to-end after Stripe checkout.

### [PERF] Agency residents fetched client-side with full collection scan
**File:** `src/pages/Dashboard.jsx`
**Fix:** Add `homeId` field to resident documents; use `where('homeId', 'in', [...])` query.

### [VALID] Client-side onboarding write — verify old path is dead
**File:** `src/pages/OnboardingPortal.jsx`
**Status:** `completeProviderOnboarding` Cloud Function exists and validates. Confirm no
direct Firestore write path remains in the client form handler.

### [UX] Resident Assignment modal is a stub
**File:** `src/components/dashboard/Roster.jsx`
**Fix:** Implement staff assignment to residents for shift targeting.

### [FEAT] Family document eSignature workflow
**File:** `src/pages/FamilyPortal.jsx`
**Fix:** Admission Agreement, HIPAA Release, Financial Responsibility — integrate eSignature
(HelloSign / DocuSign or native PDF + Storage approach).

### [FEAT] EVV GPS verification not enforced
**File:** `src/components/dashboard/Operations.jsx`
**Status:** GPS compliance flag is set but not verified at clock-in/out. Required for Medicaid
reimbursement eligibility in most states.

### [FEAT] Monthly census reporting
**Status:** Discharge workflow is in place (v0.3.0). Automated census report for state regulator
(occupied-bed count per month) not yet implemented.

### [FEAT] Multi-language support
**Status:** UI is English-only. Residents have `primaryLanguage` field. Spanish is highest priority.

### [FEAT] Care plan template library
**Status:** AI generates care plans per intake. Providers cannot yet save/reuse templates.
