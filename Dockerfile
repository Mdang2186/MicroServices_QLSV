# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20-bookworm-slim

FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV CI=true \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/api-gateway/package.json apps/api-gateway/package.json
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY apps/course-service/package.json apps/course-service/package.json
COPY apps/enrollment-service/package.json apps/enrollment-service/package.json
COPY apps/grade-service/package.json apps/grade-service/package.json
COPY apps/student-service/package.json apps/student-service/package.json
COPY apps/web-admin/package.json apps/web-admin/package.json
COPY apps/web-portal/package.json apps/web-portal/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/shared-dto/package.json packages/shared-dto/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

FROM base AS deps
COPY --from=manifests /app ./
RUN npm ci

FROM deps AS builder
ARG APP
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build -w @repo/shared-dto
RUN npm run build -w @repo/shared-utils
RUN npm run build -w @repo/database
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build -w ${APP}

FROM base AS prod-deps
COPY --from=manifests /app ./
RUN npm ci --omit=dev

FROM deps AS prisma
ENV NODE_ENV=production
COPY . .
RUN npm run build -w @repo/database
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
CMD ["npx", "prisma", "db", "push", "--schema=packages/database/prisma/schema.prisma", "--skip-generate"]

FROM base AS nest
ARG APP
ENV APP=${APP} \
    NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/shared-dto ./packages/shared-dto
COPY --from=builder /app/packages/shared-utils ./packages/shared-utils
COPY --from=builder /app/apps/${APP}/package.json ./apps/${APP}/package.json
COPY --from=builder /app/apps/${APP}/dist ./apps/${APP}/dist
CMD ["sh", "-c", "node apps/${APP}/dist/main.js"]

FROM base AS next
ARG APP
ENV APP=${APP} \
    HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/${APP}/.next/standalone ./
COPY --from=builder /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=builder /app/apps/${APP}/public ./apps/${APP}/public
WORKDIR /app/apps/${APP}
CMD ["node", "server.js"]
