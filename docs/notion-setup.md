# Notion workspace setup

The editorial layer lives entirely in Notion. The pipeline reads from two places:
- The **Pipeline database** (your tickets)
- The **Brand Context page** (positioning, voice, content format specs)

You can scaffold the workspace two ways:

- **Automated** — paste the prompt from [`notion/workspace-prompt.md`](../notion/workspace-prompt.md) into Notion AI on a blank page. It creates the parent page, database, properties, and sub-pages in one shot.
- **Manual** — follow the steps below (~30 min, but you understand every choice).

---

## What we're building

```
Content Pipeline (parent page)
├── Pipeline (database) — your content tickets, polled by n8n
├── Brand Context (page) — positioning, voice, format specs — read by every draft call
└── (optional) Monthly Review, Citations tracker — for editorial cadence, not consumed by the pipeline
```

---

## 1. Create the parent page

- Sidebar → **+ Add new page**
- Title: `Content Pipeline`
- Icon: 🪐 (or anything)
- Optional callout: *"Tickets go `queued` → `researching` → `drafting` → `rewrite` → `review`. Drafts land in a linked Google Doc. Brand Context is the source of truth — keep it current."*

---

## 2. Create the Pipeline database

- Inside Content Pipeline → click `+` → **Database — Full page**
- Title: `Pipeline`

Add these properties (MVP set — minimum needed for the workflow to function):

