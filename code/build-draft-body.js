// Build Draft Code
//
// Reads Brand Context blocks (from `Get many child blocks` node) and ticket data
// (from `Extract` node), assembles a Claude /v1/messages request body with prompt
// caching enabled on the Brand Context portion.
//
// Output: claude_request_body (stringified JSON) — consumed by the HTTP Request node

// Reference upstream node explicitly. $input.all() can return only the current item
// depending on the Code node's execution mode — explicit referencing is safe.
const brandBlocks = $('Get many child blocks').all();

// Render one Notion block to markdown
// Notion API blocks have either `text` or `rich_text` arrays depending on n8n version
function blockToMd(j) {
  if (!j || !j.type) return '';
  var typeKey = j.type;
  var blockData = j[typeKey];
  if (!blockData) return '';
  var rt = blockData.text || blockData.rich_text;
  if (!Array.isArray(rt) || rt.length === 0) return '';
  var text = rt.map(function(r) { return r.plain_text || ''; }).join('');
  if (!text) return '';
  if (typeKey === 'heading_1') return '# ' + text;
  if (typeKey === 'heading_2') return '## ' + text;
  if (typeKey === 'heading_3') return '### ' + text;
  if (typeKey === 'bulleted_list_item') return '- ' + text;
  if (typeKey === 'numbered_list_item') return '1. ' + text;
  if (typeKey === 'callout') return '> ' + text;
  if (typeKey === 'quote') return '> ' + text;
  if (typeKey === 'toggle') return '> ' + text;
  if (typeKey === 'code') return text;
  return text;
}

const brandMd = brandBlocks
  .map(function(b) { return blockToMd(b.json); })
  .filter(function(s) { return s && s.length > 0; })
  .join('\n\n');

const ticket = $('Extract').first().json;

// Brand Context block — cacheable (static across all tickets within 5 min)
const brandContextText = '----- BRAND CONTEXT -----\n\n' + brandMd;

// Ticket-specific block — changes every call, not cached
const ticketTaskText = '----- TICKET -----\n\n'
  + 'Keyword: ' + (ticket.keyword || '(no keyword)')
  + '\nType: ' + (ticket.type || 'Long-form blog')
  + '\nCluster: ' + (ticket.cluster || '-')
  + '\nICP slice: ' + (ticket.icp_slice || '-')
  + '\nNotes for AI: ' + (ticket.notes_for_ai || '-')
  + '\n\n----- TASK -----\n\n'
  + 'Write one piece of content matching the Type and Brand Context section 9 format spec. '
  + 'Output a single JSON object with these fields: title, slug, meta_title (max 60 chars), '
  + 'meta_description (max 155 chars), body_markdown, body_html, tags, faq, '
  + 'internal_links_suggested, schema_org_type, word_count. No prose outside the JSON.';

// Tiny static system prompt — too small to cache (Anthropic minimum is 1024 tokens)
const systemPrompt = 'You are the content engine for the brand in the user message. '
  + 'Always respond with one JSON object matching the schema. '
  + 'Never output prose outside the JSON. '
  + 'Follow Brand Context voice and never-say rules strictly.';

// Brand Context goes in user message as a content block with cache_control.
// (Putting it in system: array also works per Anthropic docs, but n8n's HTTP Request
// node has been observed dropping the system array — user message content is reliable.)
const body = {
  model: 'claude-sonnet-4-6',
  max_tokens: 8000,
  system: systemPrompt,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'text',
        text: brandContextText,
        cache_control: { type: 'ephemeral' }
      },
      {
        type: 'text',
        text: ticketTaskText
      }
    ]
  }]
};

return [{
  json: {
    ticket_id: ticket.ticket_id,
    keyword: ticket.keyword || '',
    type: ticket.type || '',
    brand_context_block_count: brandBlocks.length,
    brand_context_md_length: brandMd.length,
    brand_context_md: brandMd,
    claude_request_body: JSON.stringify(body)
  }
}];
