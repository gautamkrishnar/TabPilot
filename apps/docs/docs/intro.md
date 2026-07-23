---
slug: /
sidebar_position: 1
title: Introduction
---

# Tab Pilot

**Tab Pilot** is a real-time tab-sync tool built for engineering grooming sessions. The host loads a list of ticket URLs; everyone in the room has their browser navigate automatically — in perfect sync — as the host advances through the queue.

No accounts, no plugins, no screen-sharing required.

**Hosted version:** [https://tabpilot.gkr.pw/](https://tabpilot.gkr.pw/)

---

## Key Features

| Feature | Description |
|---|---|
| **Real-time tab sync** | All participants' browsers navigate to the ticket being discussed, automatically |
| **Story point voting** | Fibonacci voting with simultaneous reveal — no anchoring bias |
| **Jira integration** | Automatic title enrichment for Jira URLs; save story points back to Jira with one click |
| **AI ticket scoring** | Score Jira tickets across 6 quality dimensions using Gemini Flash via Vertex AI |
| **Co-hosts** | Share navigation control with trusted team members |
| **Zero accounts** | Participants join with a 6-character code — no signup required |
| **Self-hostable** | Single container, runs anywhere Docker or Podman is available |

---

## How It Works

```
Host creates session  →  shares 6-char code
Participants enter code  →  browser auto-navigates
Host clicks Next  →  everyone jumps to the next ticket
Team votes  →  host reveals simultaneously
Host saves points  →  written back to Jira (optional)
```

Sessions have a configurable expiry and live in MongoDB. All real-time events travel over WebSockets (Socket.io). There are no persistent user accounts — identity is ephemeral per session.

---

## Getting Started

### Use the Hosted Version

The fastest way to try Tab Pilot is the hosted instance:

[**https://tabpilot.gkr.pw/**](https://tabpilot.gkr.pw/)

No installation needed. Create a session, paste your ticket URLs, and share the join code.

### Self-Host

Run your own instance in under five minutes:

```bash
# Clone and start with Docker Compose
git clone https://github.com/gautamkrishnar/tabpilot.git
cd TabPilot
docker compose -f compose.yml up -d
```

See the [Quick Start guide](./self-hosting/quickstart.md) for the full walkthrough, including pre-built container images and production configuration.

---

## Documentation Overview

- **[Self-Hosting](./self-hosting/quickstart.md)** — run Tab Pilot on your own infrastructure
  - [Quick Start](./self-hosting/quickstart.md)
  - [Docker / Podman Compose](./self-hosting/docker-compose.md)
  - [Container Registry](./self-hosting/container-registry.md)
  - [Reverse Proxy & TLS](./self-hosting/reverse-proxy.md)
- **[Configuration](./configuration/environment-variables.md)** — all environment variables and integrations
  - [Environment Variables](./configuration/environment-variables.md)
  - [Jira Integration](./configuration/jira-integration.md)
  - [AI Ticket Scoring](./configuration/ai-ticket-scoring.md)
- **[Usage](./usage/creating-a-session.md)** — step-by-step guides for hosts and participants
  - [Creating a Session](./usage/creating-a-session.md)
  - [Joining a Session](./usage/joining-a-session.md)
  - [Story Point Voting](./usage/voting.md)
  - [Co-hosts](./usage/co-hosts.md)

---

## Documentation

This documentation site lives in the `apps/docs/` workspace of the monorepo and is built with [Docusaurus](https://docusaurus.io/).

When Tab Pilot is deployed with the docs included, the **Docs** link appears automatically in the home page header — it checks at runtime whether `/docs/` is reachable before rendering.

### Bundling docs with the app

The docs are served as static files by the same NestJS server that powers the app. The main `Containerfile` already includes a `docs-builder` stage and a `runner-with-docs` target. Use `--target runner-with-docs` when building to get the version with bundled docs. See [Self-Hosting](./self-hosting/quickstart.md) for details.

### Building the docs locally

```bash
# From the monorepo root
yarn workspace @tabpilot/docs start    # dev server on http://localhost:4000/docs/
yarn workspace @tabpilot/docs build    # production build → apps/docs/build/
```

### Docs container image

The docs are bundled into the `runner-with-docs` image variant:

```bash
docker pull ghcr.io/gautamkrishnar/tabpilot:latest-docs
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/tabpilot \
  -e FRONTEND_URL=http://localhost:3000 \
  ghcr.io/gautamkrishnar/tabpilot:latest-docs
# Docs available at http://localhost:3000/docs/
```

---

## Open Source

Tab Pilot is released under the **GPL-3.0 license**. Source code and issue tracker live at:

[https://github.com/gautamkrishnar/tabpilot](https://github.com/gautamkrishnar/tabpilot)

Contributions are welcome — bug reports, pull requests, and feature ideas.
