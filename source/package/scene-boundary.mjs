import {narrative} from './sources.mjs';

// The pinned host repeats mainResponse outside agent_runtime_context and strips
// tags rather than annotation bodies. This is an explicit, bounded reading aid;
// it does not mutate the shared host context or replace the evidence catalog.
export const ENDING_CHARS=2000;
export function sceneBoundary(context,evidence){
  const accepted=narrative(context.mainResponse);
  let start=Math.max(0,accepted.length-ENDING_CHARS);
  // Avoid starting a clipped view inside a surrogate pair.
  if(start>0&&/[\uDC00-\uDFFF]/u.test(accepted[start]))start++;
  return {
    reply_ref:evidence.anchor.reply_ref,
    accepted_narration_ending:accepted.slice(start),
    omitted_prefix_characters:start,
    current_author_source_ids:evidence.sources.filter(s=>s.current&&s.kind==='author').map(s=>s.id),
    rule:'Only indexed sources establish changes. This ending is a verbatim reading aid, not a new source. Stop at the last established action; unanswered choices and conditional next steps remain open. Current explicit author corrections govern the affected state. Ignore unindexed assistant_response/GM annotations, including GM_UPDATE_V1 text with stripped tags.'
  };
}
