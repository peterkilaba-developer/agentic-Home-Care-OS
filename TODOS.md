# Known Issues & Deferred Work

Items below were identified during the pre-landing security and code review but are out of scope for this release. Each is documented here so future maintainers have context.

---

## P2 — Address Before Growth

### [SEC] Raw Firebase error codes exposed in login UI
**File:** `src/pages/AuthSite.jsx` (error display block)
**Risk:** Firebase error codes like `auth/user-not-found` leak account-existence information, enabling user enumeration by attackers.
**Fix:** Map Firebase auth error codes to generic UI messages ("Invalid email or password.") without leaking whether the account exists.

### [SEC] `?impersonate=<uid>` lacks audit trail and server-side guard
**File:** `src/pages/Dashboard.jsx` (impersonation param handling)
**Risk:** Impersonation is only gated client-side (admin check in JS). A compromised client can impersonate any UID. There is no server-side log of who was impersonated and when.
**Fix:** Move impersonation authorization to a Cloud Function that issues a short-lived custom token and writes an audit record to Firestore.

---

## P3 — Backlog / Nice to Have

### [BUG] Webhook writes `wacStatus`, Firestore rule checks `complianceStatus`
**File:** `functions/index.js` (WAC webhook handler) vs `firestore.rules` (homes public read rule)
**Risk:** Homes verified via WAC webhook may not become publicly readable because the field name doesn't match what the rule checks.
**Fix:** Align the field name. Either rename `wacStatus` → `complianceStatus` in the webhook, or update the rule to check `wacStatus`.

### [PERF] Agency residents fetched client-side with full collection scan
**File:** `src/pages/Dashboard.jsx` (agency residents query)
**Risk:** At scale, fetching all residents and filtering client-side wastes bandwidth and hits Firestore read quotas.
**Fix:** Add a `homeId` field to resident documents and use an `array-contains` or `where('homeId', 'in', [...])` query.

### [VALID] Client-side onboarding write lacks server-side validation
**File:** `src/pages/OnboardingPortal.jsx` (form submit handler)
**Risk:** A malicious client could write arbitrary data to the onboarding collection by bypassing form validation.
**Fix:** Add a Cloud Function to validate and sanitize onboarding submissions before writing to Firestore.
