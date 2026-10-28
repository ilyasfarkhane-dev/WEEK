# Architecture

The interface is a React application built with Vite. An Express API holds the workflows. Records are stored in `data/store.json`. The browser does not receive a credential or an administrative secret.

## Boundaries

- `src/app` contains routes. Public pages, the member shell, and administration are separate route groups.
- `src/lib/authz.ts` is the permission model. It does not read the database, so the rules can be tested directly.
- `src/server/access.ts` turns those rules into Prisma filters so a list does not rely on hiding rows in the interface.
- `src/server/actions` validates input with Zod and checks the actor again before writing.
- `src/lib/email.ts` and `src/lib/ai/provider.ts` are the seams for a later email provider and a later model provider.

## Identity

Auth.js uses database-backed user records and a JWT session of eight hours. Passwords are hashed with bcrypt. Invitation and reset tokens are stored as SHA-256 hashes. Registration is invitation-only.

A session is not enough for a sensitive read. Each project, challenge, request, resource, and file route loads the actor from the database and decides access again.

## Records

Challenges, projects, canvas versions, approvals, commitments, help requests, resources, events, and audit events are separate tables. A canvas autosave updates the working copy and appends a version when the content hash changes. Older versions are not rewritten when an administrator edits the field definitions.

Institutional authorization is an `InstitutionalApproval` row with `isFormal`. A participant commitment is a different table. The stage change to “Test approved” or “Testing” requires a formal row in the approved state.

## Measures

`src/server/metrics-query.ts` calculates dashboard and monitoring numbers from stored rows. Targets live in `ProgrammeSettings` and are labelled as proposals. A missing denominator or a window that cannot be calculated is shown as insufficient data.

A meaningful contribution is a challenge, comment, canvas version, help request, response, completed action, or resource in the selected period. Signing in is not a contribution.

A reviewed canvas has all required sections filled and a comment from a facilitator, programme manager, or administrator.

## Localization

Locale is a cookie, `gic-locale`, set from the profile. `dir` is `rtl` when the preference is Arabic. Copy remains English until translation files are added. Layout uses logical properties so the shell can flip.

## Assumptions

- Programme-visible means signed-in community members, not the public website.
- Programme managers see operational metadata for confidential projects and the narrative only when they are members, facilitators, or explicitly granted access.
- Experts who have no community role see expert-review requests that are programme-visible, events they are registered for, and records granted to them.
- Verified programme resources can be read by sponsors and experts. Drafts cannot.
- Recording an approval stores a decision made outside the platform. The software does not itself grant institutional authority.
