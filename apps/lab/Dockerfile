# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
# Prisma's engine binaries need real OpenSSL to detect the right target on
# Alpine (musl+openssl3) — without it, it silently guesses "openssl-1.1.x"
# and the engine fails to load at runtime with a non-JSON error.
RUN apk add --no-cache openssl && corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/lab/package.json apps/lab/package.json
RUN pnpm install --frozen-lockfile=false --filter @healthcare/lab...

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/lab apps/lab
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/lab prisma:generate
RUN pnpm --filter @healthcare/lab build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl && corepack enable
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace ./
WORKDIR /workspace/apps/lab
EXPOSE 3006
CMD ["node", "dist/main.js"]
