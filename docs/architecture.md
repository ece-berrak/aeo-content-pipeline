# Architecture

The pipeline has two layers separated by clear boundaries:

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1 — Editorial (humans)                                │
│  Notion: Pipeline DB + Brand Context                         │
└──────────────────────────────────────────────────────────────┘
                            │  reads / writes
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  LAYER 2 — Orchestration (n8n, 12 nodes)                     │
│  Poll → Read → Draft → Store → Notify                        │
└──────────────────────────────────────────────────────────────┘
                            │  produces
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Output: Google Doc + Notion ticket property update          │
│  Human takes over from here (review → publish manually)      │
└──────────────────────────────────────────────────────────────┘
```

This separation matters because:
- **Editorial** evolves slowly (positioning rarely changes)
- **Orchestration** evolves fastest (prompt tuning, model swaps, pipeline changes)
- **Publishing** is intentionally manual in the MVP — kept out of the orchestration layer so brand misfires don't ship live

If you swap LLM providers later, only the orchestration layer changes. If you add auto-publishers later (see [Roadmap](../README.md#roadmap)), they become a new optional branch in n8n — Notion and the existing 12 nodes don't change.

---

## The 12-node flow, node by node

```
[1]  Schedule Trigger        ─ every 3 minutes
      │
[2]  Edit Fields             ─ holds DB IDs as variables (documentation aid)
      │
[3]  Get many database pages ─ Notion: pull all tickets where Status = queued
      │
[4]  Extract                 ─ JS: flatten Notion properties → clean ticket object
      │   ┌─────────────────────────────────────────────────────┐
      ├──►│ [5] Get many child blocks ─ Notion: read 218 blocks │
      │   │     of Brand Context page                            │
      │   └─────────────────────────────────────────────────────┘
      │                              │
[6]  Build Draft Code ◄──────────────┘
      │     ─ JS: assemble Claude /v1/messages request body
      │     ─ Brand Context goes in user message as content block
      │       with cache_control: ephemeral
      │
[7]  HTTP Request             ─ POST https://api.anthropic.com/v1/messages
      │                         (Sonnet 4.6, max_tokens 8000, 180s timeout)
      │
[8]  Parse Response           ─ JS: extract JSON from Claude's reply
      │                         (handles markdown fences, partial fails)
      │
[9]  Build Google Doc Content ─ JS: assemble plain text body for the Doc
      │                         (title, meta block, divider, body, FAQ)
      │
[10] Create a document        ─ Google Docs API: create empty Doc with title
      │                         in target Drive folder
      │
[11] Update a document        ─ Google Docs API: insert content at index 1
      │                         (Doc now has full draft)
      │
[12] Update Notion Page       ─ Notion HTTP PATCH /v1/pages/{ticket_id}
     Property                   sets Draft Attached URL + Status = review
