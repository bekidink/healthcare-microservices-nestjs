import type { Express } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { REQUEST_ID_HEADER } from '@healthcare/shared';

/**
 * Route table mapping a public, versioned path prefix to a downstream
 * service. As new services come online they're added here rather than the
 * gateway growing per-route logic of its own — the gateway stays a thin
 * routing/auth-context layer, never a place business logic accumulates.
 *
 * `downstreamPrefix` is what the target service's own route table actually
 * expects (e.g. identity's AuthController is mounted at `/auth`). Note:
 * Express's `app.use(prefix, ...)` already strips `prefix` from `req.url`
 * before the proxy middleware ever sees it — so rewriting is "re-add
 * downstreamPrefix to whatever's left", not a regex over the original path.
 */
const IDENTITY_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';
const FACILITY_URL = process.env.FACILITY_SERVICE_URL || 'http://localhost:3002';
const PATIENT_URL = process.env.PATIENT_SERVICE_URL || 'http://localhost:3003';
const SCHEDULING_URL = process.env.SCHEDULING_SERVICE_URL || 'http://localhost:3004';
const CLINICAL_URL = process.env.CLINICAL_SERVICE_URL || 'http://localhost:3005';
const LAB_URL = process.env.LAB_SERVICE_URL || 'http://localhost:3006';
const PHARMACY_URL = process.env.PHARMACY_SERVICE_URL || 'http://localhost:3007';
const FINANCE_URL = process.env.FINANCE_SERVICE_URL || 'http://localhost:3008';
const COMMUNICATION_URL = process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3009';
const INPATIENT_URL = process.env.INPATIENT_SERVICE_URL || 'http://localhost:3010';
const SUPPLY_URL = process.env.SUPPLY_SERVICE_URL || 'http://localhost:3011';
const INTEROP_URL = process.env.INTEROP_SERVICE_URL || 'http://localhost:3012';
const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3013';

