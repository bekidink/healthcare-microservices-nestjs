import type { Express } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { REQUEST_ID_HEADER } from '@healthcare/shared';

/**
 * Route table mapping a public, versioned path prefix to a downstream
 * service. As new services come online (Phase 3 Facility, Phase 4
 * Patient/MPI, ...) they're added here rather than the gateway growing
 * per-route logic of its own — the gateway stays a thin routing/auth-context
 * layer, never a place business logic accumulates.
 *
 * `downstreamPrefix` is what the target service's own route table actually
 * expects (e.g. identity's AuthController is mounted at `/auth`). Note:
 * Express's `app.use(prefix, ...)` already strips `prefix` from `req.url`
 * before the proxy middleware ever sees it — so rewriting is "re-add
 * downstreamPrefix to whatever's left", not a regex over the original path.
 */
const ROUTES: { prefix: string; target: string; downstreamPrefix: string }[] = [
  {
    prefix: '/api/v1/auth',
    target: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001',
    downstreamPrefix: '/auth',
  },
  {
    prefix: '/api/v1/users',
    target: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001',
    downstreamPrefix: '/users',
  },
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