```

---

## Node detail

### [1] Schedule Trigger
**Type:** `n8n-nodes-base.scheduleTrigger`
**Interval:** every 3 minutes
**Why 3 minutes?** Tight enough to feel responsive when you add a ticket; loose enough that idle polling cost is negligible. The 3-min interval also aligns with Anthropic's 5-min prompt cache TTL — consecutive batched tickets reliably hit cache.

### [2] Edit Fields
**Type:** `n8n-nodes-base.set`
**Holds:** `pipeline_database_id`, `brand_context_page_id` (string variables)
**Note:** These values are documentation-only in the current workflow — downstream nodes hardcode the IDs in their own config. Kept here so a new operator knows what IDs the workflow depends on.

### [3] Get many database pages
**Type:** `n8n-nodes-base.notion` (Notion node v2.2)
**Operation:** Database Page → Get Many
**Filter:** `Status equals "Queued"` (or `queued`, case depends on your Status property values)
**Returns:** All tickets matching the filter (each as one item with `properties`, `id`, `url`, etc.)
**If empty:** workflow exits — no Claude calls happen, no cost incurred

### [4] Extract
**Type:** `n8n-nodes-base.code`
**What it does:** Flattens Notion's verbose `properties` shape into clean fields:

```js
{
  ticket_id: t.id,
  keyword: 'gong vs clari',
  type: 'Long-form blog',
  cluster: 'Sales forecasting',
  icp_slice: 'VP Sales, RevOps Lead',
  notes_for_ai: 'Focus on the persona of...',
  page_url: 'https://notion.so/...'
}
```

Defensive: handles missing properties gracefully (defaults to `''` or `'Long-form blog'`).

### [5] Get many child blocks
**Type:** `n8n-nodes-base.notion`
**Operation:** Block → Get Many
**Target:** Brand Context page URL
**Returns:** All blocks of the page as separate items (~218 blocks for a fully-filled 16-section Brand Context)
**Important:** Fan-out behavior — for each ticket from Extract, this runs once, producing all blocks. With multiple tickets, blocks are tagged per-ticket-iteration.

### [6] Build Draft Code
**Type:** `n8n-nodes-base.code`
**Inputs:** Brand Context blocks (from node 5) + ticket (from node 4)
**Key logic:**
1. Render Brand Context blocks → markdown (handles headings, bullets, quotes, callouts, etc.)
2. Build user content array with two blocks:
   - **Block 0:** Brand Context markdown — **marked with `cache_control: { type: 'ephemeral' }`**
   - **Block 1:** Ticket-specific instructions (Keyword, Type, ICP, Notes, Task)
3. Build full Claude request body as stringified JSON
4. Output `claude_request_body` field for the HTTP Request node

**Why Brand Context in user message, not system field:**
n8n's HTTP Request node sometimes drops the `system: [...]` array structure when passing the body through. User message content arrays are reliable. Caching works at either position — we picked user message for compatibility.

**Why explicit node reference:**
The code uses `$('Get many child blocks').all()` instead of `$input.all()`. The latter is fragile to Code node execution mode and can return only 1 item. Explicit referencing is safe.

### [7] HTTP Request (Anthropic)
**Type:** `n8n-nodes-base.httpRequest`
**Method:** POST
**URL:** `https://api.anthropic.com/v1/messages`
**Auth:** `predefinedCredentialType: anthropicApi` (n8n injects `x-api-key` header)
**Headers:**
- `anthropic-version: 2023-06-01` (required)
- `content-type: application/json`

**Body:** `={{ JSON.parse($json.claude_request_body) }}` — parses the stringified JSON from node 6 back to an object, n8n re-stringifies on send.

**Timeout:** 180 seconds (a full long-form draft takes 30–90s typically; 180s buffers transient delays).

**Returns:** Claude's `messages.create` response, with `content[0].text` containing the draft JSON as a string.

### [8] Parse Response
**Type:** `n8n-nodes-base.code`
**What it does:**
1. Pulls `resp.content[0].text` from the Claude response
2. Strips markdown fences if present (` ```json ... ``` `)
3. Parses as JSON
4. If parse fails, falls back to regex-extracting the first balanced `{ ... }` block
5. If still fails, returns a debug object with the first 500 chars of raw text (for diagnosis)
6. If succeeds, returns a flat object: title, slug, meta_title, meta_description, body_markdown, body_html, tags, faq, internal_links_suggested, schema_org_type, word_count

The model is instructed to output JSON only, but defenses against accidental prose preambles or fenced output keep this layer robust.

### [9] Build Google Doc Content
**Type:** `n8n-nodes-base.code`
**What it does:**
Assembles a plain-text body for the Google Doc:

```
<Title>

Meta title: ...
Meta description: ...
Word count: ...
Schema.org type: Article

----------

<body_markdown>

----------

FAQ

Q: ...
A: ...

(repeated)
```

