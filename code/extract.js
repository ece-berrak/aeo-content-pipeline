// Extract ticket fields into clean variables for downstream nodes
//
// Input:  one Notion page object from `Get many database pages` (verbose properties shape)
// Output: one flat object with the ticket fields downstream nodes need

const t = $input.first().json;
const props = t.properties || {};

const keyword = props.Keyword?.rich_text?.[0]?.plain_text
  || t.property_keyword || '';

const type = props.Type?.select?.name
  || t.property_type || 'Long-form blog';

const cluster = props.Cluster?.select?.name
  || t.property_cluster || '';

const icp = (props['ICP slice']?.multi_select || [])
  .map(s => s.name).join(', ')
  || (Array.isArray(t.property_icp_slice) ? t.property_icp_slice.join(', ') : t.property_icp_slice || '');

const notes = props['Notes for AI']?.rich_text?.map(r => r.plain_text).join('')
  || t.property_notes_for_ai || '';

return [{
  json: {
    ticket_id: t.id,
    keyword,
    type,
    cluster,
    icp_slice: icp,
    notes_for_ai: notes,
    page_url: t.url
  }
}];
