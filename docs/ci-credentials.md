# Credentials for the "Deploy to staging" workflow (phase 5c)

The workflow in `.github/workflows/deploy-staging.yml` replaces the full-account token and root SSH
key on the dev machine with three narrow credentials. Create them once, then add them as secrets of
a GitHub environment named `staging` (Settings > Environments > New environment). Consider requiring
a reviewer on that environment, so a run waits for approval.

## 1. Cloudflare API token (`CLOUDFLARE_API_TOKEN`, plus `CLOUDFLARE_ACCOUNT_ID`)

Use an **account-owned** token, so it belongs to the account rather than to your login.

1. In the Cloudflare dashboard, open the account, then in the left sidebar go to **Manage Account >
   Account API Tokens**. (Only Super Administrators see this. A user token, under the profile icon at
   top right > **Profile > API Tokens**, also works but is tied to your login.)
2. **Create Token**, then at the bottom choose **Create Custom Token > Get started**.
3. Name it something like `sunset-ci-staging-deploy`.
4. Permissions (one row each, all of type **Account**):
   - **Workers Scripts** > **Edit** (the API docs call this "Workers Scripts Write")
   - **Account Settings** > **Read** (wrangler reads the account)
5. Account resources: **Include** > this account only. Add a TTL or client IP filter if you like.
6. **Continue to summary > Create Token**. Copy the token now. It is shown only once.

The **Edit Cloudflare Workers** template is the quick route, but it also grants KV, R2, routes and
more. Use it only if the custom token turns out to be missing something.
- Not needed: Workers Routes, DNS, R2, Queues, Hyperdrive. The route, bindings and secrets already
  exist; a deploy only uploads the script and keeps them (`wrangler.jsonc` lists them and wrangler
  checks them on upload). If a deploy complains about a missing permission, add that one permission
  rather than widening to "edit everything".
- Worker secrets (`BETTER_AUTH_SECRET`, `ADMIN_EMAILS`, ...) stay set on the Worker; CI never sees them.

`CLOUDFLARE_ACCOUNT_ID`: on the account home page, open the **⋯** menu next to the account name and choose
**Copy account ID**. It is also in the right-hand column of **Workers & Pages** and in the dashboard URL
(`dash.cloudflare.com/<account-id>/...`). It isn't secret, but keep it with the rest.

## 2. A forward-only SSH user on the Droplet (`STAGING_DB_SSH_USER`, `STAGING_DB_SSH_KEY`, `STAGING_DB_SSH_KNOWN_HOSTS`)

Migrations reach Postgres the way `scripts/staging-db.sh` does, through an SSH tunnel, but as a user
that can do nothing else. On the Droplet:

```sh
adduser --disabled-password --shell /usr/sbin/nologin sunset-ci
install -d -m 700 -o sunset-ci -g sunset-ci /home/sunset-ci/.ssh
```

Make a key pair on your machine (`ssh-keygen -t ed25519 -f sunset-ci -N ""`) and put the public key
in `/home/sunset-ci/.ssh/authorized_keys` with restrictions on one line:

```
restrict,port-forwarding,permitopen="172.22.0.2:5432" ssh-ed25519 AAAA... sunset-ci
```

`restrict` turns off shell, agent and X11; `permitopen` allows forwarding to the database only. Set:
`STAGING_DB_SSH_USER` = `sunset-ci`, `STAGING_DB_SSH_KEY` = the private key file's contents,
`STAGING_DB_SSH_KNOWN_HOSTS` = the output of `ssh-keyscan -t ed25519 165.232.151.187`.
(If `sshd` is set to `AllowUsers`, add `sunset-ci`.)

## 3. Separate database roles (`STAGING_DB_MIGRATOR_URL`, `STAGING_DB_CA_PEM`)

**Why:** the Postgres image makes `POSTGRES_USER` (`sunset`, in `deploy/droplet/compose.yaml`) the
bootstrap superuser, and it owns every table. A superuser ignores permission checks, so as long as
Hyperdrive and CI both connect as `sunset`, either one can do anything. The end state:

| Role              | Superuser | Owns                         | Used by                          |
|-------------------|-----------|------------------------------|----------------------------------|
| `sunset`          | yes       | the database, PostGIS        | people only (manual admin, `scripts/staging-db.sh`) |
| `sunset_migrator` | no        | all app tables, `drizzle`    | CI migrations                    |
| `sunset_app`      | no        | nothing; data rights only    | Hyperdrive (the running app)     |

The database has only tables and the PostGIS extension (no sequences, enums, functions or views).
`spatial_ref_sys` belongs to PostGIS and stays with `sunset`. A future migration that runs
`CREATE EXTENSION` must be run by hand as `sunset`.

Do the steps in order. Steps a–c don't change anything the app uses; step d is the switch, and it
can be undone with one command.

