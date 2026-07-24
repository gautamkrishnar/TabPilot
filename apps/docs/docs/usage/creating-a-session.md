---
sidebar_position: 1
title: Creating a Session
---

# Creating a Session

The host creates a session and controls the queue. Participants join with a code and their browsers navigate automatically.

## Step-by-Step

### 1. Go to the Create Session Page

Open Tab Pilot ([https://tabpilot.gkr.pw/](https://tabpilot.gkr.pw/) or your self-hosted URL) and click **Create Session** on the home page.

### 2. Fill in the Session Details

| Field | Description |
|---|---|
| **Session name** | A label for this grooming session, e.g. "Sprint 42 Grooming" |
| **Your name** | The host's display name, shown to participants |
| **Email** (optional) | Host email — not shared with participants |

### 3. Paste Your Ticket URLs

In the **Ticket URLs** text area, paste one URL per line. These are the tickets you plan to groom in order. Example:

```
https://myteam.atlassian.net/browse/PROJ-101
https://myteam.atlassian.net/browse/PROJ-102
https://myteam.atlassian.net/browse/PROJ-103
https://github.com/myorg/myrepo/issues/55
```

Any HTTP/HTTPS URL is valid — not just Jira. Jira URLs get title enrichment if the integration is configured.

:::tip Reordering tickets
The order of the list is the grooming order. You can reorder or remove tickets from the host dashboard after the session starts.
:::

### 4. Configure Options

- **Story point voting** — toggle on to enable the Fibonacci voting panel for participants. Can also be toggled mid-session from the host dashboard.
- **Session expiry** — choose how long the session stays active (e.g., 2 hours, 8 hours, 1 day). After expiry, participants can no longer join or view the session.

### 5. Create the Session

Click **Create Session**. Tab Pilot creates the session in the database and takes you directly to the **host dashboard**.

## The Host Dashboard

After creation you land on the host dashboard. Key elements:

- **Join code** — a 6-character alphanumeric code displayed prominently. Share this with your team.
- **URL queue** — the list of tickets. Click **Next** or **Previous** to navigate, which syncs all participant browsers.
- **Participants panel** — live list of who has joined.
- **Voting panel** — appears when story point voting is enabled.
- **Co-host invite link** — share to give a teammate host-level navigation control.

## Sharing the Session

Share the **6-character join code** with your team verbally, in Slack, or in your meeting invite. Participants go to Tab Pilot's home page, enter the code, and join. Alternatively, share the direct URL:

```
https://tabpilot.gkr.pw/join?code=XXXXXX
```

:::note No accounts required
Participants do not need to register or log in. They only need the join code and a name.
:::

## Ending the Session

When grooming is complete, click **End Session** in the host dashboard. This broadcasts a session-ended event to all participants and marks the session as closed. Participants are redirected to the home page.

Ended sessions are still visible in the "recent sessions" list on the home page for reference.
