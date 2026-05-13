# Notion AI prompt — scaffold the whole workspace

Open Notion. Create a new blank page anywhere. Press Space to open Notion AI. Paste the prompt below. Notion AI will create the parent page, database, properties, views, and sub-pages.

> If Notion AI misses a piece (formulas are the most common gap), the manual setup walkthrough in [`docs/notion-setup.md`](../docs/notion-setup.md) covers each missing element so you can fix in 1–2 minutes per item.

---

```
Create a Notion workspace for a B2B SaaS content marketing pipeline. The team uses this to draft AEO/GEO-optimized blog posts via an automated pipeline, review them, approve, and publish. Build everything below in one shot.

PARENT PAGE: "Content Pipeline"
- Icon: 🪐
- At top, place a callout block (lime background):
  "Marketing automation for AEO/GEO content. Tickets go Queued → Drafting → Review → Approved → Published. Drafts and performance arrive automatically. Keep Brand Context updated as positioning evolves."

Under this parent page, create the following four items as sub-pages.

==========================================================
1) DATABASE — name it "Pipeline" (full-page database)
==========================================================

Properties (in this exact order):

- Title (the default Name property) — rename label to "Title"
- Status — Select with options + colors:
  Queued (gray), Researching (blue), Drafting (blue), Review (yellow),
  Approved (green), Published (green), Rewrite (orange), Retired (red), Failed (red)
- Keyword — Text
- Type — Select: Long-form blog, Short blog, Comparison, Listicle, Glossary, Case study, Literacy chapter, LinkedIn post, X thread, Newsletter snippet
- Cluster — Select: Add a few generic clusters as starting points (the team will customize)
- ICP slice — Multi-select: leave empty for the team to customize
- Priority — Select: P0 (this week), P1 (this month), P2 (someday)
- Notes for AI — Text (long form)
- Reviewer — Person
- Created — Created time (automatic)
- Published URL — URL
- Published date — Date
- Word count — Number
- Impressions 7d — Number
- Clicks 7d — Number
- Avg position 7d — Number (format: decimal, 1 decimal)
- CTR 7d — Formula:
    if(prop("Impressions 7d") == 0, 0, prop("Clicks 7d") / prop("Impressions 7d"))
    Format as Percent.
- Leads attributed — Number
- AI citations spotted — Number
- Last performance update — Date
- Draft attached — Checkbox

Create one Saved View on the Pipeline database:

VIEW "Inbox" (default, table)
  Filter: Status is Queued
  Sort: Priority ascending, then Created ascending
  Visible: Title, Keyword, Type, Cluster, Priority, ICP slice, Notes for AI, Created
  Hide all others.

==========================================================
2) SUB-PAGE — "Brand Context"
==========================================================
Icon: 🎯
Top of page: violet callout that says "This page feeds every draft. The automation reads it before writing. Update whenever positioning, ICP, or voice shifts."

Then placeholder structure (the team will fill it in):

## 1. Positioning
[one paragraph placeholder]

## 2. Ideal Customer Profile
### Fits
- [placeholder]
### Doesn't fit
- [placeholder]

## 3. Value props
- [placeholder bullets]

## 4. Voice & tone
### Do
- [placeholder]
### Don't
- [placeholder]

## 5. Never say
- [placeholder bullets]

## 6. Style rules
- [placeholder bullets]

## 7. Talking points & proof
- [placeholder bullets]

## 8. Competitor map
### [Competitor 1]
[placeholder]

## 9. Content formats
[placeholder — long-form blog, comparison, etc. with spec per format]

## 10. Social adaptation rules
### LinkedIn
### X
### Newsletter

## 11. Hook patterns
[placeholder]

## 12. CTA library
[placeholder]

## 13. Boilerplate
[placeholder]

## 14. Internal link library
[placeholder]

## 15. Publisher config
[code block with placeholder YAML]

==========================================================
3) SUB-PAGE — "Monthly Review template"
==========================================================
Icon: 📅

# [Month YYYY] Review

## Summary
- Pages published:
- Total impressions:
- Total clicks:
- Inbound leads from content:
- AI citations spotted:

## Top 3 by impressions
[Linked view of Pipeline filtered to Status=Published AND Published date this month, sorted by Impressions desc, limit 3]

## Bottom 3 — consider rewrite or retire
[Linked view of Pipeline filtered to Status=Published AND (Avg position 7d > 30 OR Clicks 7d = 0), limit 3]

## Decisions for next month
- [ ] Cluster to deepen:
- [ ] Cluster to retire or rewrite:
- [ ] New keyword themes:

==========================================================
4) SUB-PAGE — "Citations tracker" (inline database)
==========================================================
Icon: 🛰

Create an inline database with these properties:
- Date spotted — Date
- Engine — Select: Perplexity, ChatGPT, Claude, Gemini, Bing Copilot, Google AI Overviews, Other
- Query — Text
- Page cited — URL
- Cluster — Select (same options as Pipeline.Cluster)
- Screenshot — Files & media
- Notes — Text

Default view: table, sorted by Date spotted descending.

==========================================================
DONE
==========================================================
Default view shown when opening Pipeline: Inbox.

End of spec.
```

---

## After Notion AI finishes

Verify:
- [ ] `Content Pipeline` parent page with 4 sub-pages
- [ ] `Pipeline` database has 22 properties (Title + 21 others)
- [ ] `CTR 7d` formula returns Percent (test: enter Impressions=1000, Clicks=50, should show 5%)
- [ ] `Inbox` view filters correctly (Status=Queued only)
- [ ] `Brand Context` has placeholder H2 sections you can fill in
- [ ] `Citations tracker` is an inline database (not a regular page)

If any item fails, see [`docs/notion-setup.md`](../docs/notion-setup.md) for the manual fix per item.
