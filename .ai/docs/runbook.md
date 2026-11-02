# Runbook

Operator procedures for the production deployment described in `AGENTS.md` (Deployment target and resource limits).

- **Check the Apache vhost:** `ProxyAddHeaders` stays at its default `On`, so the client IP is appended to `X-Forwarded-For`.
- **Create the owner account** (public sign-up is off unless `ALLOW_SIGN_UP=true`; while it is on, the app logs a warning on the first auth request): set `ALLOW_SIGN_UP=true` in the systemd `EnvironmentFile` → `systemctl restart taskly` → sign up in the browser → remove the line (don't leave it empty: an empty value fails env validation) → restart again.
- **Reset a password** (offline: sets the new password and signs out every session of that user, both or neither). From a dev checkout after `npm ci`:
  1. Put `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `ANTHROPIC_API_KEY` of the target deployment in a private env file **outside the repo** (e.g. `/private/taskly-reset.env`), `chmod 600`. Never paste its contents into logs or tracker messages.
  2. VPS: `sudo systemctl stop taskly` and wait until it has exited. It stays stopped through step 5, so no in-flight sign-in can create a session after the revocation.
  3. Dev machine, another terminal: `ssh -N -L 5433:127.0.0.1:5432 <vps>`.
  4. Repo root, interactive terminal: `DATABASE_URL=postgres://…@127.0.0.1:5433/taskly npm run auth:set-password -- --env-file /private/taskly-reset.env owner@example.com`, then type the new password twice (no echo). Exported variables win over the file, so this `DATABASE_URL` targets the tunnel; use a shell without the dev `.env` exported, since any variable already set (even empty) also wins.
  5. Done only on exit 0 with "Password updated; all sessions signed out". On failure nothing is committed: fix the reported problem and retry, service still stopped.
  6. VPS: `sudo systemctl start taskly`, also when giving up. Check that the new password signs in and that a browser signed in before the reset lands on `/sign-in`. Close the tunnel.

  Pass the env file as an absolute path (a relative one resolves against the repo root). A missing or unreadable file fails at once with Node's own `node: <path>: not found` (exit 9). Piped input is refused ("Run this in an interactive terminal…"), and so is an account without password sign-in; neither changes anything. npm echoes the command line, so the email and env-file path show in the terminal; the password never does. Only Backspace edits in the password prompt; arrow, Delete and other editing keys abort it with nothing changed.
