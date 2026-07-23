---
sidebar_position: 6
title: Fly.io
---

# Fly.io

Deploy Tab Pilot to [Fly.io](https://fly.io) using the pre-built container image. Fly.io's free tier is suitable for small teams, and the platform handles TLS, global anycast routing, and health-checked deploys out of the box.

:::note Free tier cold starts
Fly.io's free tier may stop idle machines to conserve resources. If your team experiences slow first loads, set `min_machines_running = 1` in `fly.toml` to keep at least one machine always running. This uses more of your free allowance.
:::

---

## Prerequisites

- A [Fly.io account](https://fly.io/app/sign-up) (free tier works)
- `flyctl` installed:

  ```bash
  # macOS
  brew install flyctl

  # Linux / WSL
  curl -L https://fly.io/install.sh | sh
  ```

- Logged in:

  ```bash
  fly auth login
  ```

---

## Launch the App

Run `fly launch` from any directory — no local source code or Dockerfile needed when deploying from a pre-built image:

```bash
fly launch \
  --image ghcr.io/gautamkrishnar/tabpilot:latest \
  --name tabpilot \
  --no-deploy
```

:::tip `--no-deploy`
Passing `--no-deploy` lets you configure secrets and `fly.toml` before the first deploy. This prevents the app from starting with missing environment variables.
:::

Fly will create an app and write a starter `fly.toml`. Replace its contents with the configuration below.

---

## `fly.toml`

```toml title="fly.toml"
app = "tabpilot"
primary_region = "iad"

[build]
  image = "ghcr.io/gautamkrishnar/tabpilot:latest"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

  [[http_service.checks]]
    grace_period = "30s"
    interval = "15s"
    method = "GET"
    path = "/api/health"
    timeout = "5s"

[env]
  NODE_ENV = "production"
  PORT = "3000"
```

:::tip Choosing a region
Replace `iad` (Ashburn, Virginia) with the region closest to your team. Run `fly platform regions` to list all available regions.
:::

:::note WebSocket support
Fly.io's HTTP service proxy supports WebSocket connections natively — no extra configuration is required. Long-lived connections are handled transparently.
:::

---

## MongoDB

Tab Pilot requires MongoDB. You have two options:

### Option A: MongoDB Atlas (Recommended)

[MongoDB Atlas](https://www.mongodb.com/atlas) offers a free M0 tier that is sufficient for small teams. It takes about 2 minutes to set up:

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Under **Network Access**, add `0.0.0.0/0` to allow connections from Fly machines
4. Copy the connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/tabpilot`)

This is the simplest and most reliable option — Atlas handles backups, replication, and monitoring.

### Option B: Fly Postgres (via MongoDB adapter)

Fly does not offer a managed MongoDB service. Use Atlas or run MongoDB as a separate Fly app with a persistent volume:

```bash
# Create a Fly app for MongoDB (separate app)
fly launch --image mongo:7 --name tabpilot-mongo --no-deploy

# Create a persistent volume for data
fly volumes create mongo_data --size 10 --app tabpilot-mongo

# Deploy MongoDB
fly deploy --app tabpilot-mongo
```

This is more involved and is not the recommended path for most users.

---

## Set Secrets

Set sensitive values as Fly secrets (they are injected as environment variables and never appear in logs or config files):

```bash
fly secrets set \
  MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/tabpilot" \
  FRONTEND_URL="https://tabpilot.fly.dev" \
  --app tabpilot
```

:::warning Set FRONTEND_URL before deploying
`FRONTEND_URL` must match the URL your users access Tab Pilot on. It is used for CORS origin validation. If it is wrong, WebSocket connections will fail. If you set a custom domain later, update this secret to match.
:::

Optional secrets for Jira and AI scoring:

```bash
fly secrets set \
  JIRA_BASE_URL="https://yourteam.atlassian.net" \
  JIRA_USER_EMAIL="bot@yourteam.com" \
  JIRA_API_TOKEN="your-api-token" \
  --app tabpilot
```

For AI ticket scoring, the GCP service account key must be mounted as a file. See [AI Ticket Scoring](../configuration/ai-ticket-scoring.md) for details — Fly supports mounting secrets as files via `[files]` in `fly.toml`.

---

## Deploy

```bash
fly deploy --app tabpilot
```

Fly will pull the image, create a machine, run health checks, and promote it when ready. You should see output like:

```
--> v1 deployed successfully
```

---

## Open in Browser

```bash
fly open --app tabpilot
```

This opens `https://tabpilot.fly.dev` in your default browser. Confirm the health endpoint:

```bash
curl https://tabpilot.fly.dev/api/health
# {"status":"ok"}
```

---

## Custom Domain

1. Add your domain in the Fly dashboard under **Certificates**, or via CLI:

   ```bash
   fly certs add tabpilot.example.com --app tabpilot
   ```

2. Follow the DNS instructions Fly provides (usually a CNAME or A record).

3. Once the certificate is issued, update your `FRONTEND_URL` secret:

   ```bash
   fly secrets set FRONTEND_URL="https://tabpilot.example.com" --app tabpilot
   ```

4. Redeploy:

   ```bash
   fly deploy --app tabpilot
   ```

---

## Viewing Logs

```bash
# Live log stream
fly logs --app tabpilot

# Historical logs (last 100 lines)
fly logs --app tabpilot -n 100
```

---

## Updating Tab Pilot

To pull and deploy a new version of the image:

```bash
fly deploy --app tabpilot
```

Fly pulls the latest `ghcr.io/gautamkrishnar/tabpilot:latest`, performs a rolling replace, and only cuts over when the new machine passes health checks.

:::tip Pin to a specific version
For reproducible deploys, update `fly.toml` to reference a tagged release instead of `latest`:

```toml
[build]
  image = "ghcr.io/gautamkrishnar/tabpilot:v1.2.0"
```

Check [GitHub releases](https://github.com/gautamkrishnar/tabpilot/releases) for available tags.
:::

---

## Scaling

:::warning Single machine recommended
Tab Pilot uses Socket.io with in-memory session state. Running more than one machine requires sticky sessions. Fly.io supports session affinity, but it is simpler to keep a single machine and scale vertically if needed.

To scale machine size:

```bash
fly scale vm shared-cpu-2x --app tabpilot
```
:::

If you do need to scale horizontally, enable sticky sessions by adding `sticky_sessions = true` under `[http_service]` in `fly.toml`. Note that in-memory vote state is still not shared across machines — a Redis adapter would be required for full correctness.
