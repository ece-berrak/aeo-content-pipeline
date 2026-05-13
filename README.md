# Brand-aware Content Draft Generator (AEO-formatted)

A Notion-driven, n8n-orchestrated content pipeline that turns a single keyword ticket into a **fully drafted, brand-voice-aligned long-form blog post** (or LinkedIn post, X thread, glossary entry, etc.) inside a Google Doc — ready for human review and manual publishing.

Built for B2B SaaS teams who want AEO/GEO-formatted content (FAQ blocks, schema-org type, meta tags, internal-link suggestions — the shape AI answer engines like Perplexity, ChatGPT, and Claude prefer to cite) without paying for an off-the-shelf "content factory" SaaS.

> The marketer opens a ticket in Notion: keyword, format type (`Long-form blog`, `LinkedIn post`, `X thread`, `Glossary entry`, …), status `queued`. Three minutes later a Google Doc appears, fully written, linked back to the Notion ticket, status flipped to `review`. They edit, approve, and ship it to their CMS by hand.

---

## What this is (and what it's not)

✅ **What it does today (MVP, working):**
- Polls Notion for `queued` tickets every 3 minutes
- Reads a 15-section Brand Context page (positioning, ICP, voice, never-say, competitor map, format specs, etc.)
- Sends one Claude call (Sonnet 4.6) with the Brand Context **prompt-cached** for ~90% cost savings on repeat calls
- Produces a structured JSON draft: title, slug, meta title/description, body (markdown + HTML), FAQ, tags, internal-link suggestions, schema.org type
- Creates a Google Doc in a configured Drive folder, inserts the full content
- Writes the Doc URL to the Notion ticket's `Draft Attached` property
- Flips Notion `Status` to `review`
- Human reviews in Google Doc, approves, publishes manually

> 💡 **Note:** This is **automation with an LLM step**, not an AI agent. Claude has one job (write the draft); n8n handles all the routing deterministically. See [`docs/automation-vs-agent.md`](docs/automation-vs-agent.md) for the trade-offs and when each architecture makes sense.

