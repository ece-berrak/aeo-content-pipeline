# Brand Context — example for "Sundial" (fictional B2B SaaS)

> This is a sample Brand Context page filled in for a fictional company called **Sundial** — an observability platform for engineering teams. Use it as a structural reference when filling in your own Brand Context in Notion.
>
> Replace every section with your own values. Specificity is the difference between draft quality 0.65 and 0.95.

---

## About this page

This page is the source of truth for every piece of content Sundial publishes. The automation reads it before every draft. Keep it current — when positioning, ICP, or voice shifts, update this page first; the next draft will follow.


## 1. Positioning

Sundial is the observability platform for engineering teams who don't want to babysit dashboards. We answer the question "is anything wrong?" before an engineer has to ask it — by watching signals across logs, metrics, traces, and deployments and surfacing only what matters. Not another monitoring tool; a system that decides what's worth paging you about.

Our wedge: every other observability tool drowns you in data and expects you to filter. We do the filtering. Engineers get back the 8 hours a week they spent staring at Grafana, while reliability stays the same or better.


## 2. Ideal Customer Profile

### Fits
- Engineering orgs with 20–500 engineers
- Already running Prometheus, Grafana, Datadog, or New Relic — looking to consolidate or supplement
- Multi-service architectures (microservices, distributed systems)
- Personas:
  - **VP / Director of Engineering** — primary buyer
  - **Head of Platform / SRE Lead** — primary champion
  - **Staff / Principal engineer with reliability ownership** — daily user
  - **CTO** at smaller startups

