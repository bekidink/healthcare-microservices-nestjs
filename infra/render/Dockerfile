# syntax=docker/dockerfile:1
#
# All-in-one image for Render's free tier: builds every backend service
# (gateway + identity + facility + patient + scheduling) into one image and
# runs all 5 as separate processes under pm2-runtime (see ecosystem.config.js)
# inside a single container. This exists purely to fit Render's free plan,
# which has no free private-service instance type — see the "Deploying to
# Render (free tier)" section in the root README for the full tradeoffs.
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/identity/package.json apps/identity/package.json
COPY apps/facility/package.json apps/facility/package.json
COPY apps/patient/package.json apps/patient/package.json
COPY apps/scheduling/package.json apps/scheduling/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/gateway apps/gateway
COPY apps/identity apps/identity
COPY apps/facility apps/facility
COPY apps/patient apps/patient
COPY apps/scheduling apps/scheduling
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/identity prisma:generate
RUN pnpm --filter @healthcare/facility prisma:generate
RUN pnpm --filter @healthcare/patient prisma:generate
RUN pnpm --filter @healthcare/scheduling prisma:generate
RUN pnpm --filter @healthcare/gateway build
RUN pnpm --filter @healthcare/identity build
RUN pnpm --filter @healthcare/facility build
RUN pnpm --filter @healthcare/patient build
RUN pnpm --filter @healthcare/scheduling build

FROM node:20-alpine AS runtime
RUN corepack enable && npm install -g pm2
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace ./
COPY infra/render/ecosystem.config.js infra/render/db-url.js infra/render/migrate-all.js infra/render/
# No fixed EXPOSE: gateway (the only public process) binds whatever $PORT
# Render injects at runtime, not a port baked in at build time.
CMD ["pm2-runtime", "start", "infra/render/ecosystem.config.js"]
