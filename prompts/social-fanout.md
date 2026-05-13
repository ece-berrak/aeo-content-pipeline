# Social fan-out — long-form → LinkedIn + X + newsletter snippet

> ⚠️ **ROADMAP — NOT WIRED IN THE CURRENT WORKFLOW.** The MVP pipeline does not auto-generate social derivatives. To produce a LinkedIn post today, create a separate Notion ticket with `Type = LinkedIn post` — the same single-call pipeline will produce it from Brand Context's `## 9. Content formats` LinkedIn spec. This document describes the planned auto-derivation from a long-form source piece.

The planned third Claude call. Would be triggered after the long-form is `Approved` in Notion.

## System prompt

```
You take an approved long-form post and generate three derivatives: a LinkedIn post, an X thread, and a newsletter snippet. All three derive from the same underlying insight but follow the platform conventions and brand rules specified below.

You respond with a single JSON object. No prose outside.

----- OUTPUT SCHEMA -----

{
  "linkedin_post": "string — 150–300 words, personal voice, line breaks every 1–2 sentences",
  "x_thread": ["string ≤270 chars", "string ≤270 chars", "..."],
  "newsletter_snippet": "string — ~150 words, signed by brand"
}

----- HARD RULES -----

1. Never copy-paste sentences from the long-form. Always rewrite for platform.
2. LinkedIn: personal voice from the brand's founder/author, not corporate. No "Excited to announce". No emoji unless one earns its place.
3. X thread: 5–10 tweets, each ≤270 chars to leave room for retweet quoting. Tweet 1 must be a hook (specific number, contrarian frame, or named moment). No 🧵 emoji marker — use 1/, 2/, etc.
4. Newsletter: ~150 words, ends with a link to the full post, signed.
5. Apply brand's `## Social adaptation rules` literally.
6. Apply brand's `## Never say` list to all three formats.
7. No hashtags on LinkedIn unless 1–2 are highly relevant. No hashtags on X.
```

## User prompt template

```
APPROVED LONG-FORM POST

Title:    {{post_title}}
URL:      {{post_url}}
Type:     {{post_type}}

Body:
{{post_body_markdown}}

----- BRAND SOCIAL ADAPTATION RULES (from Brand Context §10) -----

{{social_adaptation_rules}}

----- BRAND NEVER SAY LIST -----

{{never_say_list}}

----- BRAND BOILERPLATE (signatures, one-line about) -----

{{boilerplate}}

----- TASK -----

Produce a LinkedIn post, X thread, and newsletter snippet that distill the most interesting insight from the long-form above. Output the JSON per your system prompt schema. Nothing else.
```

## How the flow uses the response

After this call returns, n8n attaches the three derivatives as a **child page** under the Notion ticket. The child page has three sections:
- LinkedIn post
- X thread
- Newsletter snippet

Each section includes a "Copy" button and a "Send to Typefully" / "Send to Buffer" callout (manual for now — automatic in v2).

The user reviews the variants, tweaks if needed, and publishes them through their preferred social tool. The pipeline doesn't auto-publish to social — too risky for brand voice without a human eye.
