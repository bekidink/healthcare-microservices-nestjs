#!/usr/bin/env node
// Runs at container startup, before pm2-runtime starts the app processes
// (see entrypoint.sh) — Render's free plan doesn't support preDeployCommand,
// so this has to happen on every boot instead of once per deploy. That
// means it runs on every free-tier cold start too, so it's written to be
// idempotent and safe to repeat: creates the 4 logical databases if they
// don't already exist (Render's free Postgres plan only provisions one
// database, so there's no init-databases.sh entrypoint hook like the local
// docker-compose Postgres image gets), then runs each service's own
// `prisma migrate deploy` against its own database (a no-op once already
// applied). Retries the initial connection a few times in case the free
// Postgres instance is still waking up from its own idle spin-down.
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(baseUrl, attempts = 5, delayMs = 3000) {
  for (let i = 1; i <= attempts; i++) {
    const client = new Client({ connectionString: baseUrl });
    try {
      await client.connect();
      return client;
    } catch (err) {
      console.warn(`[migrate-all] db connect attempt ${i}/${attempts} failed: ${err.message}`);
      if (i === attempts) throw err;
      await sleep(delayMs);
    }
  }
}

async function ensureDatabases(baseUrl, dbNames) {
  const client = await connectWithRetry(baseUrl);
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
    // Direct binary invocation, not `pnpm exec` — the runtime image never
    // primes corepack's pnpm download during the build, so `pnpm exec` at
    // container startup would try (and, in a network-restricted runtime,
    // fail) to fetch pnpm itself before it could even run prisma.
    execSync('node_modules/.bin/prisma migrate deploy', {
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
