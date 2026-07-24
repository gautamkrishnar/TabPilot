---
sidebar_position: 2
title: Joining a Session
---

# Joining a Session

Joining a Tab Pilot session takes under 30 seconds. No account, no download, no plugin.

## Method 1: Enter the Join Code

1. Open Tab Pilot at [https://tabpilot.gkr.pw/](https://tabpilot.gkr.pw/) (or your self-hosted URL)
2. On the home page, enter the **6-character join code** shared by your host
3. Click **Join**
4. Enter your **name** (required) and optionally your **email**
5. Click **Join Session**

Your browser will immediately navigate to whatever ticket the host is currently presenting. From this point, every time the host clicks Next or Previous, your browser navigates automatically.

## Method 2: Direct URL

If the host shared a direct link, it looks like:

```
https://tabpilot.gkr.pw/join?code=XXXXXX
```

Opening this URL pre-fills the join code. You only need to enter your name and click **Join Session**.

## Method 3: Saved Sessions

If you have joined a session before, it appears in the **recent sessions** list on the Tab Pilot home page. Click it to rejoin without re-entering the code.

:::tip Returning after a refresh
If you refresh the participant view or close and reopen the tab, Tab Pilot restores your session from localStorage and reconnects automatically. You do not need to re-enter the join code.
:::

## What Happens After Joining

Once you have joined:

- Your browser opens the **participant view** for the session
- The current ticket URL is opened in your browser (via the embedded frame or a link, depending on the ticket type)
- You appear in the host's participants list
- If voting is enabled, the vote panel appears when the host is on a ticket

## Voting

If the host has enabled story point voting:

1. Vote cards appear at the bottom of the participant view
2. Click a card to cast your vote: `0, 1, 2, 3, 5, 8, 13, 21, ?, ☕`
3. Your vote is recorded but **not visible to others** until the host reveals
4. Once the host clicks **Reveal**, all votes are shown simultaneously

See [Story Point Voting](./voting.md) for more detail.

## Leaving a Session

Participants can close the browser tab at any time. There is no "leave" button — just close the tab. The host's participants panel will show the participant as disconnected.

If you return to the same URL, you can rejoin by entering your name again.

## Troubleshooting

**"Session not found" error**
- Double-check the join code — it is case-insensitive but must be exactly 6 characters
- The session may have expired or been ended by the host

**Browser does not navigate when the host advances**
- Check that your network allows WebSocket connections (port 443 over WSS)
- Try refreshing the participant view — this reconnects the WebSocket

**Voting panel not visible**
- The host may not have enabled story point voting for this session
- Ask the host to enable it from the host dashboard
