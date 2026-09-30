# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/scheduling/package.json apps/scheduling/package.json
RUN pnpm install --frozen-lockfile=false --filter @healthcare/scheduling...

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/scheduling apps/scheduling
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/scheduling prisma:generate
RUN pnpm --filter @healthcare/scheduling build

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace ./
WORKDIR /workspace/apps/scheduling
EXPOSE 3004
CMD ["node", "dist/main.js"]
