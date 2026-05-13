# Code node sources

The workflow has 4 `n8n-nodes-base.code` nodes. Their JS is embedded in `n8n/content-pipeline.json` (escaped), which is fine for n8n but hard to read or version-control on its own.

These files mirror what's inside each Code node. If you edit a file here, copy it into n8n — they don't sync automatically.

| File | Node in workflow | Purpose |
|---|---|---|
| [`extract.js`](extract.js) | `Extract` | Flatten Notion's verbose property shape into clean fields |
| [`build-draft-body.js`](build-draft-body.js) | `Build Draft Code` | Render Brand Context to markdown, assemble Claude request body with cache_control |
| [`parse-claude-response.js`](parse-claude-response.js) | `Parse Response` | Extract draft JSON from Claude's response (handles markdown fences, partial fails) |
| [`build-google-doc-content.js`](build-google-doc-content.js) | `Build Google Doc Content` | Assemble plain-text body for the Google Doc |

## Conventions

- Use `var`/`function` (not arrow functions everywhere) — n8n's Code node sandbox is strict ES; older constructs are safest
- Reference upstream nodes by exact name: `$('Get many child blocks').all()` is safer than `$input.all()` (the latter behaves differently depending on Code node execution mode)
- Defensive on Notion's data shape — `text` array vs `rich_text` array varies by n8n version
- Return one item per output: `return [{ json: { ... } }]`
