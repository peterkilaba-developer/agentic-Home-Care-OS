# Agentic Home Care OS

Production-oriented React, Firebase, Stripe, and Cloud Functions platform for home care providers, caregiver workflows, family portals, reseller onboarding, and marketplace discovery.

## Local Development

1. Install dependencies:

```bash
npm install
npm --prefix functions install
```

2. Copy environment templates and fill in deployment-specific values:

```bash
cp .env.example .env
cp functions/.env.example functions/.env
```

3. Start the app:

```bash
npm run dev
```

## Required Production Configuration

- `VITE_APP_ORIGIN`: canonical app URL used for invite and return links.
- `VITE_CAREGIVER_INVITE_ORIGIN`: optional QR invite URL override. For local phone testing, run `npm run dev:host` and set this to the computer's LAN URL, for example `http://192.168.1.25:5173`.
- `VITE_ADMIN_EMAILS`: comma-separated super-admin emails used by the frontend guard.
- `VITE_FIREBASE_*`: Firebase web app configuration.
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for client-side Stripe Elements.
- `APP_ORIGIN`: canonical app URL used by Cloud Functions.
- `ADMIN_EMAILS`: comma-separated super-admin emails used by privileged functions.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_FOUNDERS_PRICE_ID`: required by Stripe checkout, webhooks, and subscription onboarding.
- AI provider keys in `functions/.env` as needed by the clinical routing function.

Never commit `.env` or `functions/.env`; both are ignored. Use Firebase/Google Cloud secret management for deployed functions.

## Validation

Run the full validation path before deploying:

```bash
npm run validate
```

This runs ESLint, the production Vite build, Vitest, and Cloud Functions syntax checks. Firestore rules tests are skipped unless `FIRESTORE_EMULATOR_HOST` is set.

## Deployment Notes

- Cloud Functions are pinned to Node.js 22 in `functions/package.json`.
- Firebase Hosting applies baseline security headers from `firebase.json`.
- Firestore and Storage rules are default-deny; add explicit matches for any new collections or file paths.
- Staff invite links do not include passwords. Temporary passwords are shown only in the provider dashboard after staff provisioning and are not saved to Firestore.
