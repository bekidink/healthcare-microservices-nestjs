// pm2-runtime process list for the single free Render web service: all 8
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
        CLINICAL_SERVICE_URL: 'http://localhost:3005',
        LAB_SERVICE_URL: 'http://localhost:3006',
        PHARMACY_SERVICE_URL: 'http://localhost:3007',
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
    {
      name: 'clinical',
      cwd: appDir('clinical'),
      script: 'dist/main.js',
      env: {
        PORT: '3005',
        DATABASE_URL: withDb(baseDatabaseUrl, 'clinical_db'),
        KAFKA_CLIENT_ID: 'clinical-service',
        SCHEDULING_SERVICE_URL: 'http://localhost:3004',
      },
    },
    {
      name: 'lab',
      cwd: appDir('lab'),
      script: 'dist/main.js',
      env: {
        PORT: '3006',
        DATABASE_URL: withDb(baseDatabaseUrl, 'lab_db'),
        KAFKA_CLIENT_ID: 'lab-service',
        CLINICAL_SERVICE_URL: 'http://localhost:3005',
      },
    },
    {
      name: 'pharmacy',
      cwd: appDir('pharmacy'),
      script: 'dist/main.js',
      env: {
        PORT: '3007',
        DATABASE_URL: withDb(baseDatabaseUrl, 'pharmacy_db'),
        KAFKA_CLIENT_ID: 'pharmacy-service',
        CLINICAL_SERVICE_URL: 'http://localhost:3005',
      },
    },
  ],
};