❌ **What it does NOT do (yet — see [Roadmap](#roadmap)):**
- SERP research / web grounding (drafts rely on Brand Context + Claude's training)
- Second-pass voice check (single-shot generation)
- Auto-publish to a CMS / GitHub / WordPress
- Social fan-out (LinkedIn / X / newsletter from one source piece)
- Search Console / sitemap / llms.txt automation
- Performance feedback loop

The current pipeline is a **brand-aware draft generator**. Calling it "AEO" refers to the *shape* of the output (FAQ, schema type, meta tags) — not full AEO optimization (citation tracking, schema.org HTML markup, topical clustering).

---

## Architecture (what's actually built)

```
[NOTION]                                  [n8n: 12 nodes]                              [GOOGLE WORKSPACE]
                                                                                          
 Pipeline DB ─────────► Schedule Trigger (every 3 min)                                    
 (Status = queued)         │                                                              
                           ▼                                                              
                      Edit Fields (DB IDs)                                                
                           │                                                              
                           ▼                                                              
                      Get many database pages ◄──── Notion API (Pipeline DB)              
                           │ (filter: Status equals queued)                               
                           ▼                                                              
                      Extract (flatten properties)                                        
                           │                                                              
                           ▼                                                              
                      Get many child blocks ◄──── Notion API (Brand Context page)         
                           │ (218 blocks, ~16K chars markdown)                            
                           ▼                                                              
                      Build Draft Code ──┐                                                
                           │             └─► assembles Claude request body                
                           │                 system: short instructions                   
                           │                 user content[0]: Brand Context               
                           │                                  cache_control: ephemeral    
                           │                 user content[1]: Ticket + Task               
                           ▼                                                              
                      HTTP Request ─────────► Anthropic API /v1/messages                  
                           │                  (Sonnet 4.6, max_tokens 8000, 180s timeout) 
                           ▼                                                              
                      Parse Response (extract draft JSON, strip markdown fences)          
                           │                                                              
                           ▼                                                              
                      Build Google Doc Content (assemble plain-text doc body)             
                           │                                                              
                           ▼                                                              
                      Create a document ────────► Google Docs API                        
                           │ (empty doc with title)                                       
                           ▼                                                              
                      Update a document ────────► Google Docs API                        
                           │ (insert text at index 1)                                     
                           ▼                                                              
                      Update Notion Page Property                                         
                           │ (PATCH /v1/pages/{ticket_id})                                
                           │                                                              
 Pipeline DB ◄─────────────┘                                                              
   ├─ Draft Attached: https://docs.google.com/document/d/{id}/edit                        
   └─ Status: review                                                                      
                                                                                          
                                                                  Google Drive folder     
                                                                   └─ <Title> — 2026-XX-XX
                                                                      (full draft)        
```

See [`docs/architecture.md`](docs/architecture.md) for node-by-node detail with payload shapes.

---

## What's in this repo

```
aeo-content-pipeline/
├── README.md                       ← you are here
├── LICENSE                         ← MIT
├── n8n/
│   ├── content-pipeline.json       ← the workflow JSON (anonymized — import this)
│   └── credentials.example.md      ← the 3 credentials you need to wire
├── notion/
│   └── workspace-prompt.md         ← Notion AI prompt to scaffold the workspace
├── docs/
│   ├── setup.md                    ← end-to-end setup walkthrough (~45 min)
│   ├── notion-setup.md             ← Pipeline DB schema + Brand Context structure
│   ├── architecture.md             ← detailed node-by-node flow
│   ├── automation-vs-agent.md      ← why this is automation, not an AI agent (the trade-offs)
│   ├── prompts.md                  ← how the Claude prompt is assembled (cache strategy)
│   └── publishers.md               ← (roadmap) auto-publish patterns — not built yet
├── prompts/
│   ├── draft.system.md             ← system prompt used by Build Draft Code
│   ├── draft.user.md               ← user-turn template (Brand Context + Ticket + Task)
│   └── (voice-check.md, social-fanout.md — roadmap, not consumed by the live flow)
├── code/
│   ├── extract.js                  ← JS for the Extract Code node
│   ├── build-draft-body.js         ← JS for the Build Draft Code node (prompt + caching)
│   ├── parse-claude-response.js    ← JS for the Parse Response node
│   └── build-google-doc-content.js ← JS for the Build Google Doc Content node
├── templates/
│   ├── reference-blog.html         ← HTML blog template (for future GitHub publisher)
│   └── schema-article.json         ← JSON-LD template (Article + FAQPage + BreadcrumbList)
└── examples/
    └── brand-context.example.md    ← Sundial (fictional B2B SaaS) — Brand Context schema
```

---

## What you need to run this

### Required accounts

| Service | Why | Cost |
|---|---|---|
| **Notion** | Editorial database (Pipeline DB) + Brand Context page | Free / existing plan |
| **n8n** | Workflow orchestration | Cloud: $20/mo, self-hosted: $5/mo |
| **Anthropic API** | Claude Sonnet 4.6 for drafting | Pay-as-you-go (~$0.10/draft, prompt-cached ~$0.02/draft) |
| **Google Workspace** | Google Docs as the review surface, Drive as storage | Free / existing plan |

### Required APIs / integrations

1. **Notion API** — internal integration token with read/write access to the Pipeline DB and Brand Context page
2. **Anthropic API** — API key for `/v1/messages` endpoint (model: `claude-sonnet-4-6`)
3. **Google Docs OAuth2** — OAuth 2.0 connection to your Google account (n8n Cloud handles this for you; self-hosted requires Google Cloud Console setup)

No other paid services. No SerpAPI, no Search Console, no LinkedIn/X APIs in the current MVP.

---

## How a ticket flows (60-second walkthrough)

1. **Marketer creates a Notion ticket** in the `Pipeline` DB:
   - `Keyword`: `nautilida vs gong`
   - `Type`: `Long-form blog` (one of 10 options: blog, short blog, LinkedIn post, X thread, glossary, listicle, case study, comparison page, literacy chapter, newsletter snippet)
   - `Status`: `queued`
2. **n8n polls Notion every 3 minutes**, finds the ticket
3. **Pipeline runs in ~60–90 seconds:**
   - Reads Brand Context (cached on Claude side — first call ~$0.10, every subsequent call within 5 minutes ~$0.02)
   - Claude generates ~5K tokens of structured draft following the Type's format spec
   - Creates a Google Doc, inserts content
4. **Notion ticket updates automatically:**
   - `Draft Attached` property: filled with Google Doc URL
   - `Status` property: changed to `review`
5. **Marketer opens the Doc**, edits collaboratively with the team, approves
6. **Marketer copies the content** to their CMS / LinkedIn / X / wherever and publishes manually

> ⚠️ Publishing is currently human-in-the-loop. Auto-publish to GitHub/WordPress/Webflow is on the roadmap but explicitly deferred — keeping a human in the loop catches brand-voice misfires before they hit production.

---

## Alternative LLMs (you don't have to use Claude)

The pipeline ships with Claude Sonnet 4.6 because it currently leads on long-form brand-voice writing — but the `HTTP Request` node is just a generic API call. You can swap in any chat-completions-compatible LLM by changing the URL, headers, and the request body shape in `Build Draft Code`.

| Model | Input / Output ($ per 1M tokens) | Caching | Quality for brand-voice content | When to pick |
|---|---|---|---|---|
| **Claude Sonnet 4.6** *(default)* | $3 / $15 | Ephemeral 5min, ~90% off cache hits | Excellent — nuance, voice control, never-say adherence | When voice fidelity matters and budget is reasonable |
| **Claude Haiku 4.5** | $1 / $5 | Same as Sonnet | Good — faster, cheaper, slight quality drop | High-volume drafting where small voice slips are OK |
| **OpenAI GPT-4o** | $2.50 / $10 | Automatic prefix caching (~50% off) | Excellent — comparable to Sonnet | Already invested in OpenAI ecosystem |
| **OpenAI GPT-4o-mini** | $0.15 / $0.60 | Automatic prefix caching | Decent — needs tighter prompt engineering | Very high volume, willing to QA more |
| **DeepSeek-V3** | $0.27 / $1.10 | Manual prompt caching | Decent for blog-form, weaker on subtle voice | Cost-extreme scenarios; double-check brand fidelity |
| **Google Gemini 2.0 Flash** | $0.10 / $0.40 | Context caching available | Decent for structured output | Budget-first, schema-strict tasks |
| **Llama 3.3 70B (Groq / Together)** | ~$0.60 / $0.80 | Provider-dependent | Variable — best for high-volume listicles, weaker on nuance | Self-hosting / data residency requirements |

**To swap providers** you need to adjust two things in `Build Draft Code`:

1. The request body shape (each provider has slightly different fields — OpenAI uses `messages` with a `system` role inside the array; Anthropic uses a top-level `system` field)
2. The cache control mechanism (Anthropic's explicit `cache_control` blocks vs OpenAI's automatic prefix caching vs Gemini's context cache objects)

And in the `HTTP Request` node:
1. URL endpoint
2. Auth headers
3. API version header (Anthropic-specific)

Quality note: brand-voice content is the area where cheap models cut corners most visibly. The pipeline produces a JSON object with `body_markdown` ranging 1500–2500 words on long-form. If you switch to a cheaper model, expect to spend more time on the review/edit step. The cost saved on API calls often gets re-spent on editor time. Run a side-by-side bake-off with three real keywords before committing.

---

## Prompt caching — the silent cost-saver

This pipeline aggressively caches the Brand Context payload (~16K characters / ~4K tokens) on the Claude side. Without caching the input cost per draft is ~$0.018; with caching, repeat drafts within 5 minutes drop to ~$0.0018 — a **10x reduction on the input side**.

How it works in our setup:

- The user message is built as a **content block array**, not a string
- The first block contains `----- BRAND CONTEXT -----\n\n` + the full Brand Context, marked with `cache_control: { type: 'ephemeral' }`
- The second block contains the ticket-specific text (keyword, type, ICP slice, task instructions)
- Anthropic caches the first block server-side for 5 minutes
- Any second draft started within 5 minutes pays cache_read price (10% of normal) on the Brand Context portion

The pipeline's 3-minute Schedule Trigger interval is intentional — every poll hits the cache as long as the Brand Context hasn't changed.

How to verify caching is working: look at the `HTTP Request` node's output, find the `usage` object:

```json
"usage": {
  "input_tokens": 3,                  ← only the truly new tokens
  "cache_creation_input_tokens": 0,
  "cache_read_input_tokens": 4596,    ← cached Brand Context, billed at 10%
  "output_tokens": 5841
}
```

A `cache_read_input_tokens > 0` means caching is active. A `cache_creation_input_tokens > 0` on first run is the cache being written for the next 5 minutes.

⚠️ **Caching gotcha:** The cache key includes the **exact byte sequence** of the cached block. Any change to Brand Context (even a single character) invalidates the cache. This is correct behavior — you want new Brand Context to take effect immediately — but plan around it: don't tweak Brand Context mid-batch if you care about cost predictability.

See [`docs/prompts.md`](docs/prompts.md) for the full prompt-assembly explanation.

---

## Costs at typical volume

| Component | Pricing | At 30 drafts/month |
|---|---|---|
| Claude API (Sonnet 4.6) | $3 / 1M input tokens, $15 / 1M output | ~$3/mo (with prompt caching) |
| n8n Cloud | $20/mo flat | $20/mo |
| n8n self-hosted (alternative) | $5/mo on Fly.io / Railway | $5/mo |
| Notion, Google Workspace | Free / existing plans | $0 |
| **Total (n8n Cloud)** | | **~$23/mo for 30 drafts** |
| **Total (self-hosted)** | | **~$8/mo for 30 drafts** |

Comparable off-the-shelf content SaaS: $500–$2,000/mo. This is 95%+ cheaper.

**Prompt caching saves significant input cost.** First draft after a Brand Context change pays ~$0.10. Every subsequent draft within 5 minutes pays ~$0.02 (cache_read price = 10% of normal input). On 30 drafts/month you spend ~$3 instead of ~$30 without caching.

---

## Get started

1. Read [`docs/setup.md`](docs/setup.md) — end-to-end setup, ~45 minutes
2. Scaffold the Notion workspace per [`docs/notion-setup.md`](docs/notion-setup.md) (or paste [`notion/workspace-prompt.md`](notion/workspace-prompt.md) into Notion AI)
3. Fill in your [Brand Context](examples/brand-context.example.md) — positioning, ICP, voice, never-say list, competitor map, content format specs, internal-link library
4. Import [`n8n/content-pipeline.json`](n8n/content-pipeline.json) into your n8n instance
5. Wire the 3 credentials per [`n8n/credentials.example.md`](n8n/credentials.example.md)
6. Replace the placeholder IDs (Notion DB ID, Brand Context page ID, Google Drive folder ID) in the workflow's Edit Fields and Notion nodes
7. Create a test ticket with Status = `queued`, click *Execute Workflow*, watch a Google Doc appear within 90 seconds

---

## Roadmap (not yet built)

The original aspiration was a fully autonomous publish-and-distribute pipeline. The MVP stopped at the human-review stage on purpose. Future additions, in rough priority order:

- [ ] **Auto-publish on `Status = Approved`** — generate HTML from template, commit to a `content-staging` branch of a GitHub repo
- [ ] **JSON-LD generation** — emit schema.org HTML markup (Article + FAQPage + BreadcrumbList) into the published HTML, not just the `schema_org_type` string
- [ ] **SERP grounding** — second research step before drafting (SerpAPI / Brave Search) so claims are anchored to real-world content
- [ ] **Voice check pass** — second Claude call audits draft against `## Voice & tone` + `## Never say` rules before it lands in Google Doc
- [ ] **Social fan-out** — derive LinkedIn post + X thread + newsletter snippet from a long-form draft, attach to the same ticket
- [ ] **Performance loop** — weekly Search Console cron, fill `Impressions / Clicks / CTR / Avg position` columns on the ticket, flag underperformers for rewrite
- [ ] **Multi-publisher** — beyond GitHub: WordPress, Webflow, Ghost, Sanity, generic webhook
- [ ] **Type-specific output schemas** — LinkedIn posts don't need `slug` or `meta_title`; conditional JSON schema by Type
- [ ] **Multi-tenant mode** — one workflow serving multiple Brand Context pages (one n8n instance, many brands)

---

## License

MIT — see [LICENSE](LICENSE).
