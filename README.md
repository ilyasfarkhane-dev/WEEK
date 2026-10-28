# Governance Innovation Community

GIC is a six-month workspace for a cohort of public officials, facilitators, programme managers, institutional sponsors, and invited experts. Members move from a challenge to a collaborative proposal, a recorded institutional authorization, a test, and a decision about what to keep.

The interface is English. A member can store a French or Arabic language preference. Arabic also switches the layout to right-to-left. Translations are not included yet.

## Local setup

Requirements: Node.js 24. Records are a JSON document at `data/store.json`, not a database server.

```bash
npm install
npm run db:seed
npm run dev
```

`npm run db:seed` rewrites `data/store.json` with the demonstration cohort. Set `AUTH_SECRET` in `.env` before signing in.

Open http://127.0.0.1:3000. The interface is a React application served by Vite. Records stay in `data/store.json`, and the API is the process started by `npm run dev`.

### Demonstration accounts

Every seeded person, institution, authorization, and outcome is synthetic. The banner in the application says so.

Password for every demonstration account: `Demo-GIC-2026!`

| Email | Role |
| --- | --- |
| ada.mensah@demo.gic.local | Platform administrator |
| mina.rossi@demo.gic.local | Programme manager |
| facilitator.1@demo.gic.local | Facilitator, Citizens as Co-Creators |
| omar.hassan@demo.gic.local | Participant in that workspace |
| samir.nasser@demo.gic.local | Sponsor with access to one project |
| noor.elamin@demo.gic.local | Expert with access to that same project |

An unused invitation is seeded for Amina Diallo:

`/register/invitation?token=demo-invite-amina-gic-2026-token`

Seeding deletes and recreates application data. It refuses to run when `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true`.

## Scripts

- `npm run dev` starts the application.
- `npm run db:seed` rewrites `data/store.json` with the demonstration cohort.
- `npm test` runs unit tests for access rules and measure calculations.
- `npm run test:e2e` runs Playwright against a seeded local server.

## What is intentionally not running

- Email is queued in an outbox. Nothing is described as delivered unless a provider is added and confirms it. See `src/lib/email.ts`.
- The reminder job at `POST /api/cron/reminders` stays disabled until `CRON_SECRET` is set.
- AI assistance is a disabled provider. No text is sent to a model.
- An OpenID Connect provider is added only when `AUTH_OIDC_ISSUER`, `AUTH_OIDC_CLIENT_ID`, and `AUTH_OIDC_CLIENT_SECRET` are set. It can sign in an account that already exists. It does not create accounts.

Further operating notes are in `docs/architecture.md`, `docs/security.md`, `docs/deployment.md`, and `docs/backlog.md`.
