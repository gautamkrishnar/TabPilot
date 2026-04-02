# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-22 AS deps
WORKDIR /app
USER root

# Enable Corepack for Yarn Berry
RUN npm install -g corepack && corepack enable

# Copy workspace manifests first for layer caching
COPY --chown=default:root package.json .yarnrc.yml yarn.lock ./
COPY --chown=default:root packages/shared/package.json packages/shared/
COPY --chown=default:root apps/api/package.json apps/api/
COPY --chown=default:root apps/web/package.json apps/web/

# Install all dependencies (including dev for build steps)
RUN yarn install --immutable

# ─── Stage 2: Build shared package ───────────────────────────────────────────
FROM deps AS shared-builder
COPY --chown=default:root packages/shared/ packages/shared/
RUN yarn workspace @tabpilot/shared build

# ─── Stage 3: Build web frontend ─────────────────────────────────────────────
FROM shared-builder AS web-builder
COPY --chown=default:root apps/web/ apps/web/
RUN yarn workspace @tabpilot/web build

# ─── Stage 4: Build API ───────────────────────────────────────────────────────
FROM shared-builder AS api-builder
COPY --chown=default:root apps/api/ apps/api/
COPY --from=web-builder /app/apps/web/dist apps/web/dist
RUN yarn workspace @tabpilot/api build

# ─── Stage 5: Production runner ──────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-22-minimal AS runner
WORKDIR /app
USER root

ENV NODE_ENV=production
ENV PORT=3000

RUN npm install -g corepack && corepack enable

# Copy workspace manifests for production dependency install
COPY --chown=1001:root package.json .yarnrc.yml yarn.lock ./
COPY --chown=1001:root packages/shared/package.json packages/shared/
COPY --chown=1001:root apps/api/package.json apps/api/

# Install production dependencies only
RUN yarn workspaces focus @tabpilot/api --production

# Copy built artifacts
COPY --from=api-builder --chown=1001:root /app/apps/api/dist apps/api/dist
COPY --from=web-builder --chown=1001:root /app/apps/web/dist apps/web/dist
COPY --from=shared-builder --chown=1001:root /app/packages/shared/dist packages/shared/dist

# UBI images default to uid 1001 — run as non-root
USER 1001

EXPOSE 3000

# Health check using Node (no curl/wget in minimal UBI)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3000/api/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]
