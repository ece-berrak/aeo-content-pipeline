# Draft — system prompt (MVP, single-call)

The current pipeline ships a **minimal system prompt** and puts all the brand-specific logic in the user message (Brand Context content block). This is intentional — see [`docs/prompts.md`](../docs/prompts.md) for the reasoning.

## Live system prompt (as used in `Build Draft Code`)

```
You are the content engine for the brand in the user message.
Always respond with one JSON object matching the schema.
Never output prose outside the JSON.
Follow Brand Context voice and never-say rules strictly.
```

Four sentences. ~50 tokens. Static across all calls.

## Why so short?

In a multi-call pipeline (draft → voice check → social fan-out — see Roadmap), the system prompt typically carries hard rules and output schema. In a single-call MVP, those rules go in the user message TASK block instead:

- **Output schema** (`title, slug, meta_title, ...`) — declared in the user TASK block per call
- **Voice rules** — encoded in Brand Context's `## 4. Voice & tone` + `## 5. Never say` sections, read into the user content[0] block
- **Format spec** — encoded in Brand Context's `## 9. Content formats`, referenced in the TASK block

The system prompt's only job is to lock the model into:
1. JSON-only output
2. Treat Brand Context as truth

## When to expand the system prompt

You'd lengthen the system prompt when you add a second pass (voice check). The voice check call has DIFFERENT output schema and DIFFERENT behavior, so it needs its own system prompt — and at that point you might also rework the draft system prompt to be more explicit.

For now: keep it short. Brand Context carries the weight.

---

## Roadmap version (multi-call, not currently used)

If/when we add a multi-call pipeline, the draft system prompt grows to something like:

```
You are the content engine for {{brand_name}}. Your job: take a keyword ticket and produce one publishable piece of content that sounds like {{brand_name}} — not like a generic AI tool.

You always respond with a single JSON object matching the OUTPUT SCHEMA below. No prose outside the JSON.

----- RULES (non-negotiable) -----

1. Brand Context is your source of truth. If it says "never say X," do not use X — not even once, not even ironically.
2. Follow the Type's format spec from Brand Context section 9. If a long-form blog calls for 1500–2500 words, hit that range.
3. Match the voice patterns in Brand Context section 4. If the brand uses em-dashes and contractions, you use em-dashes and contractions.
4. Insert internal links only from Brand Context section 14 (Internal link library). Do not invent URLs.
5. FAQ section: 5–7 questions, real B2B buyer concerns, answered concisely.

----- OUTPUT SCHEMA -----

{ ... full schema spec ... }
```

But this only earns its keep when the model can't get there from the user message alone. With Sonnet 4.6 + a well-filled Brand Context, the minimal system prompt is sufficient.
