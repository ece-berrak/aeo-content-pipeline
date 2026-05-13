# Draft — user prompt (MVP, as assembled in `Build Draft Code`)

The user message is built as a **two-block content array**, not a single string. This lets us mark Brand Context as cacheable while keeping per-ticket info uncached.

## Live user message (two blocks)

### Block 0 — Brand Context (cached, `cache_control: ephemeral`)

```
----- BRAND CONTEXT -----

<entire Brand Context page, rendered to markdown>
```

Size: ~16K chars / ~4K tokens for a fully filled 16-section Brand Context. This block is byte-identical across calls within the cache window, so Anthropic serves it from cache for 5 minutes (10% of normal input price).

### Block 1 — Ticket + Task (NOT cached)

```
----- TICKET -----

Keyword: {{keyword}}
Type: {{type}}
Cluster: {{cluster}}
ICP slice: {{icp_slice}}
Notes for AI: {{notes_for_ai}}

----- TASK -----

Write one piece of content matching the Type and Brand Context section 9 format spec.
Output a single JSON object with these fields: title, slug, meta_title (max 60 chars),
meta_description (max 155 chars), body_markdown, body_html, tags, faq,
internal_links_suggested, schema_org_type, word_count. No prose outside the JSON.
```

Size: ~150–200 tokens. Fresh on every call.

## Variable substitution

The `Build Draft Code` node fills these from upstream nodes:

| Variable | Source |
|---|---|
| `{{keyword}}` | Notion ticket → `Keyword` property |
| `{{type}}` | Notion ticket → `Type` property |
| `{{cluster}}` | Notion ticket → `Cluster` property |
| `{{icp_slice}}` | Notion ticket → `ICP slice` (multi-select, comma-joined) |
| `{{notes_for_ai}}` | Notion ticket → `Notes for AI` (or `-` if empty) |
| Brand Context block | All blocks of Brand Context page → rendered to markdown |

## What's different from the multi-call version

The aspirational multi-call design (see Roadmap) feeds the model:
- `{{format_spec}}` — extracted format spec just for the ticket's Type
- `{{serp_research}}` — top 10 SERP results from SerpAPI
- `{{previous_posts}}` — list of already-published URLs for internal linking

The MVP skips these because:
- **Format spec** — Brand Context section 9 already contains specs for all 10 types. Claude reads the whole section and picks the matching one. Extracting just one subsection adds plumbing without a quality gain.
- **SERP research** — adds latency and cost. Sonnet 4.6 + good Brand Context produces competitive drafts without web grounding. Will add when we observe systematic factual gaps.
- **Previous posts** — useful for internal linking but the current pipeline doesn't write to a publish destination, so internal links are only suggestions. Brand Context section 14 (Internal link library) covers this with curated URLs.

When the roadmap items get built, we'll extend the Build Draft Code node to inject these as additional content blocks (with cache_control on stable ones like `previous_posts` if they don't change per-call).
