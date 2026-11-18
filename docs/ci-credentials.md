# Credentials for the "Deploy to staging" workflow (phase 5c)

The workflow in `.github/workflows/deploy-staging.yml` replaces the full-account token and root SSH
key on the dev machine with three narrow credentials. Create them once, then add them as secrets of
a GitHub environment named `staging` (Settings > Environments > New environment). Consider requiring
a reviewer on that environment, so a run waits for approval.

## 1. Cloudflare API token (`CLOUDFLARE_API_TOKEN`, plus `CLOUDFLARE_ACCOUNT_ID`)

Cloudflare dashboard > My Profile > API Tokens > Create Token > Custom token.

- Permissions: Account > **Workers Scripts: Edit**, Account > **Account Settings: Read** (wrangler reads the account).
- Account resources: include only this account. Add a TTL if you like.
- Not needed: Workers Routes, DNS, R2, Queues, Hyperdrive. The route, bindings and secrets already
  exist; a deploy only uploads the script and keeps them (`wrangler.jsonc` lists them and wrangler
  checks them on upload). If a deploy complains about a missing permission, add that one permission
  rather than widening to "edit everything".
- Worker secrets (`BETTER_AUTH_SECRET`, `ADMIN_EMAILS`, ...) stay set on the Worker; CI never sees them.

`CLOUDFLARE_ACCOUNT_ID` is on the dashboard's Workers overview page (not secret, but kept with the rest).

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

## 3. A schema-only database role (`STAGING_DB_MIGRATOR_URL`, `STAGING_DB_CA_PEM`)

The migrator needs to change the schema and record migrations, but not to read or edit people's
data. Postgres cannot say "DDL but no SELECT" for tables someone else owns, so make the migrator the
**owner** of the schema objects instead and give the app role (`sunset`, used by Hyperdrive) data
rights only. On the Droplet, as a superuser, once:

```sql
CREATE ROLE sunset_migrator LOGIN PASSWORD '...';
-- Take ownership of what exists (run for each table, or use REASSIGN OWNED BY sunset TO sunset_migrator
-- if sunset owns nothing but the app's tables).
REASSIGN OWNED BY sunset TO sunset_migrator;
GRANT ALL ON SCHEMA public, drizzle TO sunset_migrator;
-- The app role keeps working with data, but can no longer change the schema:
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sunset;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO sunset;
ALTER DEFAULT PRIVILEGES FOR ROLE sunset_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sunset;
```

Check these against the live database before running them: PostGIS tables (`spatial_ref_sys`) and
the `drizzle` migrations schema may need their own grants, and whether `CREATE EXTENSION` (migration
0000) needs a superuser the first time only. Try the role with `scripts/staging-db.sh` first, using
a migration that does nothing.

`STAGING_DB_MIGRATOR_URL` is then:
`postgres://sunset_migrator:PASSWORD@127.0.0.1:15432/sunset?uselibpqcompat=true&sslmode=verify-ca&sslrootcert=/tmp/origin_ca.pem`
(the workflow writes `STAGING_DB_CA_PEM`, the contents of `~/.config/sunset/origin_ca_rsa_root.pem`,
to `/tmp/origin_ca.pem`).

## 4. A staging test account (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`)

Sign up an ordinary account (not an admin) on staging and verify its email. The smoke tests sign in
as it, save one entry, share it and delete it again. Staging email can't be read by CI, so the
sign-up and verification steps only run in the local/CI copy of the app.

## Rolling back

A failed smoke test runs `wrangler rollback`, which restores the previous Worker version. It does not
undo migrations, so keep each migration compatible with the previous app version.
