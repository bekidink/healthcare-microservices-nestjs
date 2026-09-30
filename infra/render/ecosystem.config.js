// pm2-runtime process list for the single free Render web service: all 5
// backend processes run inside one container so none of them need to be a
// (paid-only) Render private service. Only `gateway` binds Render's public
// $PORT; the rest listen on fixed ports reachable over localhost within
// this same container, exactly like non-Docker local dev.
const path = require('path');
const { withDb } = require('./db-url');

const baseDatabaseUrl = process.env.DATABASE_URL || '';
const appDir = (name) => path.join(__dirname, '..', '..', 'apps', name);

module.exports = {
  apps: [
    {
      name: 'gateway',
      cwd: appDir('gateway'),
      script: 'dist/main.js',
      env: {
        PORT: process.env.PORT || '10000',
        IDENTITY_SERVICE_URL: 'http://localhost:3001',
        FACILITY_SERVICE_URL: 'http://localhost:3002',
        PATIENT_SERVICE_URL: 'http://localhost:3003',
        SCHEDULING_SERVICE_URL: 'http://localhost:3004',
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
        CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
      },
    },
    {
      name: 'identity',
      cwd: appDir('identity'),
      script: 'dist/main.js',
      env: {
        PORT: '3001',
        DATABASE_URL: withDb(baseDatabaseUrl, 'identity_db'),
        KAFKA_CLIENT_ID: 'identity-service',
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '30d',
      },
    },
    {
      name: 'facility',
      cwd: appDir('facility'),
      script: 'dist/main.js',
      env: {
        PORT: '3002',
        DATABASE_URL: withDb(baseDatabaseUrl, 'facility_db'),
        KAFKA_CLIENT_ID: 'facility-service',
      },
    },
    {
      name: 'patient',
      cwd: appDir('patient'),
      script: 'dist/main.js',
      env: {
        PORT: '3003',
        DATABASE_URL: withDb(baseDatabaseUrl, 'patient_db'),
        KAFKA_CLIENT_ID: 'patient-service',
      },
    },
    {
      name: 'scheduling',
      cwd: appDir('scheduling'),
      script: 'dist/main.js',
      env: {
        PORT: '3004',
        DATABASE_URL: withDb(baseDatabaseUrl, 'scheduling_db'),
        KAFKA_CLIENT_ID: 'scheduling-service',
        FACILITY_SERVICE_URL: 'http://localhost:3002',
      },
    },
  ],
};
