# Runbook

Operator procedures for the production deployment described in `packages/app/AGENTS.md` (Build and deployment).

- **Check the Apache vhost:** `ProxyAddHeaders` stays at its default `On`, so the client IP is appended to `X-Forwarded-For`.
- **Check that the app sees client addresses** (after every deploy and Apache change): sign in once through the public URL, then `sudo journalctl -u taskly --since today | grep "could not determine a client IP"` must print nothing. A match means Apache sent no `X-Forwarded-For`: every client then shares one sign-in bucket (5 attempts per minute), so a stranger's failed attempts lock the owner out. Fix the vhost and restart Apache.
- **Sign-in limit** (built in, nothing to configure): 5 attempts per minute per client address on `POST /api/auth/sign-in/email`, counting right and wrong passwords alike; the 6th gets 429 and the form says how many seconds to wait. The counters live in memory, so `systemctl restart taskly` clears them, e.g. when the owner has locked themselves out.
- **Optional: ban repeat offenders with fail2ban.** It reads Apache's access log, which has the real client address, so it keeps working if `X-Forwarded-For` breaks. `sudo apt install fail2ban`, then (adjust `logpath` to the vhost's `CustomLog`):

  `/etc/fail2ban/filter.d/taskly-auth.conf`

  ```ini
  [Definition]
  failregex = ^<HOST> -[^"]*"POST /api/auth/\S+ HTTP/[^"]+" (?:401|429)\s
  ```

  fail2ban cuts the `[timestamp]` out of each line before it applies `failregex`, so the regex must not mention it. Change the regex only together with a `fail2ban-regex` run on sample lines.

  `/etc/fail2ban/jail.d/taskly-auth.local`

  ```ini
  [taskly-auth]
  enabled = true
  port = http,https
  filter = taskly-auth
  logpath = /var/log/apache2/access.log
  findtime = 10m
  maxretry = 10
  bantime = 1h
  ```

  `sudo systemctl restart fail2ban`, then `sudo fail2ban-regex /var/log/apache2/access.log taskly-auth` (after one deliberate wrong sign-in, it must report at least one match) and `sudo fail2ban-client status taskly-auth`. Unban an address with `sudo fail2ban-client set taskly-auth unbanip <address>`.
- **Create the owner account** (public sign-up is off unless `ALLOW_SIGN_UP=true`; while it is on, the app logs a warning on the first auth request): set `ALLOW_SIGN_UP=true` in the systemd `EnvironmentFile` → `systemctl restart taskly` → sign up in the browser → remove the line (don't leave it empty: an empty value fails env validation) → restart again.
- **Reset a password** (offline: sets the new password and signs out every session of that user, both or neither). The command needs only `DATABASE_URL`: the database credentials are the one secret that leaves the VPS, and only for the reset. From a dev checkout after `npm ci`:
  1. Create a private env file **outside the repo** (e.g. `/private/taskly-reset.env`), `chmod 600`, with one line: `DATABASE_URL=postgres://<user>:<password>@127.0.0.1:5433/<database>`, taking the user, password and database from `DATABASE_URL` in the systemd `EnvironmentFile` and pointing host and port at the tunnel of step 3. Copy nothing else: the reset does not use `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` or `ANTHROPIC_API_KEY`. Never paste the file's contents into logs or tracker messages.
  2. VPS: `sudo systemctl stop taskly` and wait until it has exited. It stays stopped through step 5, so no in-flight sign-in can create a session after the revocation.
  3. Dev machine, another terminal: `ssh -N -L 5433:127.0.0.1:5432 <vps>`.
  4. Repo root, interactive terminal: `npm run auth:set-password -- --env-file /private/taskly-reset.env owner@example.com`, then type the new password twice (no echo). Use a shell without the dev `.env` exported: any variable already set (even empty) wins over the file.
  5. Done only on exit 0 with "Password updated; all sessions signed out". On failure nothing is committed: fix the reported problem and retry, service still stopped.
  6. VPS: `sudo systemctl start taskly`, also when giving up. Check that the new password signs in and that a browser signed in before the reset lands on `/sign-in`. Close the tunnel.
  7. Delete the env file (`rm /private/taskly-reset.env`), also when giving up.

  Pass the env file as an absolute path (a relative one resolves against the repo root). A missing or unreadable file fails at once with Node's own `node: <path>: not found` (exit 9). Piped input is refused ("Run this in an interactive terminal…"), and so is an account without password sign-in; neither changes anything. npm echoes the command line, so the email and env-file path show in the terminal; the password never does. Only Backspace edits in the password prompt; arrow, Delete and other editing keys abort it with nothing changed.
