# syntax=docker/dockerfile:1
#
# All-in-one image for Render's free tier: builds every backend service
# (gateway + identity + facility + patient + scheduling + clinical + lab +
# pharmacy) into one image and runs all 8 as separate processes under
# pm2-runtime (see ecosystem.config.js) inside a single container. This
# exists purely to fit Render's free plan, which has no free private-service
# instance type — see the "Deploying to Render (free tier)" section in the
# root README for the full tradeoffs. At 8 processes in one 512MB instance,
# this is now genuinely over budget (already measured ~525MB for 5
# processes) — expect OOM kills under any real load; the paid
# one-private-service-per-process topology is the real fix at this point.
FROM node:20-alpine AS base
# Prisma's engine binaries need real OpenSSL present to detect the right
# target (linux-musl-openssl-3.0.x on this Alpine) — without it, Prisma
# silently guesses "openssl-1.1.x" and the engine fails to load at runtime
# with a non-JSON "Error loading..." response.
RUN apk add --no-cache openssl && corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/identity/package.json apps/identity/package.json
COPY apps/facility/package.json apps/facility/package.json
COPY apps/patient/package.json apps/patient/package.json
COPY apps/scheduling/package.json apps/scheduling/package.json
COPY apps/clinical/package.json apps/clinical/package.json
COPY apps/lab/package.json apps/lab/package.json
COPY apps/pharmacy/package.json apps/pharmacy/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/gateway apps/gateway
COPY apps/identity apps/identity
COPY apps/facility apps/facility
COPY apps/patient apps/patient
COPY apps/scheduling apps/scheduling
COPY apps/clinical apps/clinical
COPY apps/lab apps/lab
COPY apps/pharmacy apps/pharmacy
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/identity prisma:generate
RUN pnpm --filter @healthcare/facility prisma:generate
RUN pnpm --filter @healthcare/patient prisma:generate
RUN pnpm --filter @healthcare/scheduling prisma:generate
RUN pnpm --filter @healthcare/clinical prisma:generate
RUN pnpm --filter @healthcare/lab prisma:generate
RUN pnpm --filter @healthcare/pharmacy prisma:generate
RUN pnpm --filter @healthcare/gateway build
RUN pnpm --filter @healthcare/identity build
RUN pnpm --filter @healthcare/facility build
RUN pnpm --filter @healthcare/patient build
RUN pnpm --filter @healthcare/scheduling build
RUN pnpm --filter @healthcare/clinical build
RUN pnpm --filter @healthcare/lab build
RUN pnpm --filter @healthcare/pharmacy build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl && corepack enable && npm install -g pm2
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace ./
COPY infra/render/ecosystem.config.js infra/render/db-url.js infra/render/migrate-all.js infra/render/entrypoint.sh infra/render/
RUN chmod +x infra/render/entrypoint.sh
# No fixed EXPOSE: gateway (the only public process) binds whatever $PORT
# Render injects at runtime, not a port baked in at build time.
CMD ["/workspace/infra/render/entrypoint.sh"]
