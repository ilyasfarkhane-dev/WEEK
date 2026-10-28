# Deployment

## Configuration

Copy `.env.example` to the environment store used by the host. Set a new `AUTH_SECRET`. Do not commit it.

Application records live in `data/store.json` (or the path in `DATA_FILE`). Seed that file before the first sign-in, and keep the file on persistent disk. The Prisma schema is still read so the store knows the record shapes. It is not a database connection.

`GET /api/health` reports the JSON store. Use it for a load-balancer check. It does not require a session.

## Vercel

`vercel.json` tells the host to publish the Vite `dist` folder and to run the API as a function. Set `AUTH_SECRET` in the project environment before the first deploy. The build loads the demonstration records into the function. Those writes go to temporary disk and disappear when the function is recycled. Use Docker, with `data/store.json` on a volume, when the records need to last.

## Docker

`docker-compose.yml` starts the app and keeps `data/store.json` on a volume. `AUTH_SECRET` in that file is a placeholder. Replace it before anyone else can reach the host.

Build with the included `Dockerfile`. The image builds the Vite client and starts the API with `tsx`. Copy a seeded `data/store.json` onto the volume before the first sign-in.

## Backups

Copy `data/store.json` and `UPLOAD_DIR` on a schedule. Keep the copies where the application server cannot overwrite them. Restore by replacing the file and restarting the same release. Confirm a known project is readable by its member and hidden from another participant.

## Monitoring

Watch process restarts, HTTP 5xx responses, `/api/health`, and disk use for the JSON file and uploads. The audit log is inside `data/store.json`; copy that file if the host requires a separate trail.

There is no built-in error tracker. Add one at the host without sending project narratives to a third party unless that has been agreed.

## Recovery

If `data/store.json` is missing or unreadable, stop writes by taking the application out of service. Restore the latest copy of the file, then start the same release. Do not run the demonstration seed.

If an invitation or reset token is exposed, revoke the invitation or wait for the one-hour reset expiry, and ask the person to set a new password. Tokens in the data file are hashes. Tokens in the outbox are not. Restrict and rotate that view.

## Email and reminders

Leave `SMTP_HOST` empty until a provider and a processing agreement exist. The outbox will show `SKIPPED` or `FAILED`. Do not tell participants that a message was delivered.

Set `CRON_SECRET` and call `POST /api/cron/reminders` with `Authorization: Bearer <secret>` on a schedule if in-app deadline reminders should be created for everyone, not only when someone opens the dashboard. The dashboard also creates deduplicated reminders for the signed-in person.