### Doesn't fit
- Solo developers, freelancers, agencies
- Pure mobile-only apps (different observability stack)
- Teams using only logs (not enough data variety for our value to show)
- Heavily regulated environments requiring on-prem (we're cloud-only for now)


## 3. Value props

- **Anomaly summarization, not alert fatigue.** Sundial reads your signals and writes a daily summary: "Three things to look at. The other 14 anomalies were noise." Auditable, not magical.
- **Pre-deployment risk preview.** Before you merge, Sundial tells you which services are at elevated risk based on recent signal patterns — so you can de-risk the deploy or roll out gradually.
- **Cross-tool correlation.** Logs + metrics + traces + deploys + on-call schedules in one query. No more tab-switching between Grafana, Datadog, and PagerDuty.
- **The Friday "what to fix next week" report.** A weekly digest of recurring issues, ranked by impact. Engineering leaders love it; ICs love that they finally have ammunition for the "we need to fix X" conversation.
- **Memory of past incidents.** When a new anomaly looks like one from 6 months ago, Sundial pulls forward the post-mortem and the fix. No more "didn't we solve this before?" Slack searches.


## 4. Voice & tone

### Do
- Confident and specific — pick a side, name names
- Talk to engineers like engineers: assume technical fluency
- Em-dashes and contractions are fine
- Short sentences when explaining, longer when arguing
- Numbers and concrete examples ("p99 latency", "8 hours/week", "23-service mesh")
- Acknowledge tradeoffs openly — engineers smell bullshit faster than any other audience

### Don't
- AI clichés ("leverage", "unlock", "supercharge")
- "Enterprise-grade" without specifics
- "Pain points" — use "problems"
- "Solutions" — use "tools", "systems", "products"
- Marketing-speak in technical sections
- Hedging ("we believe", "in our humble opinion")


## 5. Never say

- "Game-changer"
- "Leverage" (use "use")
- "Best-in-class"
- "Mission-critical"
- "Cutting-edge"
- "Solution" (in our context — see above)
- "Pain points"
- "Empower"
- "Seamless"
- "Robust"
- "Synergy"
- "AI-powered" — we use AI but don't lead with it as a feature


## 6. Style rules

- Sentence case for headings
- Numbers under 10 spelled out, 10+ as digits (three services, 12 alerts)
- Em-dashes welcome
- No emoji in body text
- First-person plural ("we") for company voice
- Active voice
- Cite primary sources for any stat
- One idea per paragraph, max ~4 sentences
- Code blocks for any technical syntax — always


## 7. Talking points & proof

- Founded 2024, headquartered in San Francisco
- Built by ex-Google SRE and ex-Datadog product lead
- Series A funded by [investor], $12M raised
- 40+ customers including [logo 1], [logo 2], [logo 3]
- Median customer reduced alert volume by 73% within 30 days
- Powers reliability at [largest customer] — 200+ microservices, 30+ engineers


## 8. Competitor map

### Datadog
Positioning: Full-stack observability — APM, infrastructure, logs, RUM, security, the works.
Where Sundial is different:
- Datadog gives you 14 dashboards; we give you 1 summary
- Pricing model is different — Datadog charges per host/log; we charge per "anomaly under management"
- We integrate with Datadog rather than replacing — many customers run both

### New Relic
Positioning: APM-first observability platform with a consumption-based pricing model.
Where Sundial is different:
- New Relic gives you APM dashboards; we give you the read-out you'd ask an engineer to write
- We focus on the noise problem; they focus on the data ingestion problem

### Honeycomb
Positioning: Observability for distributed systems with a focus on high-cardinality event analysis.
Where Sundial is different:
- Honeycomb is for engineers asking specific queries; we surface things you didn't know to ask
- Different problem (exploratory query power vs. summarization)
- Many teams use both — we link to Honeycomb dashboards in our summaries

### Grafana
Positioning: Open-source dashboarding for metrics, logs, and traces.
Where Sundial is different:
- Grafana is the dashboarding layer; we're the "what should I look at" layer
- We sit on top of Grafana — read its data, summarize, surface


## 9. Content formats

### Long-form blog (1800–2500 words)
Comprehensive technical guide. Use for: SEO targets like "kubernetes monitoring best practices", category education. Structure: hook → why this matters → 4–6 H2 sections each with H3 sub-points → "how we think about it at Sundial" → 5 FAQ → 1 CTA.

### Short blog post (600–900 words)
Single-thesis quick take. Use for: news commentary, opinion pieces. Structure: hook → 3 H2 sections → 1-line takeaway → CTA.

### Comparison page (1400–2200 words)
Head-to-head vs Datadog / New Relic / Grafana / Honeycomb. Structure: hook → "what they're great at" → "where Sundial is different" → feature table → "when to pick which" → 5 FAQ → CTA.

### Glossary entry (300–600 words)
Concise technical definitions. Structure: definition → expansion → related terms → 1 example → CTA.

### Listicle (1200–2000 words)
"X tools we use to monitor Y". Structure: hook → numbered list with H3 + body + takeaway → recap → CTA.

### Case study (1500–2500 words)
Customer story. Structure: customer → problem → what we built → outcomes (specific metrics) → quote → CTA. Only with customer approval.


## 10. Social adaptation rules

### LinkedIn
- Personal voice from the founder or a named engineer
- Open with a number, a contrarian take, or an incident moment
- No "Excited to announce"
- Line breaks every 1–2 sentences
- 180–250 words

### X (Twitter)
- Engineers live here for technical content
- Threads work when they share a debugging story or pattern
- Numbers and named services beat abstractions
- Avoid "Here's how" / "Here's why" openers
- Soft CTA in final tweet

### Newsletter
- Engineering audience — be specific about technical context
- One main story per send
- Signed by the founder or the engineer who wrote it


## 11. Hook patterns

### Long-form openers
- "After 47 production incidents this year, one pattern keeps showing up."
- "Most observability tools tell you what's broken. The interesting question is what's about to break."
- "It's 2 AM. The PagerDuty app is screaming. You open your laptop. You have no idea where to start."

### LinkedIn openers
- "I keep seeing this in customer post-mortems:"
- "[Number] engineers told us [specific thing]."
- "Unpopular take:"
- "The thing nobody tells you about observability:"

### X thread openers
- "[Number]. That's how many alerts we audited this month. Here's what we learned:"
- "Bad on-call rotations do X. Good ones do Y. Great ones do Z."


## 12. CTA library

### Blog CTAs
- "If your team is drowning in alerts, we should talk. → /demo"
- "Curious how Sundial would summarize your stack? → /demo"
- "More on this in our reliability series → /blog/category/reliability"

### Comparison page CTAs
- "Trying to pick between Sundial and [competitor]? Book a call, we'll be honest about which fits. → /demo"

### LinkedIn CTAs
- "Working on this at Sundial — DM if you're seeing the same."
- "Writing more about this on our blog. Link in profile."

### X CTAs
- "Building this at Sundial → [link]"


## 13. Boilerplate

### One-line "about Sundial"
"Sundial is the observability platform for engineering teams — anomaly summarization, pre-deploy risk preview, and incident memory in one place."

### Two-line version
"Sundial is the observability platform that does the filtering for you. Anomaly summarization, pre-deploy risk preview, cross-tool correlation, and memory of past incidents — built for engineering teams who don't want to babysit dashboards."

### Signature for personal-voice posts
"— [Author], engineer at Sundial"


## 14. Internal link library

### Reliability fundamentals
- /blog/slo-vs-sla
- /glossary/golden-signals
- /blog/incident-response-runbook

### Observability stack
- /compare/datadog
- /compare/new-relic
- /compare/grafana
- /compare/honeycomb

### Anomaly detection
- /glossary/anomaly-detection
- /blog/false-positive-fatigue

### Customer stories
- /customers/[customer-1]
- /customers/[customer-2]


## 15. Publisher config

```yaml
publisher: github
github_owner: sundial-engineering
github_repo: sundial-website
github_branch: main
github_path_template: blog/{slug}/index.html
github_template_file: blog/_template.html
github_commit_author: Sundial Content Bot <bot@sundial.example.com>
github_commit_message_template: "blog: publish {keyword}"
schema_org_types: Article, FAQPage, BreadcrumbList
default_post_status_on_publish: live
sitemap_path: sitemap.xml
llms_txt_path: llms.txt
```

---

**To use this as your Brand Context:**
1. Copy this whole document
2. Paste into your Notion `Brand Context` page
3. Replace every Sundial-specific value with your own
4. Convert section 15 (publisher config) to a Notion code block
5. Save — the n8n flow will pick it up on the next run
