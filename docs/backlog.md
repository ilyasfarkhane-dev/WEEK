# Backlog

The core journeys run without these items. They are the next production decisions, not hidden behaviour.

- Add a second factor or require the institutional identity provider for administrators.
- Install a real SMTP or transactional client inside `src/lib/email.ts`, and record the provider’s acceptance before showing a message as sent.
- Add a strict content security policy with nonces.
- Translate the interface into French and Arabic. The locale and direction hooks are already stored.
- Replace the in-process reminder scan with a supervised job runner.
- Add file scanning and virus checks before an upload is stored.
- Let a reviewed resource be published on the public site only after a separate approval. Programme visibility is still members-only.
- Add field-level version diff for long text, beyond the current side-by-side section comparison.
- Store stage-transition times so “tests within 90 days” can use the moment testing began rather than the project’s creation date.
- Add a retention job for login attempts, expired invitations, and the email outbox.
- Review the rate-limit table under concurrent sign-in. It is correct for a single server and can under-count across many instances.
- Commission an external penetration test before a real cohort is invited.
