# Home Care — Claude Code Instructions

## Project Overview
React + Firebase + Stripe home care platform. Multi-role (providers, caregivers, families, resellers, admins). Vite build, Tailwind CSS 4, Cloud Functions Node 22, Vitest tests.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run test` — Vitest
- `npm run functions:check` — Cloud Functions syntax check
- `npm run validate` — full pipeline: lint + build + test + functions:check

## Testing
- Framework: Vitest (vitest.config inside vite.config.js)
- Test directory: `src/test/`
- Run command: `npm run test`
- Also: `test/firestore.rules.test.js` for Firestore rules (requires FIRESTORE_EMULATOR_HOST)
- 100% coverage is the goal — tests make vibe coding safe

## Architecture
- `src/` — React frontend (pages, components, utils, data, config)
- `functions/` — Cloud Functions (Stripe, Twilio, Nodemailer, Vertex AI)
- `firebase.json` — Hosting, Firestore, Storage, Functions config
- `firestore.rules` — Default-deny security rules
- `storage.rules` — Default-deny storage rules

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
