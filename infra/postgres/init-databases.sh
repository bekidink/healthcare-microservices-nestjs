#!/bin/bash
# Creates one Postgres database per service. Local-dev only: services still
# only ever connect to their own database via their own DATABASE_URL — this
# script exists purely so a single Postgres container can host all of them,
# it does not imply cross-service queries are permitted.
set -e

DATABASES=(
  identity_db
  facility_db
  patient_db
  scheduling_db
  clinical_db
  orders_db
  pharmacy_db
  lab_db
  imaging_db
  inpatient_db
  emergency_db
  finance_db
  supply_db
  communication_db
  analytics_db
  interoperability_db
  ai_db
)

for db in "${DATABASES[@]}"; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE $db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
done
