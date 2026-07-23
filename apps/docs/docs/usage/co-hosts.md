---
sidebar_position: 4
title: Co-hosts
---

# Co-hosts

Co-hosts are trusted session participants who share navigation control with the primary host. This is useful when:

- The primary host wants to hand off facilitation mid-session
- Two people are co-facilitating a grooming session
- The host wants a backup in case of connectivity issues

---

## Inviting a Co-host

After creating a session, the host dashboard displays a **co-host invite link**. This link is unique to the session and contains an invite key.

```
https://tabpilot.gkr.pw/host/join/SESSION_ID
```

Share this link with the person you want to add as a co-host via Slack, email, or your video call chat.

:::warning Keep the invite link private
Anyone with this link can join as a co-host and gain full navigation control. Share it only with trusted teammates.
:::

---

## Joining as a Co-host

The invited person:

1. Opens the co-host invite link
2. Enters the **invite key** (embedded in the URL or provided separately by the host)
3. Enters their **name**
4. Clicks **Join as Co-host**

They are taken to the host dashboard view with full controls.

---

## What Co-hosts Can Do

Co-hosts have access to most host controls:

| Action | Co-host |
|---|---|
| Navigate to Next/Previous ticket | Yes |
| Mark current ticket as complete | Yes |
| Reveal votes | Yes |
| Reset votes | Yes |
| Save story points to Jira | Yes |
| Reorder the ticket queue | Yes |
| Toggle story point voting | Yes |
| Invite additional co-hosts | No |
| End the session | No |
| Remove participants | No |

:::note Session ownership
Only the original host (who created the session) can end the session or invite new co-hosts. Co-hosts have operational control but not administrative control.
:::

---

## Multiple Co-hosts

A session can have more than one co-host. Each co-host joins independently via the same invite link. All co-hosts and the primary host can navigate concurrently — the last navigation event wins (similar to how Google Docs handles concurrent edits).

In practice, the team typically designates one person as the active facilitator at any given time, even if multiple people have co-host access.

---

## Co-host Persistence

Co-host status is stored in the browser's `localStorage`. If a co-host refreshes the page or closes and reopens the tab, they are automatically reconnected with full co-host privileges — they do not need to re-enter the invite key.

---

## Revoking Co-host Access

There is currently no in-session UI for revoking co-host access. If you need to remove a co-host:

1. End the current session
2. Create a new session with a fresh invite key
3. Re-invite only the co-hosts you want

This is an intentional design choice to keep the session model simple. The invite key is session-scoped and cannot be rotated mid-session.
