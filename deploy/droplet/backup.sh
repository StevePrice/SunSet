#!/bin/sh
# Nightly database backup to Cloudflare R2 (Phase 7a). Runs in the `backup` service of
# compose.yaml. Each night at BACKUP_HOUR (UTC):
#   1. pg_dump the database in custom format (compressed, restorable table by table),
#   2. check the dump is readable (pg_restore --list), so a broken backup is noticed the same night,
#   3. upload it to the R2 bucket as sunset-YYYY-MM-DD.dump,
#   4. delete backups older than BACKUP_KEEP_DAYS.
# Photos and recordings already live in R2; this covers the database. Restore: docs/backups.md.
# Run once now: docker compose run --rm backup now
set -eu

BACKUP_HOUR="${BACKUP_HOUR:-10}"          # 10:00 UTC, early morning in the US
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto
R2="--endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

backup() {
  day="$(date -u +%F)"
  file="/tmp/sunset-${day}.dump"
  echo "$(date -u +%FT%TZ) backing up to ${file}"
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h db -U sunset -d sunset -Fc -f "$file"
  pg_restore --list "$file" > /dev/null
  aws $R2 s3 cp "$file" "s3://${R2_BACKUP_BUCKET}/sunset-${day}.dump" --only-show-errors
  echo "$(date -u +%FT%TZ) uploaded sunset-${day}.dump ($(du -h "$file" | cut -f1))"
  rm -f "$file"

  cutoff="$(date -u -d "@$(( $(date +%s) - BACKUP_KEEP_DAYS * 86400 ))" +%F)"
  aws $R2 s3 ls "s3://${R2_BACKUP_BUCKET}/" | awk '{print $4}' | while read -r key; do
    d="$(echo "$key" | sed -n 's/^sunset-\([0-9-]*\)\.dump$/\1/p')"
    if [ -n "$d" ] && [ "$d" \< "$cutoff" ]; then
      aws $R2 s3 rm "s3://${R2_BACKUP_BUCKET}/${key}" --only-show-errors && echo "deleted ${key}"
    fi
  done
}

if [ "${1:-}" = "now" ]; then
  backup
  exit 0
fi

while :; do
  now="$(date -u +%s)"
  next="$(date -u -d "$(date -u +%F) ${BACKUP_HOUR}:00:00" +%s)"
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  # A failed night is logged and retried the next night; the container keeps running.
  backup || echo "$(date -u +%FT%TZ) BACKUP FAILED"
done
