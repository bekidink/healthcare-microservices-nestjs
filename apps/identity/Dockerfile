# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/identity/package.json apps/identity/package.json
RUN pnpm install --frozen-lockfile=false --filter @healthcare/identity...

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/identity apps/identity
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/identity prisma:generate
RUN pnpm --filter @healthcare/identity build

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace ./
WORKDIR /workspace/apps/identity
EXPOSE 3001
CMD ["node", "dist/main.js"]
