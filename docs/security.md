# Security and permissions

This is a working control model for a multi-institution deployment. It is not a completed certification.

## Access matrix

| Action | Administrator | Programme manager | Facilitator | Participant | Sponsor | Expert |
| --- | --- | --- | --- | --- | --- | --- |
| Invite and suspend users | Yes | Invite, not suspend | No | No | No | No |
| Audit log and email outbox | Yes | No | No | No | No | No |
| Review a challenge in an assigned theme | Yes | Yes | Assigned theme | No | No | No |
| Read a confidential project narrative | Yes | Only with membership or a grant | Assigned theme, unless restricted | Own team or membership | Grant only | Grant only |
| Record a formal approval decision | Yes | Yes | Assigned theme | No | No | No |
| Move a project into testing | Only after a formal approval exists | Same | Same | Same, if they can edit | No | No |
| Monitoring counts | Yes | Yes | No | No | Yes | No |
| Verify a resource | Yes | Yes | No | May submit a community draft | No | No |

Restricted records are visible to administrators, members, and people with a grant. A facilitator does not receive them automatically. A programme manager sees a summary without the narrative.

Changing a URL to another project’s id returns “not found” when the actor’s filter excludes it. Export routes use the same check.

## Controls in this build

- Server-side checks on writes and on reads.
- Zod validation before persistence.
- Prisma parameterized queries.
- React’s default escaping for rendered text.
- Auth.js CSRF protection on its credential callback, and same-origin server actions.
- HTTP-only session cookie, `SameSite=Lax`, and `Secure` in production.
- Login rate limit of 8 attempts per email and address per 15 minutes, stored in the database.
- Upload allow-list: PDF, plain text, CSV, PNG, JPEG, maximum 8 MB. Files are stored outside `public/` and downloaded through an authorized route.
- Security headers: `X-Frame-Options`, `nosniff`, referrer policy, and a locked-down permissions policy.
- Audit rows for invitations, reviews, stage changes, grants, approvals, and account archival.
- Account archival clears the password, biography, and expertise and replaces the name and email. Project history can remain.

## Privacy

The directory never shows email. Private profiles are omitted from recommendations. New challenges and projects default to a workspace classification; a participant cannot publish them programme-wide. The public site does not list members, projects, or documents.

## Threats and residual risk

| Threat | Current response | Residual risk |
| --- | --- | --- |
| Stolen password | bcrypt, rate limit, invitation-only registration | No second factor and no breached-password list |
| Forged cross-site request | Auth.js and server-action origin checks | Custom route handlers that later add POST must repeat the check |
| IDOR | Per-record authorization and 404 | A coding mistake in a new query can bypass it; add a test when adding a record type |
| Token leakage in the outbox | Outbox is administrator-only | Administrators can read reset links. Do not expose the outbox in production without a retention limit |
| Email or AI data leaving the institution | Both integrations are unwired | Turning them on requires a provider and a data-processing decision |
| Backup loss | Documented, not automated | No managed backup is configured in this repository |
| Content security policy | Not enforced | Next.js needs a nonce policy before a strict CSP is safe |

## Retention

Keep audit events for the operating period defined by the host institution. Archiving a user does not delete project history. A production host should define how long invitations, login attempts, outbox messages, and uploaded files are kept, and who may export them.

## Operational assumptions

- The host provides the JSON data file, TLS, and secret management.
- `AUTH_SECRET` is unique per environment.
- Demonstration seed data is never loaded into a real cohort.
- Institutional sponsors do not see a portfolio unless a person grants the project.
