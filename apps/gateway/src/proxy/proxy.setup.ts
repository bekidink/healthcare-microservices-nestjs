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
