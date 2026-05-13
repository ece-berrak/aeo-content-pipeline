# Setup — from zero to your first Google Doc draft

Plan ~45 minutes for a clean install. Most of the time is account creation and the Notion workspace; n8n config is fast once accounts exist.

---

## Prerequisites

| | Required | Used for |
|---|---|---|
| **Notion account** | ✅ | Pipeline database + Brand Context page (editorial layer) |
| **n8n instance** | ✅ | Workflow orchestration. Cloud (n8n.cloud, $20/mo) or self-hosted (Fly.io / Railway / your VPS, ~$5/mo) |
| **Anthropic API key** | ✅ | Claude Sonnet 4.6 for drafting (~$0.10/draft, prompt-cached ~$0.02) |
| **Google account with Drive** | ✅ | Google Docs as the review surface |

That's it for MVP. Roadmap items (SerpAPI, Search Console, GitHub publisher) are NOT required to get the pipeline running.

---

## Step 1 — Notion workspace (15 min)

Follow [`notion-setup.md`](notion-setup.md) to create:
- `Content Pipeline` parent page
- `Pipeline` database (with 8 properties: Title, Keyword, Type, Status, Cluster, ICP slice, Notes for AI, Draft Attached)
- `Brand Context` sub-page (you'll fill this in step 2)

Then collect three Notion identifiers — you'll need them in step 4:
- **Pipeline database ID** (32-char hex from the DB URL)
- **Brand Context page ID** (32-char hex from the page URL)
- **Notion integration token** (you'll create this in step 3)

---

## Step 2 — Fill Brand Context (15 min)

Copy [`examples/brand-context.example.md`](../examples/brand-context.example.md) into your Brand Context page in Notion. Replace every section with your own values:

1. About this page (one-paragraph intro)
2. Positioning (your one-paragraph wedge)
3. Ideal Customer Profile (fits / doesn't fit)
4. Value props
5. Voice & tone (Do / Don't)
6. Never say (forbidden phrases — your taste)
7. Style rules (sentence case headings, em-dashes, etc.)
8. Talking points & proof
9. Competitor map (3–5 named competitors)
10. Content formats (specs for each Type your team uses)
11. Social adaptation rules
12. Hook patterns
13. CTA library
14. Boilerplate (one-line, two-line, signature)
15. Internal link library
16. Publisher config (for the auto-publish roadmap item)

> The more specific and opinionated, the better. Generic Brand Context = generic content. The pipeline reads this **before every draft**.

---

## Step 3 — Create the 3 credentials (10 min)

See [`n8n/credentials.example.md`](../n8n/credentials.example.md) for full details. Quick version:

### Notion API
1. notion.so/profile/integrations → **+ New integration**
2. Name: `n8n content pipeline`, capabilities: Read + Update + Insert content
3. Copy the **Internal Integration Secret**
4. In Notion, open Pipeline DB → ⋯ → **Connections** → connect your integration
5. Open Brand Context page → same → connect

### Anthropic API
1. console.anthropic.com → API Keys → **+ Create Key**
2. Copy the key, add billing

### Google Docs OAuth2
- **n8n Cloud:** nothing on Google's side, just "Sign in with Google" inside n8n
- **Self-hosted n8n:** Google Cloud Console project → enable Docs + Drive APIs → OAuth consent screen → create OAuth Client ID → paste Client ID/Secret into n8n. Full steps in [`credentials.example.md`](../n8n/credentials.example.md).

---

## Step 4 — Import the workflow (5 min)

1. Download [`n8n/content-pipeline.json`](../n8n/content-pipeline.json)
2. n8n → Workflows → **Import from File** → select the JSON
3. The workflow opens with 12 nodes connected
4. For each node showing a red ⚠️ icon (credential not configured):
   - Click the node
   - In the **Credentials** section, pick the matching credential you created in step 3
5. Replace placeholder IDs:
   - `Get many database pages` → **Database** dropdown → pick your Pipeline DB
   - `Get many child blocks` → **Block** field → paste your Brand Context page URL
   - `Create a document` → **Folder Name** → pick your target Drive folder
6. Save the workflow

**Important:** Don't activate the workflow yet — first test manually in step 5.

---

## Step 5 — Smoke test (5 min)

In Notion, open Pipeline DB and add a test ticket:
- **Title:** `Test — Gong vs Clari`
- **Keyword:** `gong vs clari`
- **Type:** `Long-form blog`
- **Cluster:** any
- **ICP slice:** any
- **Notes for AI:** *Optional. Try "focus on the persona of a VP Sales at a 100-person SaaS."*
- **Status:** `queued`

In n8n, click **Execute Workflow** (top right). Watch the nodes light up green one by one:

1. `Schedule Trigger` → instant
2. `Edit Fields` → instant
3. `Get many database pages` → ~1 sec → should show your test ticket in output
4. `Extract` → instant
5. `Get many child blocks` → ~2 sec → should show ~218 items (your Brand Context blocks)
6. `Build Draft Code` → instant → check `brand_context_md_length` > 0 in output
7. `HTTP Request` (Anthropic) → **30–90 sec** → returns the Claude draft
8. `Parse Response` → instant → check `PARSE_FAILED: false`
9. `Build Google Doc Content` → instant
10. `Create a document` → ~2 sec → returns the Doc `id`
11. `Update a document` → ~3 sec → inserts content
12. `Update Notion Page Property` → ~1 sec → flips Status to `review`

Verify in:
- **Google Drive** → new Doc in your target folder, fully written
- **Notion ticket** → `Draft Attached` property has Doc URL, `Status` is `review`

---

## Step 6 — Activate the workflow (1 min)

If smoke test passed:

1. In n8n, top-right of the workflow screen → toggle **Active** to ON
2. The Schedule Trigger now fires every 3 minutes

From this point on, any new ticket with `Status = queued` is picked up automatically within 3 minutes.

---

## Step 7 — Verify prompt caching is working (optional, 2 min)

Run a second test ticket within 5 minutes of the first. After the workflow completes:

1. Click `HTTP Request` node → output → find the `usage` object
2. Check `cache_read_input_tokens` — should be ~4500–5000 (your Brand Context cached)
3. `input_tokens` should be very small (~3–200, just the ticket-specific text)

This confirms ~90% input cost reduction on the second draft. See README's *Prompt caching* section.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Get many database pages` returns empty | No `queued` tickets, OR integration not shared with DB | Verify ticket Status = `queued`. Re-share DB with integration (Connections menu). |
| `Get many child blocks` returns 1 item with empty text | Brand Context not shared with integration | In Notion, open Brand Context → ⋯ → Connections → add your integration |
| `Build Draft Code` output shows `brand_context_md_length: 0` | `$input.all()` returned nothing; upstream broke | Verify previous nodes ran successfully. Check Code is using `$('Get many child blocks').all()` (not `$input.all()`) |
| `HTTP Request` 401 | Anthropic API key invalid or wrong credential selected | Recheck credential, check Anthropic billing status |
| `HTTP Request` times out | Claude call took >180 sec; rare, usually transient | Increase timeout in node options; try again |
| `Parse Response` returns `PARSE_FAILED: true` | Claude returned non-JSON (broken markdown fences, prose preamble) | Check `raw_first_500` field in output; refine system prompt to enforce JSON-only |
| `Create a document` 403 | Google OAuth scope missing (need both Docs + Drive) | Reconnect Google credential; re-grant Drive access |
| `Update Notion Page Property` returns "Status name is not valid" | Your Notion Status property options don't include `review` | Open Pipeline DB → Status property → Edit options → add `review` (lowercase) |
| `Update Notion Page Property` returns "Draft Attached is not a property" | Property name mismatch (capitalization) | Check Notion property name exactly. Update the JSON body in the node to match |
| Same ticket processed multiple times in a row | Status filter not matching, or workflow didn't update Status | Verify filter is `Status equals queued` and Update node successfully flips to `review` |

---

## Costs after setup

| | Cost |
|---|---|
| Idle (no queued tickets) | $0 — only Notion polls run, no Claude calls |
| 30 drafts / month with caching | ~$3 (Anthropic) + $20 (n8n Cloud) = **$23/mo** |
| 30 drafts / month self-hosted | ~$3 + $5 (VPS) = **$8/mo** |

If you go more than 5 minutes between drafts, the cache cold-starts. Plan drafting in batches if cost matters.

---

## What you've built

A pipeline that:
- Pulls Brand Context once, every poll
- Caches it with Anthropic for repeat use
- Generates structured, voice-aligned drafts
- Drops them into Google Docs for collaborative review
- Cleanly hands off to the human review step

What's still manual:
- Reviewing in Google Docs
- Publishing to your CMS / LinkedIn / X / etc.

See the README's [Roadmap](../README.md#roadmap) for what's next.