### a. Make two passwords (Mac)

Hex, so they need no escaping in a URL:

```sh
umask 077
openssl rand -hex 24 > ~/.config/sunset/db-app-password
openssl rand -hex 24 > ~/.config/sunset/db-migrator-password
```

### b. Create the roles and grant data rights (Droplet)

`cd /opt/sunset && docker compose exec db psql -U sunset -d sunset`, then:

```sql
BEGIN;
CREATE ROLE sunset_app      LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE sunset_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public TO sunset_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sunset_app;
REVOKE INSERT, UPDATE, DELETE ON public.spatial_ref_sys FROM sunset_app;
GRANT USAGE, CREATE ON SCHEMA public TO sunset_migrator;
-- drizzle-kit runs CREATE SCHEMA IF NOT EXISTS drizzle on every migrate, and Postgres checks this
-- right before it checks whether the schema exists:
GRANT CREATE ON DATABASE sunset TO sunset_migrator;
COMMIT;
\password sunset_app
\password sunset_migrator
```

At each `\password` prompt, paste the matching password from step a (`pbcopy <
~/.config/sunset/db-app-password` copies it on the Mac).

### c. Check the app role can log in (Droplet)

`-h localhost` makes psql use a password over TCP, as Hyperdrive does:

```sh
docker compose exec db psql -h localhost -U sunset_app -d sunset -c 'SELECT count(*) FROM users;'
docker compose exec db psql -h localhost -U sunset_app -d sunset -c 'CREATE TABLE x (id int);'   # must fail: permission denied
```

### d. Point Hyperdrive at `sunset_app` (Mac)

```sh
cd apps/web
npx wrangler hyperdrive update 60f126f5bbb9486c94faafde3a0f7f3d \
  --origin-user sunset_app --origin-password "$(cat ~/.config/sunset/db-app-password)"
```

Then sign in on https://staging.sunsetsoul.app, save an entry, share it, delete it, and open /admin.
**To undo:** run the same command with `--origin-user sunset --origin-password "$(cat ~/.config/sunset/db-password)"`.

### e. Give the tables to `sunset_migrator` (Droplet, in psql as `sunset`)

Only after step d works. Existing grants to `sunset_app` carry over when the owner changes.

```sql
BEGIN;
ALTER SCHEMA drizzle OWNER TO sunset_migrator;
ALTER TABLE drizzle.__drizzle_migrations OWNER TO sunset_migrator;
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables
           WHERE schemaname = 'public' AND tablename <> 'spatial_ref_sys'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO sunset_migrator', t);
  END LOOP;
END $$;
-- Tables and sequences that future migrations create get the same data rights automatically:
ALTER DEFAULT PRIVILEGES FOR ROLE sunset_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sunset_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sunset_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO sunset_app;
COMMIT;
```

Check: the `pg_tables` query from before should show `sunset_migrator` for every table except
`spatial_ref_sys`, and `\dp public.users` should list `sunset_app=arwd`.

### f. Set the two secrets (Mac)

```sh
gh secret set STAGING_DB_MIGRATOR_URL --env staging --body "postgres://sunset_migrator:$(cat ~/.config/sunset/db-migrator-password)@127.0.0.1:15432/sunset?uselibpqcompat=true&sslmode=verify-ca&sslrootcert=/tmp/origin_ca.pem"
gh secret set STAGING_DB_CA_PEM --env staging < ~/.config/sunset/origin_ca_rsa_root.pem
```

The workflow writes `STAGING_DB_CA_PEM` to `/tmp/origin_ca.pem` and opens the tunnel on port 15432.

### g. Test a migration as `sunset_migrator` (Mac)

With nothing pending, this only checks it can connect and read the migrations table:

```sh
ssh -i ~/.ssh/id_ed25519 -f -N -L 127.0.0.1:15432:172.22.0.2:5432 root@165.232.151.187
DATABASE_URL="postgres://sunset_migrator:$(cat ~/.config/sunset/db-migrator-password)@127.0.0.1:15432/sunset?uselibpqcompat=true&sslmode=verify-ca&sslrootcert=$HOME/.config/sunset/origin_ca_rsa_root.pem" \
  npm run db:migrate --workspace=@sunset/web
pkill -f "15432:172.22.0.2:5432"
```

`scripts/staging-db.sh` still connects as `sunset`, which is right for one-off admin scripts.

## 4. A staging test account (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`)

Sign up an ordinary account (not an admin) on staging and verify its email. The smoke tests sign in
as it, save one entry, share it and delete it again. Staging email can't be read by CI, so the
sign-up and verification steps only run in the local/CI copy of the app.

## Rolling back

A failed smoke test runs `wrangler rollback`, which restores the previous Worker version. It does not
undo migrations, so keep each migration compatible with the previous app version.
