# Database backups (Phase 7a)

Photos and recordings live in Cloudflare R2 already. The database (accounts, sunsets, stories,
reactions, places) lives in Postgres on the Droplet, and is backed up every night to a separate R2
bucket by the `backup` service in `deploy/droplet/compose.yaml` (script: `deploy/droplet/backup.sh`).

Each night at 10:00 UTC it dumps the database, checks the dump can be read, uploads it as
`sunset-YYYY-MM-DD.dump`, and deletes dumps older than 30 days. A failed night is logged as
`BACKUP FAILED` and tried again the next night.

## 1. Set up (once)

**a. A bucket for backups (Cloudflare dashboard).** R2 > Create bucket > `sunset-backups`. Keep it
separate from `sunset-photos`, so the app's own credentials can never touch the backups.

**b. A token that can only write backups.** R2 > Manage R2 API Tokens > Create API token:
- Permissions: **Object Read & Write**
- Specify bucket: **sunset-backups** only
- Copy the **Access Key ID** and **Secret Access Key** (shown once). The account ID is on the R2 overview page.

**c. On the Droplet**, in `/opt/sunset`:

```sh
# Copy the updated compose.yaml and backup.sh into /opt/sunset first (scp, or git pull if it's a checkout).
cat >> .env <<'ENV'
R2_ACCOUNT_ID=...
R2_BACKUP_ACCESS_KEY_ID=...
R2_BACKUP_SECRET_ACCESS_KEY=...
ENV
docker compose up -d backup
docker compose run --rm backup now     # one backup right away, to check it works
docker compose logs backup             # "uploaded sunset-YYYY-MM-DD.dump (...)"
```

## 2. Restore drill (before the beta, then every few months)

A backup only counts once it has been restored. This restores the latest dump into a scratch
database on the same server and compares row counts, without touching the live database.

```sh
cd /opt/sunset
docker compose run --rm --entrypoint sh backup -ec '
  apk add --no-cache aws-cli >/dev/null
  export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto
  R2="--endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
  latest=$(aws $R2 s3 ls s3://$R2_BACKUP_BUCKET/ | awk "{print \$4}" | sort | tail -1)
  aws $R2 s3 cp s3://$R2_BACKUP_BUCKET/$latest /tmp/latest.dump --only-show-errors
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql -h db -U sunset -d postgres -c "DROP DATABASE IF EXISTS sunset_restore_test" -c "CREATE DATABASE sunset_restore_test"
  psql -h db -U sunset -d sunset_restore_test -c "CREATE EXTENSION IF NOT EXISTS postgis"
  pg_restore -h db -U sunset -d sunset_restore_test --no-owner /tmp/latest.dump
  for t in users entries shares reactions places; do
    echo "$t: live $(psql -h db -U sunset -d sunset -tAc "select count(*) from $t") restored $(psql -h db -U sunset -d sunset_restore_test -tAc "select count(*) from $t")"
  done
  psql -h db -U sunset -d postgres -c "DROP DATABASE sunset_restore_test"
'
```

The counts should match, or differ only by what changed since the backup. `pg_restore` may warn
that the PostGIS extension or `spatial_ref_sys` already exist; that's expected.

## 3. A real restore (if the live database is lost)

1. Put the app in a safe state: stop writes by pausing the scoring queue consumer if needed.
2. Download the dump you want (as in the drill above).
3. Restore into a fresh `sunset` database as the `sunset` superuser, then re-run the role grants in
   `docs/ci-credentials.md` section 3 (ownership to `sunset_migrator`, data rights to `sunset_app`).
4. Check `https://staging.sunsetsoul.app/api/health` and open a Journal.

Anything saved after the backup (at most a day) is lost from the database; photos and recordings
saved since are still in R2 but won't appear until their rows are recreated.
