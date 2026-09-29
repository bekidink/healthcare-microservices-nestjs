# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/gateway/package.json apps/gateway/package.json
RUN pnpm install --frozen-lockfile=false --filter @healthcare/gateway...

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/gateway apps/gateway
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/gateway build

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace ./
WORKDIR /workspace/apps/gateway
EXPOSE 3000
CMD ["node", "dist/main.js"]
