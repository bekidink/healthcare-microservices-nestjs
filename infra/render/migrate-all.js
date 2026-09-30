#!/usr/bin/env node
// Render preDeployCommand for the single free web service: creates the 4
// logical databases on first run (Render's free Postgres plan only
// provisions one database, so there's no init-databases.sh entrypoint hook
// like the local docker-compose Postgres image gets) and then runs each
// service's own `prisma migrate deploy` against its own database.
const { execSync } = require('child_process');
const path = require('path');
const { Client } = require('pg');
const { withDb } = require('./db-url');

const SERVICES = {
  identity: 'identity_db',
  facility: 'facility_db',
  patient: 'patient_db',
  scheduling: 'scheduling_db',
};

async function ensureDatabases(baseUrl, dbNames) {
  const client = new Client({ connectionString: baseUrl });
  await client.connect();
  for (const name of dbNames) {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (rowCount === 0) {
      console.log(`[migrate-all] creating database ${name}`);
      await client.query(`CREATE DATABASE "${name}"`);
    }
  }
  await client.end();
}

async function main() {
  const base = process.env.DATABASE_URL;
  if (!base) {
    console.error('[migrate-all] DATABASE_URL not set');
    process.exit(1);
  }

  await ensureDatabases(base, Object.values(SERVICES));

  for (const [service, dbName] of Object.entries(SERVICES)) {
    const url = withDb(base, dbName);
    console.log(`[migrate-all] ${service} -> ${dbName}`);
    execSync('pnpm exec prisma migrate deploy', {
      cwd: path.join(__dirname, '..', '..', 'apps', service),
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: url },
    });
  }
}

main().catch((err) => {
  console.error('[migrate-all] failed:', err);
  process.exit(1);
});
