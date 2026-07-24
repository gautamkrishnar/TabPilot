---
sidebar_position: 3
title: AI Ticket Scoring
---

# AI Ticket Scoring

Tab Pilot can score the quality of Jira tickets across six dimensions using **Gemini Flash** via the **Vertex AI** API. This helps teams quickly identify tickets that need more detail before grooming.

:::note Optional feature
AI ticket scoring is entirely optional and disabled by default. The UI only shows scoring elements when the backend reports that scoring is configured. There is no impact on sessions if this feature is not set up.
:::

## What Gets Scored

Each Jira ticket is analyzed and given a score from 0–100 on six quality dimensions:

| Dimension | What it measures |
|---|---|
| **Clarity** | Is the ticket description unambiguous and easy to understand? |
| **Completeness** | Does it include enough context to implement without guesswork? |
| **Actionability** | Is there a clear, implementable task defined? |
| **Testability** | Are acceptance criteria or test cases present? |
| **Formatting** | Is the description well-structured and readable? |
| **Context** | Is the business context or motivation explained? |

Scores are displayed:
- As a **color-coded badge** in the URL queue (green ≥ 75, amber ≥ 50, red < 50)
- As an **expandable per-dimension breakdown** on the current ticket in the host dashboard and participant view

## Prerequisites

1. A **Google Cloud project** with the **Vertex AI API** enabled
2. A **service account** with the `roles/aiplatform.user` role
3. A downloaded JSON key file for that service account

## Setup Guide

### Step 1: Enable Vertex AI

```bash
gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID
```

Or enable it in the [Google Cloud Console](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com).

### Step 2: Create a Service Account

```bash
# Create the service account
gcloud iam service-accounts create tabpilot-scoring \
  --display-name="Tab Pilot Ticket Scoring" \
  --project=YOUR_PROJECT_ID

# Grant the Vertex AI user role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:tabpilot-scoring@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Step 3: Download the JSON Key

```bash
gcloud iam service-accounts keys create /path/to/gcp-sa.json \
  --iam-account=tabpilot-scoring@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Store this file securely — it grants access to your GCP project.

### Step 4: Configure Environment Variables

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcp-sa.json
VERTEX_AI_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash
```

In a Docker Compose deployment, mount the key file as a read-only volume:

```yaml
  app:
    image: ghcr.io/gautamkrishnar/tabpilot:latest
    volumes:
      - /path/to/gcp-sa.json:/secrets/gcp-sa.json:ro
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-sa.json
      - VERTEX_AI_LOCATION=us-central1
      - GEMINI_MODEL=gemini-2.5-flash
```

## Verifying the Setup

After restarting the app, check the scoring status endpoint:

```bash
curl http://localhost:3000/api/ticket-score/status
# {"configured":true}
```

If `configured` is `false`, check the app logs for Vertex AI authentication errors:

```bash
docker compose logs app | grep -i vertex
docker compose logs app | grep -i gemini
```

## How the UI Works

Once the backend reports `configured: true`, the frontend activates the scoring UI automatically:

1. **TicketScoreBadge** appears next to each Jira URL in the queue:
   - Green badge: overall score ≥ 75
   - Amber badge: overall score ≥ 50
   - Red badge: overall score < 50

2. **TicketScoreBreakdown** appears on the currently active ticket:
   - Click the badge or a dedicated expand button to see per-dimension scores
   - Each dimension shows its individual score with a visual indicator

3. **Refresh button** — the host can request a fresh score for the current ticket. Scores are cached in MongoDB to avoid redundant API calls.

## Caching

Scores are cached in MongoDB keyed by Jira issue key and base URL. The cache is not time-limited — if you update a ticket description in Jira and want a fresh score, use the refresh button in the host dashboard.

## Cost Considerations

Gemini Flash is one of Google's most cost-efficient models. A typical ticket description is a few hundred tokens. At current Vertex AI pricing, scoring hundreds of tickets per month costs fractions of a cent.

Refer to the [Vertex AI pricing page](https://cloud.google.com/vertex-ai/generative-ai/pricing) for current rates.

## Supported Regions

The `VERTEX_AI_LOCATION` variable controls which Google Cloud region handles the Gemini API calls. Gemini Flash is available in:

- `us-central1` (default)
- `us-east4`
- `europe-west4`
- `asia-southeast1`

Check the [Vertex AI model availability page](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations) for the full and current list.