Also resolves `ticket_id` via a fallback chain across upstream nodes (handles edge cases in n8n's data flow).

Outputs: `ticket_id`, `title`, `doc_title` (title + ISO date), `doc_content_text`.

### [10] Create a document
**Type:** `n8n-nodes-base.googleDocs` (Google Docs node v2)
**Operation:** Document → Create
**Inputs:** `folderId` (your Drive folder), `title` (the doc_title from node 9)
**Returns:** `id` (the Doc's ID), `title`, etc. (Note: `id` not `documentId` — field name varies by n8n version)

### [11] Update a document
**Type:** `n8n-nodes-base.googleDocs`
**Operation:** Document → Update
**Document URL or ID:** `={{ $json.id }}` (from node 10)
**Action:** Insert Text at index 1 with `doc_content_text` from node 9

Two Google Docs nodes (create + update) is the standard pattern — there's no single "create with content" operation in the Docs API.

### [12] Update Notion Page Property
**Type:** `n8n-nodes-base.httpRequest`
**Method:** PATCH
**URL:** `=https://api.notion.com/v1/pages/{{ $('Build Google Doc Content').first().json.ticket_id }}`
**Auth:** `predefinedCredentialType: notionApi`
**Body (JS expression returning object):**
```js
{
  properties: {
    "Draft Attached": {
      url: "https://docs.google.com/document/d/" + $('Create a document').first().json.id + "/edit"
    },
    Status: {
      status: { name: "review" }
    }
  }
}
```

Uses the Notion HTTP PATCH directly instead of the Notion node because the node's Update operation has been flaky in this n8n version. HTTP Request is reliable.

---

## Data flow contracts

### What Notion gives us (per ticket)
- `ticket_id` — Notion page UUID
- `keyword` — search target
- `type` — content format
- Optional: cluster, ICP slice, notes for AI

### What Brand Context gives us
- ~218 Notion blocks → ~16K chars of markdown → 4K tokens
- Sections 1–16 covering positioning, voice, format specs, etc.

### What Claude gives us back
- Single JSON object with: title, slug, meta_title, meta_description, body_markdown, body_html, tags[], faq[], internal_links_suggested[], schema_org_type, word_count
- ~5000 output tokens for long-form blog (~$0.075 in output cost)

### What we write back to Notion
- Property updates only — `Draft Attached` URL + `Status` flip to `review`
- No body content written to the ticket page itself (UX decision: keep ticket clean, draft lives in Google Doc)

### What we write to Google Drive
- One Doc per draft, in a configured folder
- Plain text format (no rich formatting in the current MVP — that's a future enhancement)

---

## Why no SERP research or voice check?

These were aspirational in the original design but explicitly deferred:

**SERP research (SerpAPI / Brave Search) was deferred because:**
- Brand Context already encodes positioning vs competitors
- Claude's training data is recent enough for category-level content
- For brand-voice content, web grounding can pull the model TOWARD generic competitor copy

It will be added when we have evidence that current drafts miss specific factual claims.

**Voice check (second Claude call) was deferred because:**
- Sonnet 4.6 with explicit `## Never say` rules in Brand Context has near-zero forbidden-phrase hits in practice
- Adds 30 seconds of latency and another API call
- The human review step in Google Doc catches the rare miss

It will be added when we have evidence that single-shot generation produces voice violations consistently.

---

## Error handling

The flow is intentionally simple — it doesn't have retry branches or error notifications. Reasoning:

- **Claude transient failures:** n8n's HTTP node has built-in retry on 5xx. Manual re-trigger handles persistent failures.
- **Notion 404s:** Almost always integration permissions — caught at smoke test, not in production.
- **Google Docs 4xx:** Usually OAuth scope issues — caught at smoke test.
- **Parse failures:** Fallback in Parse Response surfaces a debug object; ticket gets a Doc with the error, human notices.

For production hardening, add: 5xx retry on critical nodes, on-failure branch → Slack/Chat notification, dead-letter queue (re-runnable tickets table).

---

## Why this specific architecture

**Notion as editorial:** marketers live there, Brand Context is a living document the team maintains.

**n8n as orchestration:** visual flow non-engineers can audit. Self-hostable. Native nodes for everything we need.

**Google Docs as draft surface (instead of Notion body):** reviewers want collaborative editing with track changes, comments, and suggestion mode. Notion's block editor is great for static reading, weaker for collaborative draft review. The link-back via property keeps the Notion ticket as the canonical record.

**Claude (Sonnet 4.6) as the model:** best-in-class for long-form brand-voice writing as of 2026-05. Swappable — see README *Alternative LLMs*.

**Prompt caching as cost lever:** ~90% input cost reduction with no quality trade-off. The 3-min poll + 5-min cache TTL alignment maximizes hit rate.

**Human-in-the-loop publish (no auto-publish):** brand misfires caught in review beats brand misfires shipped live. Auto-publish is roadmap, not v1.
