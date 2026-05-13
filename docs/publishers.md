# Publishers — pluggable destinations

> ⚠️ **ROADMAP — NOT YET IMPLEMENTED.** The MVP pipeline stops at the human-review stage (draft in Google Doc, Notion `Status = review`). Publishing to a CMS happens manually today. This document describes the planned publisher layer for when auto-publish is added to the workflow.
>
> When implemented, this will become a new branch in n8n triggered by `Status = approved` → renders HTML from template → PUTs to the configured destination → flips Notion `Status = published` and fills a `Published URL` property.

This pipeline is designed so the **same flow** can publish to **any CMS or destination** — the user picks. You don't fork the project to support a new platform; you just point Brand Context at a different `publisher:` value, and the same n8n flow takes care of the rest.

This document covers:
1. How publisher selection works
2. The five shipped publishers — GitHub, WordPress, Webflow, Ghost, Generic Webhook
3. Per-ticket override (if you ever need to publish a single post to a different destination)
4. How to add a new publisher (e.g., HubSpot CMS, Sanity, Contentful)

---

## How publisher selection works

In the Brand Context page (Notion), there's a code block like this:

```yaml
publisher: github
github_owner: your-github-username
github_repo: your-website-repo
github_branch: main
github_path_template: blog/{slug}/index.html
github_template_file: blog/_template.html
```

The n8n flow reads this block from Brand Context on every run. The `publisher:` field is the routing key. The other keys are publisher-specific parameters.

When the flow hits the **publish step**, a SWITCH node looks at `publisher:` and routes the canonical content object to the matching branch. Each branch knows how to translate the canonical object into its CMS's native shape and authenticate.

**Important: credentials are NEVER in Brand Context.** Brand Context only carries config (URLs, slugs, owners). API tokens, passwords, app secrets all live in n8n's encrypted credential vault. Brand Context references them by ID if needed.

---

## Shipped publishers

### 1. `github` — for static sites (GitHub Pages, Cloudflare Pages, Netlify built from GitHub)

**When to choose:** Your website is a static site whose source lives in a Git repo. Includes hand-coded HTML sites, Jekyll, Hugo, 11ty, Next.js static export, Astro, etc.

**Brand Context config:**

```yaml
publisher: github
github_owner: your-github-username
github_repo: your-website-repo
github_branch: main                          # or content-staging for safer testing
github_path_template: blog/{slug}/index.html # where the file lands
github_template_file: blog/_template.html    # template that wraps the body
github_commit_author: Content Bot <bot@example.com>
github_commit_message_template: "blog: publish {keyword}"
```

**Credentials needed in n8n vault:** GitHub Personal Access Token (classic) with `repo` scope, named `github-publisher`.

**What the publisher does:**
1. Reads `github_template_file` from the repo (or uses `templates/reference-blog.html` as fallback)
2. Replaces `{{title}}`, `{{meta_description}}`, `{{body_html}}`, `{{schema_org_json}}`, `{{published_at}}` placeholders
3. Commits the result to `{github_path_template}` with substituted `{slug}`
4. Returns the canonical URL (e.g., `https://yoursite.com/blog/your-slug/`)

**Pros:**
- Zero infrastructure beyond what you already have
- Version controlled — every post is a commit, easy to revert
- Plays great with GitHub Pages (free hosting)

**Cons:**
- Static — no comment system, no built-in newsletter signup forms
- You need to maintain the template HTML

### 2. `wordpress` — for the world's most common CMS

**When to choose:** Your website runs on WordPress (hosted or self-hosted with the REST API enabled).

**Brand Context config:**

```yaml
publisher: wordpress
wordpress_url: https://yoursite.com
wordpress_username: api-publisher
wordpress_post_status: publish              # or "draft" for human review
wordpress_default_categories: [55, 78]      # category IDs
wordpress_default_tags: [9, 10]             # tag IDs
wordpress_featured_image_field: featured_media  # if you set featured images upstream
```

**Credentials needed:** WordPress Application Password (Settings → Users → Your User → Application Passwords) named `wordpress-publisher`. Stored as Basic Auth credential in n8n.

**What the publisher does:**
1. POST `/wp-json/wp/v2/posts` with `title`, `content`, `excerpt`, `slug`, `status`, `categories`, `tags`
2. Injects `schema_org` JSON-LD into the post's HTML head via the configured SEO plugin's meta field (Yoast SEO and Rank Math both supported via their custom field names)
3. Returns the canonical URL

**Pros:**
- Works with every WordPress host on earth
- Drafts mode lets non-technical editors do a second review inside WordPress before publishing
- Featured images, categories, tags all supported

**Cons:**
- WordPress's REST API for custom fields is plugin-dependent (we support Yoast and Rank Math out of the box; others need a custom branch)

### 3. `webflow` — for design-led marketing sites

**When to choose:** Your marketing site is on Webflow and you want blog posts to land in a Webflow CMS Collection.

**Brand Context config:**

```yaml
publisher: webflow
webflow_site_id: 5abc123def456
webflow_collection_id: 5def456abc789
webflow_field_map:
  name: title
  slug: slug
  post_body: body_html
  meta_description: meta_description
  schema_json_ld: schema_org_string
webflow_publish: true                        # false = stays as draft in Webflow
```

**Credentials needed:** Webflow API Token (Site settings → Integrations → API Access) named `webflow-publisher`.

**What the publisher does:**
1. POST `/v2/sites/{site_id}/collections/{collection_id}/items` with the field map applied
2. If `webflow_publish: true`, also POST the publish step to push live
3. Returns the canonical URL

**Pros:**
- Designers can style the blog template natively in Webflow
- CMS Collection structure ensures consistency

