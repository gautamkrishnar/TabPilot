---
sidebar_position: 3
title: Story Point Voting
---

# Story Point Voting

Tab Pilot includes built-in story point voting using **Planning Poker** (Fibonacci sequence). All participants vote simultaneously and votes are revealed at once — preventing anchoring bias.

---

## Enabling Voting

Story point voting can be:

- **Enabled at session creation** — check the "Enable story point voting" option when creating the session
- **Toggled mid-session** — the host can turn voting on or off at any time from the host dashboard, without ending the session

---

## Vote Values

Participants choose from the standard Planning Poker deck:

| Value | Meaning |
|---|---|
| `0` | No effort / already done |
| `1` | Trivial |
| `2` | Very small |
| `3` | Small |
| `5` | Medium |
| `8` | Large |
| `13` | Very large |
| `21` | Epic / needs splitting |
| `?` | Uncertain — needs more discussion |
| `☕` | Need a break |

---

## How a Voting Round Works

### 1. Participants Vote

When the host navigates to a ticket, the vote panel appears for all participants. Each participant clicks their card. Their vote is **private** — no one else can see it until reveal.

The host dashboard shows which participants have voted (without revealing the values) via a "voted" indicator — useful for knowing when everyone has cast their vote.

### 2. Host Reveals

When the host is ready (typically when all participants have voted), they click **Reveal Votes**. All votes are shown simultaneously to everyone in the session.

The reveal shows:
- Each participant's name and their vote
- The **average** (excluding `?` and `☕` votes)

### 3. Discussion and Re-vote (Optional)

If there is significant divergence (e.g., a 2 and a 13), the team discusses. The host can click **Reset Votes** to clear the round and let everyone vote again after the discussion.

### 4. Host Advances

When the team agrees on a number, the host records it (mentally or saves it to Jira) and clicks **Next** to move to the next ticket. Moving to the next ticket automatically resets votes for the new round.

---

## Saving to Jira

If [Jira integration](../configuration/jira-integration.md) is configured and a story points field is mapped for the current ticket's project, the host sees a **Save to Jira** button after reveal.

Clicking it writes the average (rounded to the nearest valid Fibonacci number) back to the ticket's story points field in Jira.

:::tip
The average is shown with one decimal place. The host can edit the value before saving if the team agreed on a different number than the average.
:::

---

## Accumulated Vote History

As the host navigates through the queue, the story points saved for each URL are accumulated. The host dashboard shows a summary of all saved estimates alongside the ticket list, making it easy to review the full session output at the end.

---

## Tips for Running Effective Voting

- **Use `?`** when you genuinely don't have enough information — it signals to the host that the ticket needs more detail before it can be estimated
- **Use `☕`** to signal the team needs a break — it adds a human touch without disrupting the flow
- The simultaneous reveal is intentional — it prevents the first voter from anchoring everyone else's estimate
- If a single outlier consistently votes very differently, encourage them to explain their reasoning — these conversations often surface hidden complexity
