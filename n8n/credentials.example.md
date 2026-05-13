# n8n Credentials — what you need to wire up

The workflow uses **three** external services. Each needs a credential entry in n8n's *Credentials* section before the workflow can run. Once created, you'll reference each credential ID in the workflow JSON (the placeholders are clearly marked).

---

## 1. Notion API (used by 3 nodes)

**Used in:** `Get many database pages`, `Get many child blocks`, `Update Notion Page Property`

**Credential type in n8n:** `Notion API` (built-in node credential)

**What you need:**
- A Notion **internal integration token** (starts with `secret_...` or `ntn_...`)

**How to create the token:**
1. Go to https://www.notion.so/profile/integrations
2. Click **+ New integration**
3. Name it (e.g., `n8n content pipeline`), associate it with your workspace
4. **Capabilities:** check **Read content**, **Update content**, **Insert content**
5. Click **Submit**, copy the **Internal Integration Secret**

**Share access with the integration:**
- Open your `Pipeline` database in Notion → **⋯** menu → **Connections** → search for your integration → **Connect**
- Open your `Brand Context` page → same dance → **Connect**

Without sharing, the integration's reads will return 404s even with a valid token.

**Wire it in n8n:**
- Credentials → **+ Add Credential** → search "Notion API" → paste the token → Save
- In each of the 3 Notion-using nodes, set the credential dropdown to this entry

**Placeholder in workflow JSON:** `REPLACE_WITH_YOUR_NOTION_CREDENTIAL_ID`

---

## 2. Anthropic API (used by 1 node)

**Used in:** `HTTP Request` (the Claude draft call)

**Credential type in n8n:** `Anthropic API` (built-in)

**What you need:**
- An Anthropic API key (starts with `sk-ant-...`)

**How to create:**
1. Go to https://console.anthropic.com/
2. Sign up / log in
3. **Settings** → **API Keys** → **+ Create Key**
4. Copy the key (you can only see it once)
5. **Billing:** add a payment method. Pay-as-you-go pricing, no minimum

**Wire it in n8n:**
- Credentials → **+ Add Credential** → search "Anthropic" → paste the key → Save
- The `HTTP Request` node uses `authentication: predefinedCredentialType` + `nodeCredentialType: anthropicApi`, so n8n auto-injects the `x-api-key` header

**Headers also configured in the node:**
- `anthropic-version: 2023-06-01` (required by Anthropic — do not omit)
- `content-type: application/json`

**Placeholder in workflow JSON:** `REPLACE_WITH_YOUR_ANTHROPIC_CREDENTIAL_ID`

> **Swapping to a different LLM provider?** See the README's *Alternative LLMs* section. You'll replace the credential type (e.g., `openAiApi` instead of `anthropicApi`), the URL (`https://api.openai.com/v1/chat/completions`), and adapt `Build Draft Code` to that provider's body shape. The rest of the pipeline is provider-agnostic.

---

## 3. Google Docs OAuth2 (used by 2 nodes)

**Used in:** `Create a document`, `Update a document`

**Credential type in n8n:** `Google Docs OAuth2 API` (built-in)

**Setup depends on which n8n you're running:**

### If you use n8n Cloud (recommended, easiest)
**Zero setup on Google's side.** n8n Cloud has a pre-registered, verified Google OAuth app.

1. Credentials → **+ Add Credential** → search "Google Docs OAuth2 API"
2. Click **Sign in with Google**
3. Pick your Google account, accept the consent screen
4. Save

That's it. Skip the Google Cloud Console section below.

### If you self-host n8n
You need to register your own Google OAuth app:

1. Go to **Google Cloud Console** (https://console.cloud.google.com)
2. Create a new project (e.g., `n8n-content-pipeline`)
3. **APIs & Services** → **Library** → enable two APIs:
   - **Google Docs API**
   - **Google Drive API** (Docs are stored in Drive — both needed)
4. **APIs & Services** → **OAuth consent screen**:
   - User Type: **External**
   - Fill in app name, support email, developer contact
   - Scopes: skip (n8n requests them at runtime)
   - Test users: add your Google account
5. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: `n8n`
   - **Authorized redirect URIs:** leave blank for now
   - Click Create → copy the **Client ID** + **Client Secret**
6. Back to n8n → Credentials → **+ Add Credential** → **Google Docs OAuth2 API**
7. Copy n8n's shown **OAuth Redirect URL** (e.g., `https://your-n8n.example.com/rest/oauth2-credential/callback`)
8. Back to Google Cloud Console → your OAuth client → **Authorized redirect URIs** → paste the URL → Save
9. Back to n8n → paste **Client ID** + **Client Secret** into the form → **Sign in with Google** → authorize → Save

**Placeholder in workflow JSON:** `REPLACE_WITH_YOUR_GOOGLE_DOCS_CREDENTIAL_ID`

---

## Other placeholders in the workflow JSON

Not credentials, but you need to replace these before the workflow will run:

| Placeholder | Where to find the value |
|---|---|
| `YOUR_NOTION_PIPELINE_DB_ID` | Open Pipeline DB in Notion → copy URL → the 32-char hex chunk between `notion.so/` and `?` |
| `YOUR_NOTION_BRAND_CONTEXT_PAGE_ID` | Open Brand Context page → copy link → same 32-char hex |
| `YOUR_GOOGLE_DRIVE_FOLDER_ID` | Open the Drive folder you want drafts in → URL contains `/folders/{id}` → that's the ID |

You can either:
- **Find-and-replace** these in the JSON file before importing, or
- **Import as-is**, then edit each node in n8n's UI and pick the resource from the dropdown (n8n fetches available DBs / pages / folders once credentials are wired)

The dropdown approach is more error-proof.

---

## Verifying credentials work

Once all 3 are wired, smoke-test before opening tickets:

1. Click `Get many database pages` → **Execute step** → should return Queued tickets (or empty array if none)
2. Click `Get many child blocks` → **Execute step** → should return ~218 blocks (your Brand Context page's blocks)
3. Click `Build Draft Code` → **Execute step** → check output has `brand_context_md_length` >0 and `claude_request_body` populated
4. Click `HTTP Request` → **Execute step** → should return Claude's draft within 60–90 seconds
5. Click `Create a document` → **Execute step** → should return an `id` (the Google Doc ID), and the doc appears in your Drive folder

If any step 401s or 404s:
- Notion 404: integration token is valid but doesn't have access — re-share the page/DB with the integration
- Anthropic 401: API key invalid or expired
- Google 403: OAuth scope missing or the user isn't a Test User on the consent screen

---

## Rotating credentials

When you rotate a key (regenerated token / new OAuth app):
1. Open the credential in n8n → paste the new value → Save
2. The flow picks it up on the next run

**Special case — Notion integration token:** If you rotate the Notion token, you must re-share the Pipeline DB AND Brand Context page with the new integration. Notion's access is granted per-page, per-integration.
