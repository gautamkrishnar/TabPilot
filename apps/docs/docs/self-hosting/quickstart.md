---
sidebar_position: 1
title: Quick Start
---

# Quick Start

Get Tab Pilot running locally in under five minutes.

## Prerequisites

- **Docker** (v24+) or **Podman** (v4+) with Compose support
- **Git** (only if building from source)

:::tip Using Podman?
All `docker` commands below work identically with `podman`. Podman Compose is available via `pip install podman-compose` or your system package manager.
:::

---

## Option 1: Docker Compose with Pre-built Image (Fastest)

This is the recommended approach for running Tab Pilot in production or for quick evaluation. It pulls the latest image from the GitHub Container Registry — no build step required.

Create a `compose.yml` file:

```yaml
name: tabpilot

services:
  mongodb:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand({ ping: 1 })"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ghcr.io/gautamkrishnar/tabpilot:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=mongodb://mongodb:27017/tabpilot
      - FRONTEND_URL=http://localhost:3000
    depends_on:
      mongodb:
        condition: service_healthy

volumes:
  mongo_data:
```

Then start it:

```bash
docker compose up -d
```

---

## Option 2: Build from Source

Clone the repository and build the container image locally:

```bash
git clone https://github.com/gautamkrishnar/tabpilot.git
cd TabPilot

# Using Podman Compose (builds the image automatically)
podman compose -f compose.yml up --build -d

# Or Docker Compose
docker compose -f compose.yml up --build -d
```

The `compose.yml` in the repository root references the `Containerfile` and builds a multi-stage image (shared → web → api → runner). The first build takes 2–3 minutes; subsequent builds are cached.

:::note Build targets
The repository `compose.yml` uses `build.context: .` and `target: runner`, which triggers the full 8-stage Containerfile build and produces the default (no-docs) variant. To bundle the docs site, build with `--target runner-with-docs` instead. The [Container Registry](./container-registry.md) doc explains all build stages and both variants in detail.
:::

---

## Verify the Installation

Once the containers are up, open your browser:

```
http://localhost:3000
```

You should see the Tab Pilot home page. To confirm the API is healthy:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{"status":"ok"}
```

Check container logs if something looks wrong:

```bash
docker compose logs -f app
docker compose logs -f mongodb
```

---

## Next Steps

- Set `FRONTEND_URL` to your public domain when deploying behind a reverse proxy — see [Reverse Proxy & TLS](./reverse-proxy.md)
- Add Jira credentials to enable title enrichment and story point sync — see [Jira Integration](../configuration/jira-integration.md)
- Enable AI ticket scoring — see [AI Ticket Scoring](../configuration/ai-ticket-scoring.md)
- Review all configuration options in [Environment Variables](../configuration/environment-variables.md)