**Cons:**
- Your Collection must include fields for `body_html`, `meta_description`, and `schema_json_ld` — set them up once
- Webflow API rate limits are tight (60 req/min); plan accordingly if you batch-publish

### 4. `ghost` — for newsletter-first publishing

**When to choose:** You use Ghost as both your blog and your newsletter platform.

**Brand Context config:**

```yaml
publisher: ghost
ghost_admin_url: https://yourblog.ghost.io
ghost_default_status: published             # or "draft"
ghost_default_tags: [revops, sales]
ghost_send_email: false                     # set true to send the post as a newsletter immediately
ghost_email_segment: free                   # or "paid", "all"
```

**Credentials needed:** Ghost Admin API key (Settings → Integrations → Add custom integration) named `ghost-publisher`.

**What the publisher does:**
1. POST `/ghost/api/admin/posts/` with title, body (Lexical or HTML), tags, status, feature_image
2. Optionally triggers the newsletter send if `ghost_send_email: true`
3. Returns the canonical URL

**Pros:**
- Newsletter + blog from one platform
- Member gating supported
- Clean schema.org and Open Graph out of the box

**Cons:**
- Ghost's body format is Lexical-based; our publisher converts HTML → Lexical via the official converter

### 5. `webhook` — generic escape hatch

**When to choose:** Your CMS isn't supported, or you want full control over the publishing step.

**Brand Context config:**

```yaml
publisher: webhook
webhook_url: https://your-cms-integration.example.com/publish
webhook_auth_header: Authorization
webhook_auth_credential_id: my-cms-publisher  # references n8n credential
webhook_method: POST
```

**Credentials needed:** Whatever your endpoint expects, stored in n8n vault, referenced by `webhook_auth_credential_id`.

**What the publisher does:**
1. POSTs the full canonical content object (see [`docs/architecture.md`](architecture.md#canonical-content-object)) as JSON
2. Expects a JSON response with at least `{ "url": "https://..." }` so the flow knows the canonical URL
3. Returns that URL

**Pros:**
- Works with any CMS — you implement the receiving endpoint
- Great for custom infrastructure: HubSpot CMS, Sanity, Contentful, Strapi, or a homegrown blog engine

**Cons:**
- You write the receiving endpoint (typically 30–60 lines in any language)
- No native error handling beyond HTTP status codes

---

## Per-ticket override (advanced)

Sometimes you want a single ticket to publish somewhere other than the default. Example: a customer story that should go on a co-marketing partner's blog instead of your own site.

The `Pipeline` database supports an optional `Publisher override` property (Text). If set, this overrides Brand Context's `publisher:` for that one ticket. The value is the same `publisher: github` / `publisher: wordpress` / etc. block, inline.

If `Publisher override` is empty, Brand Context's default publisher is used.

---

## Adding a new publisher (e.g., HubSpot CMS, Sanity, Contentful)

Adding a publisher is a self-contained task. Here's the recipe:

### Step 1: Add a new branch to the SWITCH node

Open the n8n flow, find the **Publisher SWITCH** node, add a new rule:
- Condition: `{{ $json.brand_context.publisher }}` equals `your_new_publisher_name`
- Output: a new branch

### Step 2: Build the publisher branch

A publisher branch is typically 3–5 nodes:
1. **Build payload** — Function node that takes the canonical content object and transforms it into your CMS's API shape
2. **HTTP request** — the actual API call (POST, with auth from n8n credential vault)
3. **Extract URL** — Function node that parses the response to extract the published URL
4. **(optional) Trigger publish step** — for CMSs that have a separate "publish" action

### Step 3: Document the config

Add a section to this file (`docs/publishers.md`) showing:
- When to choose this publisher
- Brand Context config block (YAML keys)
- Required credentials and how to obtain them
- What the publisher does, step by step
- Pros / cons

### Step 4: Document the credential mapping

Update `n8n/credentials.example.md` with the new credential name and what scope/permissions it needs.

### Step 5: Update the README publishers list

Add the new publisher to the README's "shipped publishers" section.

---

## Testing a publisher safely

Before pointing a publisher at your live production site, test against a staging environment:

| Publisher | Safe testing approach |
|---|---|
| `github` | Set `github_branch: content-staging` to push to a non-main branch first |
| `wordpress` | Set `wordpress_post_status: draft` — posts land as drafts, you publish manually after review |
| `webflow` | Set `webflow_publish: false` — items land as drafts in the CMS Collection |
| `ghost` | Set `ghost_default_status: draft` |
| `webhook` | Implement a `?dry_run=true` query param on your endpoint that responds without persisting |

After 5–10 successful test publishes, flip back to production-mode config.

---

## Costs per publisher

All publishers are free at the API level (no per-call fees). The only costs are:
- n8n hosting ($5/mo self-hosted, $20/mo n8n Cloud)
- Whatever your CMS costs (WordPress hosting, Webflow plan, Ghost subscription, etc.)
- Claude API for the draft itself (~$0.50–$1.50 per post, see [README cost table](../README.md#costs-at-typical-volume))

---

## What if I want to publish to multiple destinations from one ticket?

Possible but not the default behavior. Two approaches:

**Approach A: Multiple tickets, one per destination.** Open one ticket with `publisher: github` and a second with `publisher: linkedin_carousel` (when that publisher exists). Cleanest, easiest to debug.

**Approach B: Custom fan-out branch.** Add a branch to the flow that, after the primary publisher succeeds, calls the `webhook` publisher with a payload to a syndication endpoint. Useful for cross-posting to Medium, Dev.to, Hashnode, etc.

Most teams stick with Approach A. If you need Approach B, see the Roadmap section of the README.
