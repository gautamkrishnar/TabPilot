---
sidebar_position: 7
title: Railway
---

# Railway

[Railway](https://railway.app) is a platform-as-a-service that makes it easy to deploy container images alongside managed data services. Tab Pilot can be deployed on Railway in a few minutes using the pre-built image and Railway's built-in MongoDB plugin.

:::note Free tier limits
Railway's free tier includes $5 of usage per month. This is typically enough for light team use and experimentation. For continuous team usage, expect to use the Hobby plan ($5/month) or higher.
:::

---

## Prerequisites

- A [Railway account](https://railway.app/login) (free tier is sufficient to start)
- Your public domain or the Railway-generated URL for your app

---

## Step 1: Create a New Project

1. Go to [railway.app](https://railway.app) and click **New Project**.
2. Select **Deploy from Docker image**.
3. Enter the image reference:

   ```
   ghcr.io/gautamkrishnar/tabpilot:latest
   ```

4. Click **Deploy**. Railway will pull the image and provision a service.

---

## Step 2: Add MongoDB

Tab Pilot requires MongoDB. Railway provides a managed MongoDB plugin:

1. In your project dashboard, click **New** → **Database** → **Add MongoDB**.
2. Railway provisions a MongoDB instance inside the same project and private network.
3. Click on the MongoDB service, go to the **Variables** tab, and copy the `MONGO_URL` connection string. You will use this in the next step.

:::tip Use MongoDB Atlas as an alternative
If you prefer a managed service with better durability guarantees, use [MongoDB Atlas](https://www.mongodb.com/atlas) (free M0 tier). Create a cluster, whitelist `0.0.0.0/0` for Railway's dynamic IPs, and paste the Atlas connection string as `MONGODB_URI`.
:::

---

## Step 3: Set Environment Variables

In the Tab Pilot service, go to **Variables** and add the following:

| Variable | Value | Notes |
|---|---|---|
| `MONGODB_URI` | Connection string from the MongoDB plugin | Paste the `MONGO_URL` value from the MongoDB plugin's Variables tab |
| `FRONTEND_URL` | `https://your-app.up.railway.app` | Set to your Railway URL or custom domain |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | See note below |

:::warning PORT on Railway
Railway injects a `$PORT` environment variable at runtime and expects the app to bind to it. Tab Pilot reads its `PORT` env var directly. Set `PORT` to `3000` in Railway's Variables panel, or leave it unset — Railway will override it automatically. Either way, the app will bind to the correct port.
:::

:::warning Set FRONTEND_URL before your first real session
`FRONTEND_URL` is used for CORS origin validation. Set it to the exact URL your users will access (e.g., `https://tabpilot.up.railway.app` or your custom domain including `https://`). A mismatch causes WebSocket connections to be rejected by the browser.
:::

Optional variables for Jira integration:

| Variable | Value |
|---|---|
| `JIRA_BASE_URL` | `https://yourteam.atlassian.net` |
| `JIRA_USER_EMAIL` | `bot@yourteam.com` |
| `JIRA_API_TOKEN` | Your Atlassian API token |

See [Jira Integration](../configuration/jira-integration.md) for full details.

---

## Step 4: Verify the Deployment

Once the service is deployed, Railway will display a public URL (e.g., `https://tabpilot-production-xxxx.up.railway.app`). Click it or run:

```bash
curl https://tabpilot-production-xxxx.up.railway.app/api/health
# {"status":"ok"}
```

If the health check returns `{"status":"ok"}`, Tab Pilot is running correctly.

---

## Custom Domain

1. In the Tab Pilot service, go to **Settings** → **Domains**.
2. Click **Add Domain** and enter your domain name.
3. Follow Railway's DNS instructions (usually a `CNAME` record pointing to Railway's edge).
4. Once the domain is active, update `FRONTEND_URL` in the Variables panel to match the new domain:

   ```
   FRONTEND_URL=https://tabpilot.example.com
   ```

5. Railway automatically redeploys the service when variables change.

---

## Updating Tab Pilot

Railway does not automatically pull new versions of `latest` tags. To deploy a new image version:

1. Go to the Tab Pilot service → **Deployments**.
2. Click **Redeploy** on the latest entry, or trigger a new deploy via the Railway CLI:

   ```bash
   railway redeploy
   ```

:::tip Pin to a specific version
For predictable production deployments, use a pinned image tag instead of `latest`. Update the Docker image reference in your service settings to a specific tag (e.g., `ghcr.io/gautamkrishnar/tabpilot:v1.2.0`). Check [GitHub releases](https://github.com/gautamkrishnar/tabpilot/releases) for available versions.
:::

---

## Viewing Logs

Click on the Tab Pilot service in Railway's dashboard and open the **Logs** tab. Logs stream in real time and include both stdout and stderr from the container.

---

## Notes

- **WebSocket connections:** Railway's proxy supports WebSocket upgrades natively. No additional configuration is needed.
- **Persistent storage:** Tab Pilot's session data lives in MongoDB, not on the container filesystem. The app itself is stateless — you can redeploy freely without data loss.
- **Scaling:** Tab Pilot uses in-memory session state for votes and real-time events. Scaling to multiple instances is not supported without a Redis adapter. Railway's single-instance default is the right choice.
