---
sidebar_position: 3
title: Container Registry
---

# Container Registry

Tab Pilot publishes pre-built container images to the **GitHub Container Registry (GHCR)**.

## Image Variants

Tab Pilot publishes two image variants built from the same `Containerfile`:

| Variant | Tag | Includes docs | Size |
|---|---|---|---|
| Default | `latest`, `master`, `sha-xxx`, `v1.2.3` | No | ~280 MB |
| With docs | `latest-docs`, `master-docs`, `sha-xxx-docs`, `v1.2.3-docs` | Yes — served at `/docs/` | ~281 MB |

The **default** variant is a minimal production image. The **with-docs** variant bundles the Docusaurus docs site and serves it at `/docs/` from the same NestJS server — the app home page shows a "Docs" link automatically when `/docs/` responds 200.

## Image Reference

```
ghcr.io/tabpilot/tabpilot:latest
```

### Available Tags

| Tag | Description |
|---|---|
| `latest` | Most recent release from the `master` branch (default, without docs) |
| `latest-docs` | Most recent release with bundled docs site |
| `master` | Tracks the `master` branch (without docs) |
| `master-docs` | Tracks the `master` branch (with docs) |
| `sha-xxx` | Pinned to a specific commit SHA (without docs) |
| `sha-xxx-docs` | Pinned to a specific commit SHA (with docs) |
| `vX.Y.Z` | Pinned release tag (e.g. `v1.2.0`) — use in production for reproducible deployments |
| `vX.Y.Z-docs` | Pinned release tag with bundled docs |

:::tip Pinning versions in production
For critical deployments, pin to a specific version tag rather than `latest` to avoid unexpected updates. Check [GitHub releases](https://github.com/tabpilot/tabpilot/releases) for available versions.
:::

## Pulling the Image

```bash
# Without docs (default)
docker pull ghcr.io/tabpilot/tabpilot:latest

# With docs
docker pull ghcr.io/tabpilot/tabpilot:latest-docs

# Podman
podman pull ghcr.io/tabpilot/tabpilot:latest

# Pin to a specific version
docker pull ghcr.io/tabpilot/tabpilot:v1.2.0
```

The image is public — no authentication required for pulling.

## Multi-Architecture Support

The published image is a **multi-arch manifest** supporting:

| Architecture | Platform |
|---|---|
| `linux/amd64` | Standard x86-64 servers, most VMs, AWS EC2, GCP, Azure |
| `linux/arm64` | Apple Silicon (M1/M2), AWS Graviton, Raspberry Pi 4+ |

Docker and Podman automatically select the correct variant for your host. No flags needed.

## Building from Source

If you want to build the image yourself — for local development, custom modifications, or air-gapped environments:

```bash
git clone https://github.com/tabpilot/tabpilot.git
cd TabPilot

# Without docs (default)
podman build -t tabpilot:latest .

# With docs
podman build --target runner-with-docs -t tabpilot:latest-docs .

# Build both
podman build -t tabpilot:latest . && \
podman build --target runner-with-docs -t tabpilot:latest-docs .
```

Then reference the image in your `compose.yml`:

```yaml
  app:
    image: tabpilot:local
```

## Containerfile Build Stages

The `Containerfile` uses an **8-stage multi-stage build** to produce a minimal, hardened production image:

| Stage | Name | Purpose |
|---|---|---|
| 1 | `deps` | Install all workspace Node dependencies via Yarn (includes `apps/docs`) |
| 2 | `shared-builder` | Build the `@tabpilot/shared` package (types and WS event constants) |
| 3 | `web-builder` | Build the React frontend with Vite — outputs static assets |
| 4 | `docs-builder` | Build the Docusaurus docs site — branches from `deps`, can build in parallel |
| 5 | `api-builder` | Build the NestJS API with TypeScript — compiles to `dist/` |
| 6 | `prod-deps` | Install production-only dependencies (strips dev deps) |
| 7 | `runner` | Final minimal image without docs — default build target |
| 8 | `runner-with-docs` | `runner` + docs copied into `apps/web/dist/docs/` |

The default `podman build .` produces the `runner` (no-docs) variant. Use `--target runner-with-docs` to build the variant with the bundled docs site. Only the final target stage is included in each image; build tools, source files, and dev dependencies are left behind.

### Runner Stage Details

- **Base image:** Red Hat Universal Base Image 9 (UBI9) with Node.js 22
- **Non-root execution:** The app runs as UID `1001` (non-root) for security hardening
- **Serves both:** The static frontend assets are served by the NestJS API via a static file middleware, so a single container handles all traffic

## Why RHEL UBI9?

The runner stage uses `registry.access.redhat.com/ubi9/nodejs-22` rather than a plain Alpine or Debian Node image. Key reasons:

- **Enterprise-hardened:** Red Hat continuously patches CVEs and publishes a public SBOM
- **OpenShift-compatible:** Runs on OpenShift and other security-conscious Kubernetes distributions without needing `anyuid` SCC — because it already runs as a non-root UID
- **FIPS-ready:** UBI9 supports FIPS 140-2 mode for regulated environments
- **Long-term support:** UBI9 tracks RHEL 9 with a stable, predictable lifecycle

If you need to use a different base image (e.g., Alpine for size), build from source and modify the `Containerfile` runner stage.

## Verifying the Image

Inspect the image metadata:

```bash
# View image labels and entrypoint
docker inspect ghcr.io/tabpilot/tabpilot:latest

# Check image size (should be ~300-400 MB)
docker images ghcr.io/tabpilot/tabpilot:latest
```