| Property | Type | Required by workflow? | Notes |
|---|---|---|---|
| **Title** | Title (default) | No (cosmetic) | Free-text descriptive title |
| **Keyword** | Text | ✅ Yes | The target search phrase (e.g., `gong alternatives`) — passed to Claude |
| **Type** | Select | ✅ Yes | One of 10 format options — see below |
| **Status** | **Status** (NOT Select — Notion's special Status type) | ✅ Yes | Workflow filter + state machine — see below |
| **Cluster** | Select | No | Topical cluster grouping |
| **ICP slice** | Multi-select | No | Target personas |
| **Notes for AI** | Text | No | Per-ticket angles or instructions Claude should respect |
| **Draft Attached** | **URL** | ✅ Yes | Workflow writes the Google Doc URL here after draft creation |

You can add more (Priority, Reviewer, Created, Published URL, etc.) for editorial workflow — none are read by the pipeline.

### Status property — values to add

⚠️ **Important:** Status must be Notion's **Status type** (with the special pill UI + grouping), NOT a Select. The workflow's API call uses `"status": { "name": "review" }` JSON shape, which is Status-type-specific.

Minimum required options (case-sensitive, lowercase):
- `queued` — workflow filter looks for this exact value. New tickets start here.
- `review` — workflow flips to this after the draft is created. Reviewer's turn.

Recommended additional options (for editorial hygiene):
- `drafting`
- `researching`
- `rewrite`
- `approved`
- `published`

The workflow only reads `queued` (filter) and writes `review` (after success). The other states are for humans.

### Type property — values to add

These map 1:1 to format specs in your Brand Context's section 9. Add as Select options:

| Type | Format spec target length | Brand Context section |
|---|---|---|
| `Long-form blog` | 1500–2500 words | `### Long-form blog` |
| `Short blog post` | 500–800 words | `### Short blog post` |
| `Comparison page` | 1200–2000 words | `### Comparison page` |
| `Glossary entry` | 300–600 words | `### Glossary entry` |
| `Listicle` | 1000–1800 words | `### Listicle` |
| `Case study` | 1000–2000 words | `### Case study` |
| `Literacy chapter` | 2000–4000 words | `### Literacy chapter` |
| `LinkedIn post` | 150–300 words | `### LinkedIn post` |
| `X thread` | 5–10 tweets ≤270 chars each | `### X thread` |
| `Newsletter snippet` | ~150 words | `### Newsletter snippet` |

Claude reads the Type from the ticket and matches it against your Brand Context's format spec. **If you don't define a spec for a Type, the model uses generic best practices** (still usable, less brand-aligned).

### Useful views (optional, for humans)

- **Inbox** — `Status = queued`, sort by Created asc (default view)
- **To review** — `Status = review`, sort by Created asc (reviewer's queue)
- **Approved + published** — `Status` in `[approved, published]`, sort by Created desc
- **By Type** — Board view grouped by Type (see workload distribution)
- **Stale** — `Status = review AND Created < 7 days ago` (drafts you forgot about)

---

## 3. Create Brand Context

This is the **most important page in the system**. The pipeline reads it before every draft. Specific positioning + opinionated voice = good drafts. Vague Brand Context = generic drafts.

- Inside Content Pipeline → click `+` → **Page**
- Title: `Brand Context`
- Paste the contents of [`examples/brand-context.example.md`](../examples/brand-context.example.md) as a starting point

Replace every section with your own values. The 16 sections are:

| # | Section | What goes here |
|---|---|---|
| - | About this page | One sentence describing the page's role (the workflow's first prompt) |
| 1 | Positioning | Your one-paragraph wedge — what category, who you replace, what you uniquely do |
| 2 | Ideal Customer Profile | Fits / doesn't fit bullet lists |
| 3 | Value props | 5–10 bullets, each a specific outcome (not features) |
| 4 | Voice & tone | Do / Don't bullets — opinionated |
| 5 | Never say | Forbidden phrases (`leverage`, `unlock`, `revolutionize`, etc.) |
| 6 | Style rules | Sentence case headings, em-dashes, contractions, etc. |
| 7 | Talking points & proof | Stats, milestones, customer names you can cite |
| 8 | Competitor map | 3–5 named competitors with "where we're different" framing |
| 9 | Content formats | Spec per Type — length, structure, when to use it |
| 10 | Social adaptation rules | LinkedIn / X / Newsletter rules |
| 11 | Hook patterns | Examples for long-form, LinkedIn, X openings |
| 12 | CTA library | The links you push readers toward, per format |
| 13 | Boilerplate | One-line, two-line, signature |
| 14 | Internal link library | Existing URLs grouped by cluster |
| 15 | Publisher config | (Roadmap) YAML for auto-publish target |

### Why 16 sections?

The pipeline doesn't enforce this structure — Claude reads whatever you write. But this structure has been battle-tested:

- Sections 1–4: positioning + voice (drives quality)
- Sections 5–6: hard rules (catches model bad habits)
- Section 7: proof points (anchors specific claims)
- Section 8: competitor framing (critical for comparison content)
- Section 9: format specs (drives Type-specific output)
- Sections 10–13: social/CTA (for current + future use)
- Sections 14–15: pipeline integrations

Skip sections at your own risk; the model will fill the gaps with generic content if positioning is vague.

---

## 4. (Optional) Monthly Review template

For editorial cadence, not consumed by the pipeline:

- Inside Content Pipeline → click `+` → **Page**
- Title: `Monthly Review template`
- Sections: Summary, Top 3 by impressions, Bottom 3, Decisions for next month

Duplicate at each month-end and fill in. Not connected to the workflow.

---

## 5. (Optional) Citations tracker

For tracking when AI engines (Perplexity, ChatGPT, Claude, Gemini, etc.) cite your content:

- Inside Content Pipeline → click `+` → **Page**
- Title: `Citations tracker`
- Inline database with: Date spotted, Engine (Select), Query, Page cited (URL), Cluster, Screenshot, Notes

Log citations as you discover them — useful for the AEO feedback loop.

---

## Get the IDs n8n needs

Once the workspace exists, collect three values:

### Pipeline database ID
- Open the Pipeline database in Notion
- Click `⋯` (top right) → **Copy link to view**
- URL format: `https://notion.so/<workspace>/<DATABASE_ID>?v=<view_id>`
- The 32-char hex between `notion.so/<workspace>/` and `?v=` is the **database ID**

### Brand Context page ID
- Open Brand Context page
- Click `⋯` → **Copy link**
- The 32-char hex at the end of the URL is the **page ID**

### Notion integration token
- Go to notion.so/profile/integrations → **+ New integration**
- Name: `n8n content pipeline`
- Type: Internal
- Capabilities: Read content, Update content, Insert content
- Copy the **Internal Integration Secret**

⚠️ **Critical:** After creating the integration, you must **share both the Pipeline DB and Brand Context page** with it. Notion access is per-page, per-integration:
- Open Pipeline DB → `⋯` → **Connections** → search your integration → connect
- Open Brand Context page → same dance

Without sharing, the integration's reads return 404s even with a valid token.

---

## Plugging the IDs into n8n

In the imported workflow:

| Node | What to set |
|---|---|
| `Get many database pages` | **Database** field → pick Pipeline DB from dropdown (or paste DB ID) |
| `Get many child blocks` | **Block** field → paste full URL of Brand Context page (`https://notion.so/Brand-Context-...`) |
| (Notion credential) | All 3 Notion-using nodes → assign the credential with your integration token |

The `Edit Fields` node has 2 string variables (`pipeline_database_id`, `brand_context_page_id`) — these are not currently consumed downstream but are kept for documentation. Update them with your real IDs for clarity.

---

## Common gotchas

| Problem | Fix |
|---|---|
| Workflow polls but `Get many database pages` always empty | (1) No tickets with Status = `queued`. (2) Integration not connected to DB. |
| Brand Context read returns 1 item with empty text | Integration not connected to Brand Context page |
| Status update fails: `Status name is not valid` | Add `review` as a Status option (case-sensitive lowercase) |
| Status update fails: `Draft Attached is not a property` | Property name is case-sensitive in Notion API. Match exactly. |
| Brand Context changes don't take effect | Brand Context is cached on Claude side for 5 min. Wait 5 min OR change a single character to bust the cache. |
| New tickets keep getting processed multiple times | Workflow isn't updating Status to `review` after success. Check Update Notion Page Property node's body. |
