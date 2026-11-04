#!/bin/sh
# Runs a command with DATABASE_URL pointing at the staging database, through an SSH tunnel to the
# Droplet that closes afterwards.
#   scripts/staging-db.sh node scripts/set-role.mjs someone@example.com admin
set -e
ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes -o ExitOnForwardFailure=yes -f -N -L 127.0.0.1:15432:172.22.0.2:5432 root@165.232.151.187
trap 'pkill -f "15432:172.22.0.2:5432"' EXIT
sleep 1
DATABASE_URL="postgres://sunset:$(cat ~/.config/sunset/db-password)@127.0.0.1:15432/sunset?uselibpqcompat=true&sslmode=verify-ca&sslrootcert=$HOME/.config/sunset/origin_ca_rsa_root.pem" "$@"
