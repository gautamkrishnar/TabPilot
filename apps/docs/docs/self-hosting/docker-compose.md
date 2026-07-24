---
sidebar_position: 2
title: Docker / Podman Compose
---

# Docker / Podman Compose

This page covers the full production Compose setup for Tab Pilot, including data persistence, updates, logging, and optional integrations.

## Production compose.yml

The following is the recommended production Compose file. Save it as `compose.yml` in a directory of your choice (e.g., `/opt/tabpilot/`):

```yaml
name: tabpilot

services:
  mongodb:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "27017:27017"
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
      - FRONTEND_URL=https://your-domain.com
    depends_on:
      mongodb:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "const http=require('http');http.get('http://localhost:3000/api/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

volumes:
  mongo_data:
```

:::warning Set FRONTEND_URL
Replace `https://your-domain.com` with the actual public URL where Tab Pilot is reachable. This value is used for CORS origin validation — mismatches will cause WebSocket connection failures.
:::

## Service Breakdown

### `mongodb`

| Field | Value | Purpose |
|---|---|---|
| `image` | `mongo:7` | Official MongoDB 7 image |
| `restart` | `unless-stopped` | Restarts on crash; does not restart when you manually stop it |
| `volumes` | `mongo_data:/data/db` | Persists database data across container restarts |
| `healthcheck` | `mongosh ping` | Ensures the app service waits for Mongo to be ready before starting |

### `app`

| Field | Value | Purpose |
|---|---|---|
| `image` | `ghcr.io/gautamkrishnar/tabpilot:latest` | Pre-built image from GitHub Container Registry |
| `ports` | `3000:3000` | Exposes the API/frontend on host port 3000 |
| `depends_on` | `mongodb: condition: service_healthy` | Startup ordering — app waits for Mongo health check to pass |
| `healthcheck` | HTTP GET `/api/health` | Container orchestrators use this to know when the app is ready |
| `restart` | `unless-stopped` | Auto-restarts after crashes or reboots |

## Starting and Stopping

```bash
# Start in the background
docker compose up -d

# Stop containers (data is preserved)
docker compose down

# Stop and remove all data (destructive)
docker compose down -v
```

## Updating to a New Version

Tab Pilot uses the `latest` tag by default. To update:

```bash
# Pull the newest image
docker compose pull app

# Recreate the app container with the new image
docker compose up -d --no-deps app
```

MongoDB data is preserved in the `mongo_data` named volume and is unaffected by app updates.

## Data Persistence

All session and participant data is stored in the `mongo_data` named Docker volume. This volume lives outside the container and survives container replacements and updates.

To inspect the volume:

```bash
docker volume inspect tabpilot_mongo_data
```

To back it up:

```bash
docker run --rm \
  -v tabpilot_mongo_data:/data \
  -v $(pwd):/backup \
  busybox tar czf /backup/tabpilot-backup.tar.gz /data
```

To wipe all data and start fresh:

```bash
docker compose down -v
docker compose up -d
```

## Checking Logs

```bash
# Stream app logs
docker compose logs -f app

# Stream MongoDB logs
docker compose logs -f mongodb

# Last 100 lines of app logs
docker compose logs --tail=100 app
```

## Health Check Endpoint

The app exposes a lightweight health endpoint:

```bash
curl http://localhost:3000/api/health
# {"status":"ok"}
```

Orchestrators (Docker Swarm, Kubernetes, Coolify, Portainer) can poll this endpoint to determine readiness.

## Adding Jira and AI Scoring

Extend the `environment` block in the `app` service to enable optional integrations:

```yaml
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=mongodb://mongodb:27017/tabpilot
      - FRONTEND_URL=https://tabpilot.example.com

      # Jira integration (optional)
      - JIRA_BASE_URL=https://myteam.atlassian.net
      - JIRA_USER_EMAIL=bot@myteam.com
      - JIRA_API_TOKEN=your-api-token-here
      - JIRA_STORY_POINTS_FIELDS=PROJ=customfield_10016,OTHER=customfield_10028

      # AI ticket scoring (optional)
      - GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-sa.json
      - VERTEX_AI_LOCATION=us-central1
```

For `GOOGLE_APPLICATION_CREDENTIALS`, mount the key file into the container using a volume:

```yaml
  app:
    image: ghcr.io/gautamkrishnar/tabpilot:latest
    volumes:
      - /path/to/your/gcp-sa.json:/secrets/gcp-sa.json:ro
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-sa.json
```

See [Jira Integration](../configuration/jira-integration.md) and [AI Ticket Scoring](../configuration/ai-ticket-scoring.md) for full setup details.
