# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM registry.access.redhat.com/hi/nodejs:22-builder AS deps
WORKDIR /opt/app-root/src
USER 0

# Copy Yarn binary and workspace manifests for layer caching
COPY --chown=default:0 .yarnrc.yml ./
COPY --chown=default:0 .yarn ./.yarn
COPY --chown=default:0 package.json yarn.lock ./
COPY --chown=default:0 packages/shared/package.json packages/shared/
COPY --chown=default:0 packages/e2e/package.json packages/e2e/
COPY --chown=default:0 apps/api/package.json apps/api/
COPY --chown=default:0 apps/web/package.json apps/web/

# Install all dependencies (including dev for build steps)
RUN node .yarn/releases/yarn-4.13.0.cjs install --immutable

# ─── Stage 2: Build shared package ───────────────────────────────────────────
FROM deps AS shared-builder
COPY --chown=default:0 packages/shared/ packages/shared/
RUN node .yarn/releases/yarn-4.13.0.cjs workspace @tabpilot/shared build

# ─── Stage 3: Build web frontend ─────────────────────────────────────────────
FROM shared-builder AS web-builder
COPY --chown=default:0 apps/web/ apps/web/
RUN node .yarn/releases/yarn-4.13.0.cjs workspace @tabpilot/web build

# ─── Stage 4: Build API ───────────────────────────────────────────────────────
FROM shared-builder AS api-builder
COPY --chown=default:0 apps/api/ apps/api/
COPY --from=web-builder /opt/app-root/src/apps/web/dist apps/web/dist
RUN node .yarn/releases/yarn-4.13.0.cjs workspace @tabpilot/api build

# ─── Stage 5: Production dependencies ────────────────────────────────────────
FROM registry.access.redhat.com/hi/nodejs:22-builder AS prod-deps
WORKDIR /opt/app-root/src
USER 0

COPY --from=deps /opt/app-root/src/package.json /opt/app-root/src/yarn.lock /opt/app-root/src/.yarnrc.yml ./
COPY --from=deps /opt/app-root/src/.yarn ./.yarn
COPY --from=deps /opt/app-root/src/packages/shared/package.json packages/shared/
COPY --from=deps /opt/app-root/src/apps/api/package.json apps/api/

RUN node .yarn/releases/yarn-4.13.0.cjs workspaces focus @tabpilot/api --production

# ─── Stage 6: Production runner ──────────────────────────────────────────────
FROM registry.access.redhat.com/hi/nodejs:22
WORKDIR /opt/app-root/src
USER 0

ENV NODE_ENV=production \
    PORT=3000

# Copy workspace manifests
COPY --chown=1001:0 package.json yarn.lock ./

# Copy production node_modules
COPY --chown=1001:0 --from=prod-deps /opt/app-root/src/node_modules ./node_modules

# Copy built artifacts
COPY --chown=1001:0 --from=api-builder /opt/app-root/src/apps/api/dist apps/api/dist
COPY --chown=1001:0 --from=web-builder /opt/app-root/src/apps/web/dist apps/web/dist
COPY --chown=1001:0 --from=shared-builder /opt/app-root/src/packages/shared/package.json packages/shared/
COPY --chown=1001:0 --from=shared-builder /opt/app-root/src/packages/shared/dist packages/shared/dist

# Run as non-root (OpenShift requirement)
USER 1001

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
