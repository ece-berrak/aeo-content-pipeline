# Prompts — how the Claude call is assembled

The current MVP uses a **single Claude call per ticket**. The prompt assembly happens in the `Build Draft Code` node — see the JS source for the live version.

> Multi-call pipelines (draft → voice check → social fan-out) are on the [Roadmap](../README.md#roadmap), not built yet. The single-call approach with strong Brand Context and explicit format specs has been good enough for current quality bars.

---

## The single call structure

```
POST https://api.anthropic.com/v1/messages

{
  "model": "claude-sonnet-4-6",
  "max_tokens": 8000,
  "system": "You are the content engine for the brand in the user message. ...",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "----- BRAND CONTEXT -----\n\n<full Brand Context markdown>",
          "cache_control": { "type": "ephemeral" }
        },
        {
          "type": "text",
          "text": "----- TICKET -----\n\nKeyword: ...\nType: ...\nCluster: ...\nICP slice: ...\nNotes for AI: ...\n\n----- TASK -----\n\nWrite one piece of content..."
        }
      ]
    }
  ]
}
```

Three things going on:

1. **System prompt** is a tiny static string (~50 tokens) — sets role and output rules.
2. **User message content block 0** is the entire Brand Context page rendered to markdown — **marked for caching**.
3. **User message content block 1** is ticket-specific — keyword, type, ICP, task description.

Anthropic caches block 0 for 5 minutes. Block 1 changes per call. System is too small to cache (Anthropic's minimum is 1024 tokens).

---

## System prompt

Lives in [`prompts/draft.system.md`](../prompts/draft.system.md) and inline in `Build Draft Code`. Current version:

```
You are the content engine for the brand in the user message. 
Always respond with one JSON object matching the schema. 
Never output prose outside the JSON. 
Follow Brand Context voice and never-say rules strictly.
```

That's it. Four sentences. Why so short?

- **Role definition** (one line) — "content engine for the brand"
- **Output rule** (one line) — JSON only
- **Behavior rule** (one line) — no prose outside JSON
- **Quality rule** (one line) — respect Brand Context voice + never-say

The real "system prompt" is the Brand Context. Putting it in the user message (instead of system) means we can cache it AND it stays where editors can edit it without code changes.

---

## User message content[0] — Brand Context (cached)

The full Brand Context page from Notion, rendered to markdown by `Build Draft Code`. Looks like:

```
----- BRAND CONTEXT -----

## About this page
...
## 1. Positioning
...
## 2. Ideal Customer Profile
...
[... 16 sections in total ...]
## 15. Publisher config
...
```

The render handles Notion block types:
- `heading_1` → `# Text`
- `heading_2` → `## Text`
- `heading_3` → `### Text`
- `bulleted_list_item` → `- Text`
- `numbered_list_item` → `1. Text`
- `callout`, `quote`, `toggle` → `> Text`
- `code` → raw text
- `paragraph` → plain text

Whatever isn't handled falls through as plain text.

**Size:** ~16K characters / ~4K tokens for a fully filled 16-section Brand Context.

**Cache directive:** `cache_control: { type: "ephemeral" }` on this block tells Anthropic to cache it for the default ephemeral TTL (5 minutes). Anthropic stores the cache by exact byte match — any change invalidates it.

---

## User message content[1] — Ticket + Task

Per-ticket, never cached:

```
----- TICKET -----

Keyword: gong vs clari
Type: Long-form blog
Cluster: Sales forecasting
ICP slice: VP Sales, RevOps Lead
Notes for AI: Focus on the persona of a VP Sales at a 100-person SaaS

----- TASK -----

Write one piece of content matching the Type and Brand Context section 9 format spec.
Output a single JSON object with these fields: title, slug, meta_title (max 60 chars),
meta_description (max 155 chars), body_markdown, body_html, tags, faq,
internal_links_suggested, schema_org_type, word_count. No prose outside the JSON.
```

**Size:** ~150–200 tokens. Cheap, fresh on every call.

---

## Output schema (what Claude returns)

A single JSON object:

```json
{
  "title": "Nautilida vs Gong: Which Revenue Intelligence Platform Fits Your Team?",
  "slug": "nautilida-vs-gong",
  "meta_title": "Nautilida vs Gong: Revenue Intelligence Compared",
  "meta_description": "Comparing Nautilida vs Gong? See how both platforms stack up on...",
  "body_markdown": "# Nautilida vs Gong\n\nRevenue intelligence software...",
  "body_html": "<h1>Nautilida vs Gong</h1>\n<p>Revenue intelligence...</p>",
  "tags": ["revenue-intelligence", "gong-alternative", "comparison"],
  "faq": [
    { "q": "What is the main difference between X and Y?", "a": "..." }
  ],
  "internal_links_suggested": [
    { "anchor_text": "sales coaching at scale", "suggested_slug": "/blog/sales-coaching-at-scale" }
  ],
  "schema_org_type": "Article",
  "word_count": 1847
}
```

For non-blog types (LinkedIn post, X thread, glossary entry), Claude:
- Fills the relevant fields (mostly body_markdown / body_html / word_count)
- Leaves irrelevant fields empty or placeholder (slug, meta_*, faq for LinkedIn posts)

Future enhancement: type-conditional output schema (LinkedIn posts don't need slug/meta).

---

## Caching strategy in detail

The 5-minute ephemeral cache works like this:

| Event | Anthropic response |
|---|---|
| **First call**, fresh cache | `cache_creation_input_tokens: ~4000`, `cache_read_input_tokens: 0` |
| **Subsequent call within 5 min**, same Brand Context | `cache_creation_input_tokens: 0`, `cache_read_input_tokens: ~4000` |
| **Subsequent call within 5 min, Brand Context EDITED** | `cache_creation_input_tokens: ~4000`, `cache_read_input_tokens: 0` (cache busted) |
| **>5 min since last call** | `cache_creation_input_tokens: ~4000`, `cache_read_input_tokens: 0` (TTL expired) |

**Pricing impact:**

| Token type | Price per 1M tokens (Sonnet 4.6) |
|---|---|
| Regular input | $3.00 |
| Cache write (first call) | $3.75 (25% premium) |
| Cache read (subsequent) | $0.30 (90% discount) |
| Output | $15.00 |

**Per-draft costs:**

| Scenario | Input cost | Output cost | Total |
|---|---|---|---|
| Single isolated draft | ~$0.012 (4K @ $3) | ~$0.075 (5K @ $15) | **~$0.09** |
| First draft after Brand Context change | ~$0.015 (4K @ $3.75) | ~$0.075 | **~$0.09** |
| Draft within 5 min of last draft (cache hit) | ~$0.0012 (4K @ $0.30) | ~$0.075 | **~$0.076** |

The savings are entirely on the input side. Output is dominant in cost.

---

## Why content blocks, not system array

Anthropic's API supports caching in two places:
- `system` field as array of content blocks
- `messages` field with content arrays inside

The original implementation put Brand Context in `system` array. n8n's HTTP Request node serialization dropped the system array silently in some configurations (verified empirically — `input_tokens: 199`, suggesting only user message reached the API).

Putting Brand Context in `messages[0].content` as a content block is reliable: n8n sends user messages correctly, and Anthropic accepts cache_control on `messages` content blocks identically to system content blocks.

---

## Tuning the prompts

Three principles when you tune:

### Principle 1 — Tune Brand Context, not the prompt

If a draft uses "leverage" too often, don't add "don't use leverage" to the system prompt. Add `leverage` to Brand Context's `## Never say` list. That's the editable surface.

The system prompt should be about **how to write** (output format, schema). Brand Context should be about **what to write** (voice, positioning, links).

### Principle 2 — Specificity over instruction count

A short instruction with one specific example beats a long instruction with ten general rules. If the model writes generic competitor comparisons, add one concrete example of how YOUR positioning differs in the `## Competitor map` section.

### Principle 3 — Measure with `cache_read_input_tokens`

Before tuning, verify caching is working (see README's *Prompt caching* section). A draft that costs 5x more than expected isn't a quality issue — it's a cache miss issue, fixed at infrastructure level.

---

## Adding a second pass (roadmap)

If/when you add a voice check pass:

```
[7] HTTP Request (draft call)
     │
     ▼
[8] Parse Response (extract draft)
     │
     ▼
[8b] HTTP Request (voice check call) ← NEW
     │   POST /v1/messages with smaller model (Haiku 4.5)
     │   prompt: "Score this draft against the Never say + Voice & tone rules"
     │   output: { voice_score, voice_issues[] }
     ▼
[8c] Switch on voice_score ← NEW
     │   pass: continue
     │   fail (<0.85): route back to draft with issues, max 2 retries
     ▼
[9] Build Google Doc Content
```

Cost impact: ~$0.01 per ticket (Haiku is cheap, single-shot voice check is small).

Latency impact: +20–30 seconds per draft.

Worth it when: drafts consistently violate `## Never say` in production. Until then, the human review step in Google Doc catches the rare miss.