const ROUTES: { prefix: string; target: string; downstreamPrefix: string }[] = [
  { prefix: '/api/v1/auth', target: IDENTITY_URL, downstreamPrefix: '/auth' },
  { prefix: '/api/v1/users', target: IDENTITY_URL, downstreamPrefix: '/users' },
  { prefix: '/api/v1/organizations', target: FACILITY_URL, downstreamPrefix: '/organizations' },
  { prefix: '/api/v1/facilities', target: FACILITY_URL, downstreamPrefix: '/facilities' },
  { prefix: '/api/v1/departments', target: FACILITY_URL, downstreamPrefix: '/departments' },
  { prefix: '/api/v1/patients', target: PATIENT_URL, downstreamPrefix: '/patients' },
  { prefix: '/api/v1/merge-cases', target: PATIENT_URL, downstreamPrefix: '/merge-cases' },
  { prefix: '/api/v1/appointment-types', target: SCHEDULING_URL, downstreamPrefix: '/appointment-types' },
  { prefix: '/api/v1/schedule-slots', target: SCHEDULING_URL, downstreamPrefix: '/schedule-slots' },
  { prefix: '/api/v1/appointments', target: SCHEDULING_URL, downstreamPrefix: '/appointments' },
  { prefix: '/api/v1/queue', target: SCHEDULING_URL, downstreamPrefix: '/queue' },
  { prefix: '/api/v1/reminders', target: SCHEDULING_URL, downstreamPrefix: '/reminders' },
  { prefix: '/api/v1/encounters', target: CLINICAL_URL, downstreamPrefix: '/encounters' },
  { prefix: '/api/v1/notes', target: CLINICAL_URL, downstreamPrefix: '/notes' },
  { prefix: '/api/v1/problems', target: CLINICAL_URL, downstreamPrefix: '/problems' },
  { prefix: '/api/v1/lab-orders', target: LAB_URL, downstreamPrefix: '/lab-orders' },
  { prefix: '/api/v1/lab-order-items', target: LAB_URL, downstreamPrefix: '/lab-order-items' },
  { prefix: '/api/v1/specimens', target: LAB_URL, downstreamPrefix: '/specimens' },
  { prefix: '/api/v1/results', target: LAB_URL, downstreamPrefix: '/results' },
  { prefix: '/api/v1/prescriptions', target: PHARMACY_URL, downstreamPrefix: '/prescriptions' },
  { prefix: '/api/v1/inventory-items', target: PHARMACY_URL, downstreamPrefix: '/inventory-items' },
  { prefix: '/api/v1/prescription-items', target: PHARMACY_URL, downstreamPrefix: '/prescription-items' },
  { prefix: '/api/v1/invoices', target: FINANCE_URL, downstreamPrefix: '/invoices' },
  { prefix: '/api/v1/payments', target: FINANCE_URL, downstreamPrefix: '/payments' },
  { prefix: '/api/v1/notifications', target: COMMUNICATION_URL, downstreamPrefix: '/notifications' },
  { prefix: '/api/v1/wards', target: INPATIENT_URL, downstreamPrefix: '/wards' },
  { prefix: '/api/v1/beds', target: INPATIENT_URL, downstreamPrefix: '/beds' },
  { prefix: '/api/v1/admissions', target: INPATIENT_URL, downstreamPrefix: '/admissions' },
  { prefix: '/api/v1/emergency-visits', target: INPATIENT_URL, downstreamPrefix: '/emergency-visits' },
  { prefix: '/api/v1/supply-items', target: SUPPLY_URL, downstreamPrefix: '/supply-items' },
  { prefix: '/api/v1/insurance-policies', target: SUPPLY_URL, downstreamPrefix: '/insurance-policies' },
  { prefix: '/api/v1/claims', target: SUPPLY_URL, downstreamPrefix: '/claims' },
  { prefix: '/api/v1/referrals', target: SUPPLY_URL, downstreamPrefix: '/referrals' },
  { prefix: '/api/v1/fhir', target: INTEROP_URL, downstreamPrefix: '/fhir' },
  { prefix: '/api/v1/analytics', target: ANALYTICS_URL, downstreamPrefix: '/analytics' },
  { prefix: '/api/v1/ai', target: ANALYTICS_URL, downstreamPrefix: '/ai' },

  // Swagger UIs for each backend service — on the free single-container
  // Render deploy these services have no public URL of their own, so this
  // is the only way to browse their real API docs. Each service's own
  // setupSwagger() call uses a single flat path segment matching its own
  // name (e.g. identity -> 'identity', see apps/identity/src/main.ts) so
  // that nestjs/swagger's relative asset hrefs (`./{path}/{asset}`) resolve
  // correctly against this exact external path — a two-segment external
  // path like `/docs/identity` only works because 'identity' is both the
  // downstream service's own swagger path AND the last external segment.
  // The `-json` route is a separate entry because Express's prefix mounting
  // matches path segments, not string prefixes: `/docs/identity-json` is a
  // sibling of `/docs/identity`, not a subpath of it.
  { prefix: '/docs/identity-json', target: IDENTITY_URL, downstreamPrefix: '/identity-json' },
  { prefix: '/docs/identity', target: IDENTITY_URL, downstreamPrefix: '/identity' },
  { prefix: '/docs/facility-json', target: FACILITY_URL, downstreamPrefix: '/facility-json' },
  { prefix: '/docs/facility', target: FACILITY_URL, downstreamPrefix: '/facility' },
  { prefix: '/docs/patient-json', target: PATIENT_URL, downstreamPrefix: '/patient-json' },
  { prefix: '/docs/patient', target: PATIENT_URL, downstreamPrefix: '/patient' },
  { prefix: '/docs/scheduling-json', target: SCHEDULING_URL, downstreamPrefix: '/scheduling-json' },
  { prefix: '/docs/scheduling', target: SCHEDULING_URL, downstreamPrefix: '/scheduling' },
  { prefix: '/docs/clinical-json', target: CLINICAL_URL, downstreamPrefix: '/clinical-json' },
  { prefix: '/docs/clinical', target: CLINICAL_URL, downstreamPrefix: '/clinical' },
  { prefix: '/docs/lab-json', target: LAB_URL, downstreamPrefix: '/lab-json' },
  { prefix: '/docs/lab', target: LAB_URL, downstreamPrefix: '/lab' },
  { prefix: '/docs/pharmacy-json', target: PHARMACY_URL, downstreamPrefix: '/pharmacy-json' },
  { prefix: '/docs/pharmacy', target: PHARMACY_URL, downstreamPrefix: '/pharmacy' },
  { prefix: '/docs/finance-json', target: FINANCE_URL, downstreamPrefix: '/finance-json' },
  { prefix: '/docs/finance', target: FINANCE_URL, downstreamPrefix: '/finance' },
  { prefix: '/docs/communication-json', target: COMMUNICATION_URL, downstreamPrefix: '/communication-json' },
  { prefix: '/docs/communication', target: COMMUNICATION_URL, downstreamPrefix: '/communication' },
  { prefix: '/docs/inpatient-json', target: INPATIENT_URL, downstreamPrefix: '/inpatient-json' },
  { prefix: '/docs/inpatient', target: INPATIENT_URL, downstreamPrefix: '/inpatient' },
  { prefix: '/docs/supply-json', target: SUPPLY_URL, downstreamPrefix: '/supply-json' },
  { prefix: '/docs/supply', target: SUPPLY_URL, downstreamPrefix: '/supply' },
  { prefix: '/docs/interop-json', target: INTEROP_URL, downstreamPrefix: '/interop-json' },
  { prefix: '/docs/interop', target: INTEROP_URL, downstreamPrefix: '/interop' },
  { prefix: '/docs/analytics-json', target: ANALYTICS_URL, downstreamPrefix: '/analytics-json' },
  { prefix: '/docs/analytics', target: ANALYTICS_URL, downstreamPrefix: '/analytics' },
];

export function registerProxyRoutes(app: Express) {
  for (const route of ROUTES) {
    app.use(
      route.prefix,
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        pathRewrite: (path) => `${route.downstreamPrefix}${path}`,
        on: {
          // RequestIdMiddleware set this on the incoming request (and it's
          // forwarded to the downstream service as part of the proxied
          // request automatically), but the proxied response overwrites
          // the gateway's own response wholesale — so it has to be
          // re-attached here for the client to see it on the response too.
          proxyRes: (proxyRes, req) => {
            const requestId = req.headers[REQUEST_ID_HEADER];
            if (requestId) proxyRes.headers[REQUEST_ID_HEADER] = requestId;
          },
        },
      })
    );
  }
}
