// Build Google Doc Content
//
// Takes the parsed Claude draft and assembles plain text for the Google Doc body.
// Also resolves ticket_id via a fallback chain (defensive against n8n data flow edge cases).
//
// Output: { ticket_id, title, doc_title, doc_content_text }
//   doc_title is used as the Google Doc filename
//   doc_content_text is inserted into the Doc via Update operation

const draft = $input.first().json || {};

// Resolve ticket_id via fallback chain — different upstream nodes expose it differently
let ticketId = null;
const sources = [
  function() { return $('Get many database pages').first().json.id; },
  function() { return $('Extract').first().json.ticket_id; },
  function() { return $('Extract').first().json.id; },
  function() { return draft.ticket_id; },
  function() { return $('Parse Response').first().json.ticket_id; },
  function() { return $('Build Draft Code').first().json.ticket_id; }
];

for (var i = 0; i < sources.length; i++) {
  try {
    var v = sources[i]();
    if (v && typeof v === 'string' && v.length >= 32) {
      ticketId = v;
      break;
    }
  } catch (e) {}
}

if (!ticketId) {
  throw new Error('Cannot resolve ticket_id from upstream nodes.');
}

const title = draft.title || 'Untitled Draft';
const md = draft.body_markdown || '';

// Build plain-text body for the Google Doc.
// Google Docs' batchUpdate insertText inserts plain text at a given index.
// Rich formatting (headings, bold, lists) would require additional batchUpdate
// requests after the insert — deferred to a future enhancement.
var docText = '';

docText += title + '\n\n';

docText += 'Meta title: ' + (draft.meta_title || '-') + '\n';
docText += 'Meta description: ' + (draft.meta_description || '-') + '\n';
docText += 'Word count: ' + (draft.word_count || 0) + '\n';
docText += 'Schema.org type: ' + (draft.schema_org_type || 'Article') + '\n';
docText += '\n----------\n\n';

docText += md + '\n';

if (Array.isArray(draft.faq) && draft.faq.length > 0) {
  docText += '\n----------\n\nFAQ\n\n';
  draft.faq.forEach(function(qa) {
    if (qa && qa.q) {
      docText += 'Q: ' + qa.q + '\n';
      if (qa.a) docText += 'A: ' + qa.a + '\n';
      docText += '\n';
    }
  });
}

return [{
  json: {
    ticket_id: ticketId,
    title: title,
    doc_title: title + ' — ' + new Date().toISOString().slice(0, 10),
    doc_content_text: docText
  }
}];
