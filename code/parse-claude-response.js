// Parse Claude Response
//
// Reads Claude's /v1/messages response and extracts the draft JSON.
// Handles common issues: markdown fences, prose preambles, partial failures.
//
// On success: returns flat object with all draft fields.
// On failure: returns a debug object so the next node can see what went wrong
// (rather than crashing the workflow).

const resp = $input.first().json;
const text = resp.content && resp.content[0] && resp.content[0].text;

if (!text) {
  throw new Error('Claude response missing text');
}

// Clean common issues
let cleaned = text.trim();

// Strip markdown fences like ```json ... ```
cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
cleaned = cleaned.replace(/\s*```\s*$/, '');

let draft = null;
let parseError = null;

try {
  draft = JSON.parse(cleaned);
} catch (e) {
  parseError = e.message;
  // Fallback: extract first balanced JSON object via regex
  var match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      draft = JSON.parse(match[0]);
      parseError = null;
    } catch (e2) {
      parseError = e2.message;
    }
  }
}

// If parsing failed, return debug info instead of crashing
if (!draft) {
  return [{
    json: {
      PARSE_FAILED: true,
      error: parseError,
      raw_length: cleaned.length,
      raw_first_500: cleaned.substring(0, 500),
      raw_last_500: cleaned.substring(Math.max(0, cleaned.length - 500))
    }
  }];
}

// Success path — bring forward ticket_id and keyword from upstream
const meta = $('Build Draft Code').first().json;

return [{
  json: {
    PARSE_FAILED: false,
    ticket_id: meta.ticket_id,
    keyword: meta.keyword,
    title: draft.title || '',
    slug: draft.slug || '',
    meta_title: draft.meta_title || '',
    meta_description: draft.meta_description || '',
    body_markdown: draft.body_markdown || '',
    body_html: draft.body_html || '',
    word_count: draft.word_count || 0,
    tags: Array.isArray(draft.tags) ? draft.tags : [],
    faq: Array.isArray(draft.faq) ? draft.faq : [],
    internal_links_suggested: Array.isArray(draft.internal_links_suggested) ? draft.internal_links_suggested : [],
    schema_org_type: draft.schema_org_type || 'Article'
  }
}];
