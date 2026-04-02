<div align="center">
  <img src="../apps/web/public/logo.svg" width="56" height="56" alt="Tab Pilot logo" />

  # Tab Pilot — Developer Reference
</div>

This guide is the definitive technical reference for contributors and self-hosters. It covers local setup, the monorepo structure, all environment variables, the full REST and WebSocket API surface, database schemas, and architectural rationale.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Getting Started](#2-getting-started)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Running in Development](#4-running-in-development)
5. [Environment Variables](#5-environment-variables)
6. [API Reference](#6-api-reference)
7. [WebSocket Events](#7-websocket-events)
8. [Database Schemas](#8-database-schemas)
9. [Architecture Decisions](#9-architecture-decisions)
10. [Testing](#10-testing)
11. [Building for Production](#11-building-for-production)
12. [Contributing](#12-contributing)

---

## 1. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22.x | [nvm](https://github.com/nvm-sh/nvm) — `nvm install 22` |
| Yarn Berry | 4.x | Managed automatically via Corepack |
| Corepack | bundled with Node.js 22 | `corepack enable` |
| Podman | 4.x+ | [podman.io](https://podman.io/getting-started/installation) |
| MongoDB | 7.x | Run via `compose.dev.yml` (no local install required) |

**On macOS**, Podman Desktop is the recommended way to get Podman. After installation, start the Podman machine before running any compose commands:

```bash
podman machine init   # first time only
podman machine start
```

---

## 2. Getting Started

```bash
# Clone the repository
git clone https://github.com/[OWNER]/TabPilot.git
cd TabPilot

# Switch to Node.js 22 (reads .nvmrc)
nvm use

# Activate Yarn Berry via Corepack
corepack enable

# Install all workspace dependencies (uses the lockfile — immutable in CI)
yarn install

# Copy environment variable templates for local development
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start MongoDB in a container (development profile — DB only, no app)
podman compose -f compose.dev.yml up -d

# Start the API (port 3000) and web frontend (port 5173) with hot-reload
yarn dev
```

Open `http://localhost:5173` in your browser. The Vite dev server proxies API requests and WebSocket connections to `http://localhost:3000`.

---

## 3. Monorepo Structure

Tab Pilot is a Yarn Berry 4 workspaces monorepo. Each workspace has its own `package.json`, TypeScript config, and build pipeline. Workspaces reference each other using the `workspace:*` protocol.

```
TabPilot/
├── apps/
│   ├── api/                    # @tabpilot/api — NestJS backend
│   │   ├── src/
│   │   │   ├── adapters/       # Custom Socket.io adapter (CORS config)
│   │   │   ├── gateway/        # WebSocket gateway (session.gateway.ts)
│   │   │   ├── participants/   # Participant schema, service, module
│   │   │   ├── sessions/       # Session schema, controller, service, module, DTOs
│   │   │   ├── app.module.ts   # Root NestJS module
│   │   │   └── main.ts         # Bootstrap: Fastify + CORS + validation + WS adapter
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    # @tabpilot/web — React frontend
│       ├── src/
│       │   ├── components/     # Reusable UI components (shadcn/ui + custom)
│       │   ├── hooks/          # Custom React hooks (useSocket, useSession, etc.)
│       │   ├── lib/            # Utility functions, API client (axios)
│       │   ├── pages/          # Route-level page components
│       │   ├── store/          # Zustand stores (session state, participant state)
│       │   ├── styles/         # Global CSS (Tailwind base)
│       │   ├── App.tsx         # Router setup (react-router-dom v7)
│       │   └── main.tsx        # React 19 entry point
│       ├── public/             # Static assets
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── tsconfig.json
│
├── packages/
│   └── shared/                 # @tabpilot/shared — shared TypeScript types
│       └── src/
│           ├── types.ts        # Session, Participant, DTO interfaces
│           ├── events.ts       # WS_EVENTS constants + payload interfaces
│           └── index.ts        # Re-exports everything
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # Type-check + build on push / PR
│       └── publish.yml         # Buildah multi-arch build → GHCR
│
├── Containerfile               # 5-stage RHEL UBI9 multi-arch build
├── compose.yml                 # Production compose (app + MongoDB)
├── compose.dev.yml             # Development compose (MongoDB only)
└── package.json                # Root workspace manifest + scripts
```

### Workspace dependency graph

```
@tabpilot/api  ──depends on──►  @tabpilot/shared
@tabpilot/web  ──depends on──►  @tabpilot/shared
```

`@tabpilot/shared` has no internal dependencies. It is the single source of truth for all TypeScript types and WebSocket event name constants.

---

## 4. Running in Development

### Start everything

```bash
# In one terminal: start MongoDB
podman compose -f compose.dev.yml up -d

# In another terminal: start API + web with hot-reload (concurrently)
yarn dev
```

`yarn dev` runs `nest start --watch` (API) and `vite` (web) simultaneously using `concurrently`, with colour-coded output prefixed `api` and `web`.

### Individual workspace commands

```bash
# API only
yarn workspace @tabpilot/api dev

# Web frontend only
yarn workspace @tabpilot/web dev

# Build shared types (required before building API or web)
yarn workspace @tabpilot/shared build

# Build all workspaces in dependency order
yarn build

# Lint all workspaces
yarn lint

# Clean all build artifacts
yarn clean
```

### Stopping development services

```bash
podman compose -f compose.dev.yml down
```

MongoDB data is persisted in a named volume (`mongo_data_dev`). To wipe it:

```bash
podman compose -f compose.dev.yml down -v
```

---

## 5. Environment Variables

### API (`apps/api/.env`)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `3000` | No | Port the NestJS/Fastify server binds to |
| `MONGODB_URI` | `mongodb://localhost:27017/tabpilot` | Yes | Full MongoDB connection URI |
| `FRONTEND_URL` | `http://localhost:5173` | Yes | Allowed CORS origin for HTTP requests. Set to your production frontend domain in deployment. |
| `NODE_ENV` | `development` | No | `development` or `production`. Affects logging and optimizations. |

**Example `apps/api/.env`:**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tabpilot
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Web (`apps/web/.env`)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | Yes | Base URL of the Tab Pilot REST API. Used by the axios client for session creation and joining. |
| `VITE_WS_URL` | `http://localhost:3000` | Yes | WebSocket server URL for Socket.io. In production this is typically the same as `VITE_API_URL`. |

**Example `apps/web/.env`:**
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

> **Important:** Vite only exposes variables prefixed with `VITE_` to the browser bundle. Never put secrets in `apps/web/.env`.

---

## 6. API Reference

The NestJS API is mounted under the `/api` global prefix. All endpoints are prefixed accordingly.

### Health check

```
GET /api/health
```

Returns `200 OK` with a simple health payload. Used by the container health check.

---

### Create a session

```
POST /api/sessions
```

**Request body:**

```json
{
  "name": "Sprint 42 Grooming",
  "hostName": "Alice",
  "hostEmail": "alice@example.com",
  "urls": [
    "https://linear.app/myteam/issue/ENG-101",
    "https://linear.app/myteam/issue/ENG-102",
    "https://github.com/org/repo/issues/55"
  ],
  "expiryDays": 1,
  "votingEnabled": true
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 1–100 characters |
| `hostName` | string | Yes | 1–80 characters |
| `hostEmail` | string | No | Valid email format |
| `urls` | string[] | Yes | 1–50 URLs; each must be a valid HTTP/HTTPS URL |
| `expiryDays` | integer | Yes | 1–30 |
| `votingEnabled` | boolean | No | Defaults to `false` |

**Response `201 Created`:**

```json
{
  "session": {
    "id": "uuid-v4",
    "name": "Sprint 42 Grooming",
    "joinCode": "483921",
    "hostName": "Alice",
    "hostEmail": "alice@example.com",
    "urls": ["https://linear.app/..."],
    "currentIndex": 0,
    "state": "waiting",
    "votingEnabled": true,
    "createdAt": "2026-04-01T10:00:00.000Z",
    "expiresAt": "2026-04-02T10:00:00.000Z"
  },
  "hostKey": "nanoid-generated-secret"
}
```

> **Security:** The `hostKey` is returned exactly once. The frontend stores it in `localStorage`. The API stores only a bcrypt hash (`hostKeyHash`). There is no way to recover a lost host key.

---

### Get session by ID

```
GET /api/sessions/:id
```

**Response `200 OK`:** Returns a `Session` object (same shape as above, without `hostKey`).

**Response `404 Not Found`:** Session does not exist.

---

### Get session by join code

```
GET /api/sessions/code/:code
```

**Path parameter:** `:code` — the 6-digit numeric join code.

**Response `200 OK`:** Returns a `Session` object.

**Response `404 Not Found`:** No session with that join code exists.

---

### Join a session

```
POST /api/sessions/:id/join
```

**Request body:**

```json
{
  "name": "Bob",
  "email": "bob@example.com",
  "participantId": "optional-existing-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name, 1–80 characters |
| `email` | string | No | Optional email |
| `participantId` | string | No | If provided, re-joins as an existing participant (preserves avatar and identity across page refreshes) |

**Response `201 Created`:**

```json
{
  "session": { "...session object..." },
  "participant": {
    "id": "uuid-v4",
    "sessionId": "uuid-v4",
    "name": "Bob",
    "email": "bob@example.com",
    "avatarUrl": "https://api.dicebear.com/9.x/bottts/svg?seed=...",
    "isOnline": false,
    "joinedAt": "2026-04-01T10:01:00.000Z"
  }
}
```

---

## 7. WebSocket Events

Tab Pilot uses Socket.io for all real-time communication. The WebSocket server is mounted at the root namespace (`/`). Clients join a Socket.io "room" named after the `sessionId`.

### Connection

Connect using the Socket.io client:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
```

All event name constants are exported from `@tabpilot/shared` as `WS_EVENTS`.

---

### Client → Server events

| Event | Constant | Description |
|-------|----------|-------------|
| `join_session` | `WS_EVENTS.JOIN_SESSION` | Join a session room. Must be sent after connecting. |
| `host_start_session` | `WS_EVENTS.HOST_START_SESSION` | Host starts the session, opening the first URL. |
| `host_navigate` | `WS_EVENTS.HOST_NAVIGATE` | Host navigates to next/previous/specific ticket. |
| `host_open_url` | `WS_EVENTS.HOST_OPEN_URL` | Host pushes an arbitrary URL to all participants. |
| `host_end_session` | `WS_EVENTS.HOST_END_SESSION` | Host ends the session for all participants. |
| `submit_vote` | `WS_EVENTS.SUBMIT_VOTE` | Participant submits a story point estimate. |
| `leave_session` | `WS_EVENTS.LEAVE_SESSION` | Client explicitly leaves the session room. |

#### `join_session` payload

```typescript
interface JoinSessionPayload {
  sessionId: string;
  participantId?: string;  // omit if joining as host
  hostKey?: string;        // provide to authenticate as host
}
```

#### `host_start_session` payload

```typescript
interface HostStartSessionPayload {
  sessionId: string;
  hostKey: string;
}
```

#### `host_navigate` payload

```typescript
interface HostNavigatePayload {
  sessionId: string;
  hostKey: string;
  direction?: 'next' | 'prev';  // relative navigation
  index?: number;               // absolute navigation (0-based)
}
```

Either `direction` or `index` must be provided. If both are present, `index` takes precedence.

#### `host_open_url` payload

```typescript
interface HostOpenUrlPayload {
  sessionId: string;
  hostKey: string;
  url: string;  // must be http:// or https://
}
```

#### `host_end_session` payload

```typescript
interface HostEndSessionPayload {
  sessionId: string;
  hostKey: string;
}
```

#### `submit_vote` payload

```typescript
interface SubmitVotePayload {
  sessionId: string;
  participantId: string;
  value: string;  // e.g. "1", "2", "3", "5", "8", "13", "?"
}
```

---

### Server → Client events

| Event | Constant | Sent when |
|-------|----------|-----------|
| `session_state` | `WS_EVENTS.SESSION_STATE` | Immediately after `join_session`; full session + participants snapshot |
| `participant_joined` | `WS_EVENTS.PARTICIPANT_JOINED` | A new participant joins the room |
| `participant_left` | `WS_EVENTS.PARTICIPANT_LEFT` | A participant disconnects permanently |
| `participant_online` | `WS_EVENTS.PARTICIPANT_ONLINE` | A participant's online status changes |
| `session_started` | `WS_EVENTS.SESSION_STARTED` | Host calls `host_start_session` |
| `navigate_to` | `WS_EVENTS.NAVIGATE_TO` | Navigation event — open this URL |
| `open_tab` | `WS_EVENTS.OPEN_TAB` | Host pushes an arbitrary URL via `host_open_url` |
| `session_ended` | `WS_EVENTS.SESSION_ENDED` | Host ends the session |
| `vote_update` | `WS_EVENTS.VOTE_UPDATE` | Any participant submits or changes their vote |
| `error` | `WS_EVENTS.ERROR` | An error occurred (invalid host key, session not found, etc.) |

#### `session_state` payload

```typescript
interface SessionStatePayload {
  session: Session;
  participants: Participant[];
}
```

#### `participant_joined` payload

```typescript
interface ParticipantJoinedPayload {
  participant: Participant;
}
```

#### `participant_left` payload

```typescript
interface ParticipantLeftPayload {
  participantId: string;
}
```

#### `participant_online` payload

```typescript
interface ParticipantOnlinePayload {
  participantId: string;
  isOnline: boolean;
}
```

#### `session_started` payload

```typescript
interface SessionStartedPayload {
  currentUrl: string;
  currentIndex: number;
  total: number;
}
```

#### `navigate_to` payload

```typescript
interface NavigateToPayload {
  url: string;
  index: number;  // 0-based position in the URL queue
  total: number;  // total number of URLs in the queue
}
```

#### `open_tab` payload

```typescript
interface OpenTabPayload {
  url: string;
}
```

#### `vote_update` payload

```typescript
interface VoteUpdatePayload {
  votes: Record<string, string>;  // participantId → vote value
}
```

Votes are stored in memory on the server and reset when the host navigates to a new ticket. They are not persisted to MongoDB.

#### `error` payload

```typescript
interface WsErrorPayload {
  message: string;
  code: string;  // e.g. 'INVALID_HOST_KEY', 'SESSION_NOT_FOUND', 'VOTING_DISABLED'
}
```

---

## 8. Database Schemas

Tab Pilot uses MongoDB 7 with Mongoose. There are two collections: `sessiondocs` and `participantdocs`.

### Session schema (`sessiondocs` collection)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | String | Yes | UUID v4, unique, indexed. Primary identifier used in all API and WS calls. |
| `name` | String | Yes | Human-readable session name set by the host. |
| `joinCode` | String | Yes | 6-digit numeric code, unique, indexed. Used by participants to find the session. |
| `hostName` | String | Yes | Display name of the host. |
| `hostEmail` | String | No | Optional host email address. |
| `hostKeyHash` | String | Yes | bcrypt hash of the host key. The plaintext key is never stored. |
| `urls` | String[] | Yes | Ordered list of ticket URLs. Up to 50 entries. |
| `currentIndex` | Number | No | 0-based index of the currently active URL. Defaults to `0`. |
| `state` | String | Yes | Session lifecycle state: `'waiting'` → `'active'` → `'ended'`. |
| `votingEnabled` | Boolean | No | Whether story point voting is enabled for this session. Defaults to `false`. |
| `expiresAt` | Date | Yes | UTC datetime when the session expires. Calculated from `expiryDays` at creation. |
| `createdAt` | Date | Auto | Mongoose `timestamps: true` — creation timestamp. |
| `updatedAt` | Date | Auto | Mongoose `timestamps: true` — last update timestamp. |

### Participant schema (`participantdocs` collection)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participantId` | String | Yes | UUID v4, unique, indexed. Stored in the browser's `localStorage` for identity persistence. |
| `sessionId` | String | Yes | UUID v4 of the parent session, indexed for efficient lookup. |
| `name` | String | Yes | Display name entered at join time. |
| `email` | String | No | Optional email address. |
| `avatarUrl` | String | Yes | DiceBear Bottts SVG URL generated deterministically from the participant name + a random seed. |
| `socketId` | String | No | Current Socket.io socket ID. Updated on every reconnect to allow targeted emissions. |
| `isOnline` | Boolean | No | Whether the participant currently has an active WebSocket connection. Defaults to `false`. |
| `createdAt` | Date | Auto | Mongoose `timestamps: true` — join timestamp. |
| `updatedAt` | Date | Auto | Mongoose `timestamps: true` — last update timestamp. |

---

## 9. Architecture Decisions

### Why Yarn Berry (v4) workspaces?

Yarn Berry's Plug'n'Play resolver eliminates the `node_modules` hoisting problem that causes phantom dependency bugs in classic Yarn and npm. In a monorepo, this is especially valuable: each workspace can only import what it explicitly declares as a dependency. The `workspace:*` protocol gives exact, version-controlled inter-workspace references. Corepack ensures the exact Yarn version declared in `packageManager` is used — no "works on my machine" version drift.

### Why NestJS with Fastify?

NestJS provides a structured, opinionated framework with first-class TypeScript support, a module system that maps cleanly to domain boundaries (sessions, participants, gateway), and built-in support for Socket.io via `@nestjs/websockets`. The Fastify adapter is used instead of the default Express adapter for measurably better throughput and lower memory overhead — particularly important for the WebSocket upgrade path under load.

### Why Socket.io?

Socket.io sits on top of WebSockets and provides automatic reconnection with exponential back-off, room-based broadcasting (each session is a room), and graceful degradation for environments where raw WebSockets are blocked. The reconnect behaviour is critical for Tab Pilot: participants behind corporate proxies or on flaky mobile networks can drop and rejoin without losing session context.

### Why Zustand?

Zustand was chosen over Redux Toolkit for React state management because Tab Pilot's state model is simple and co-located with the Socket.io event handlers. Zustand's minimal boilerplate, direct mutation API (via Immer), and lack of required providers make it straightforward to wire socket events directly to store actions without action creators, reducers, or selectors.

### Why RHEL UBI9 as the base image?

Red Hat Universal Base Images are freely redistributable, enterprise-hardened, and receive timely CVE patches. Using `ubi9/nodejs-22` as the build base and `ubi9/nodejs-22-minimal` as the production runner reduces the attack surface while ensuring the image is compatible with OpenShift and other enterprise container platforms. The minimal variant strips out package managers and other tooling not needed at runtime, cutting the final image size significantly. The production container runs as UID 1001 (non-root), which is a requirement in most enterprise Kubernetes deployments.

---

## 10. Testing

### Running tests

```bash
# Run all tests across all workspaces
yarn test

# Run tests for the API only
yarn workspace @tabpilot/api test

# Run tests in watch mode (API)
yarn workspace @tabpilot/api test:watch

# Run with coverage
yarn workspace @tabpilot/api test:cov
```

### What is tested

- **Sessions service** — session creation, host key hashing and validation, state transitions, join code uniqueness
- **Participants service** — participant creation, avatar URL generation, online status tracking, socket ID updates
- **Sessions controller** — HTTP request/response shapes, 404 handling for unknown sessions and join codes
- **DTOs** — `class-validator` constraint enforcement (URL validation, array size limits, expiry range)

The WebSocket gateway and real-time event flows are tested via integration tests that spin up an in-memory NestJS application and connect real Socket.io test clients.

---

## 11. Building for Production

### Build all workspaces

```bash
yarn build
```

This runs `yarn workspaces foreach -t run build`, which respects the topological dependency order: `@tabpilot/shared` builds first, then `@tabpilot/api` and `@tabpilot/web` in parallel.

### Containerfile stages

The `Containerfile` uses a 5-stage build:

| Stage | Base | Purpose |
|-------|------|---------|
| `deps` | `ubi9/nodejs-22` | Install all workspace dependencies with `yarn install --immutable` |
| `shared-builder` | `deps` | Build `@tabpilot/shared` |
| `web-builder` | `shared-builder` | Build the React frontend with Vite (`tsc && vite build`) |
| `api-builder` | `shared-builder` | Build the NestJS API; copies web dist for static file serving |
| `runner` | `ubi9/nodejs-22-minimal` | Copy only production artifacts; install prod-only deps; run as UID 1001 |

The runner stage copies:
- `apps/api/dist` — compiled NestJS application
- `apps/web/dist` — compiled React static assets (served by the API in production)
- `packages/shared/dist` — compiled shared types

### Build and run with Podman Compose

```bash
# Build the container image from source and start the stack
podman compose up --build -d

# Watch logs
podman compose logs -f app

# Stop everything
podman compose down

# Stop and remove the MongoDB volume (data wipe)
podman compose down -v
```

### Build multi-arch images manually

```bash
# Build for the current platform
podman build -f Containerfile -t tabpilot:local .

# Build for a specific platform
podman build --platform linux/amd64 -f Containerfile -t tabpilot:amd64 .
podman build --platform linux/arm64 -f Containerfile -t tabpilot:arm64 .
```

Multi-arch manifest builds for GHCR are handled by the `publish.yml` GitHub Actions workflow using Buildah and `redhat-actions/push-to-registry`.

---

## 12. Contributing

Please read the [Contributing Guide](../.github/CONTRIBUTING.md) for branch naming conventions, commit message format, the PR process, and code style guidelines.
