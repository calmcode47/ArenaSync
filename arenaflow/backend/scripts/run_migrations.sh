#!/bin/bash
# run_migrations.sh
# Run this ONCE before deploying to production to initialize the Supabase schema.
# Usage: bash backend/scripts/run_migrations.sh

set -e

echo "[ ArenaFlow ] Running Alembic migrations against Supabase..."

cd "$(dirname "$0")/.."

# Verify DATABASE_MIGRATION_URL or DATABASE_URL is set
if [ -z "$DATABASE_MIGRATION_URL" ] && [ -z "$DATABASE_URL" ]; then
  echo "ERROR: Neither DATABASE_MIGRATION_URL nor DATABASE_URL is set in environment."
  exit 1
fi

# Run migrations
python -m alembic upgrade head

echo "[ ArenaFlow ] Migrations complete."
echo "[ ArenaFlow ] Run 'python -m app.db.init_db' to seed the admin user."
