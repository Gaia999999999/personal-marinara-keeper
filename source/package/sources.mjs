import {createHash} from 'node:crypto';

export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const normalize = text => String(text ?? '').replace(/\r\n?/g, '\n').trim();

const HIDDEN_XML = ['gm_update','gm_notes','agent-context','agent_context','think','thinking'];
const GM_BLOCK = /\[(gm_update(?:_v\d+)?|gm_notes(?:_v\d+)?)\s*\]([\s\S]*?)(?:\[\/\1\s*\]|$)/gi;

// Keep the exact former representation for verification of accepted checkpoints.
// It is never used to construct actionable evidence or a new checkpoint anchor.
function narrative417(text) {
  let value = normalize(text);
  for (const name of HIDDEN_XML) {
    value = value.replace(new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?(?:<\\/${name}\\s*>|$)`, 'gi'), '');
  }
  return value.trim();
}

// Both known note representations are reference material, never in-world access.
// A missing/mismatched closing marker consumes the tail instead of exposing it.
// Host removal of XML tags collapses 3+ newlines; use that same layout convention.
export function narrative(text) {
  return narrative417(text).replace(GM_BLOCK, '').replace(/\n{3,}/g, '\n\n').trim();
}

// A bounded alternative for old anchors containing GM text after removal of its
// XML wrapper. Do not strip arbitrary story markup, infer missing text or use tails
// as a substitute for the complete user/reply pair. Retained state is not migrated.
function legacyGMRepresentation(text) {
  const value = normalize(text);
  if (!/<\/?(?:gm_update|gm_notes)\b[^>]*>/i.test(value)) return null;
  return narrative417(value.replace(/<\/?(?:gm_update|gm_notes)\b[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n'));
}

export function anchorMatches(user, assistant, anchor) {
  if (user?.role !== 'user' || assistant?.role !== 'assistant' || !anchor) return false;
  const userText = normalize(user.content);
  if (`u_${hash(['user',userText]).slice(0,16)}` !== anchor.user_ref ||
      userText.slice(-320) !== anchor.last_user_tail) return false;
  const variants = new Set([narrative(assistant.content), narrative417(assistant.content), legacyGMRepresentation(assistant.content)]);
  for (const replyText of variants) {
    if (!replyText) continue;
    if (`a_${hash(['assistant',replyText]).slice(0,16)}` === anchor.reply_ref &&
        replyText.slice(-480) === anchor.last_reply_tail &&
        hash([user.id??null,userText,replyText]) === anchor.turn_key) return true;
  }
  return false;
}

function annotations(text) {
  const blocks = [];
  const add = body => {
    const trimmed = body.trim();
    const nested = [...trimmed.matchAll(GM_BLOCK)];
    // The usual XML wrapper contains exactly one sentinel block. Unwrap once;
    // otherwise retain its entire body as non-actionable reference material.
    const value = nested.length===1 && nested[0][0]===trimmed ? nested[0][2].trim() : trimmed;
    if (value) blocks.push(value);
  };
  const remaining = normalize(text).replace(/<(gm_update|gm_notes)\b[^>]*>([\s\S]*?)(?:<\/\1\s*>|$)/gi,
    (_,name,body) => { add(body); return ''; });
  for (const m of remaining.matchAll(GM_BLOCK)) add(m[2]);
  return blocks.join('\n');
}

export function buildSources(context, size = 8) {
  const history = (context.recentMessages ?? []).filter(m => ['user','assistant'].includes(m.role));
  const recent = history.slice(-size);
  const sources = [];
  const add = (kind, text, label, messageId = null) => {
    text = kind === 'assistant' ? narrative(text) : normalize(text);
    if (!text) return null;
    // Content identity survives the host assigning a message ID after streaming.
    const id = `${kind[0]}_${hash([kind, text]).slice(0,16)}`;
    const source = {id, kind, label, message_id:messageId, text};
    if (!sources.some(x => x.id === id)) sources.push(source);
    return source;
  };
  for (const m of recent) {
    add(m.role, m.content, m.id ? `Message ${m.id}` : `Recent ${recent.indexOf(m)+1}`, m.id ?? null);
    if(m.role==='assistant') add('gm',annotations(m.content),'Fallible GM annotation',m.id??null);
  }
  const latestUserMessage = [...recent].reverse().find(m => m.role === 'user');
  const latestUser = latestUserMessage && sources.find(s => s.kind === 'user' && s.text === normalize(latestUserMessage.content));
  const replyText = narrative(context.mainResponse);
  if (!replyText) throw new Error('Keeper v4.1 needs the completed post-processing response.');
  const last = recent.at(-1);
  const sameReply = last?.role === 'assistant' && narrative(last.content) === replyText;
  const reply = sameReply ? sources.find(s => s.kind === 'assistant' && s.text === replyText)
    : add('assistant',replyText,'Latest accepted assistant response');
  add('gm',annotations(context.mainResponse),'Fallible GM annotation');
  if (!latestUser || !reply) throw new Error('Keeper v4.1 cannot identify the accepted user/reply pair.');
  for (const card of context.characters ?? []) {
    // Examples/first-message variants are deliberately not current events.
    const text = ['name','description','personality','scenario','backstory','appearance']
      .filter(k => typeof card[k] === 'string' && card[k].trim()).map(k => `${k}: ${card[k]}`).join('\n');
    add('card',text,card.name ?? card.id);
  }
  if (context.persona) {
    add('persona',Object.entries(context.persona).filter(([k,v]) => ['name','description','personality','backstory','appearance'].includes(k) && typeof v === 'string')
      .map(([k,v]) => `${k}: ${v}`).join('\n'),'User persona');
  }
  for (const entry of context.activatedLorebookEntries ?? []) add('lore',entry.content,entry.name ?? entry.id);
  // A seed is a baseline, never new author evidence or fiction.
  const notes = String(context.authorNotes ?? '').replace(/\[KEEPER_V41_SEED\][\s\S]*?(?:\[\/KEEPER_V41_SEED\]|$)/g,'');
  add('author',notes,'Author notes');
  const turnKey = hash([latestUserMessage.id ?? null,latestUser.text,reply.text]);
  return {sources, anchor:{turn_key:turnKey,user_ref:latestUser.id,reply_ref:reply.id,
    last_user_tail:latestUser.text.slice(-320),last_reply_tail:reply.text.slice(-480)}};
}

export function proof(evidence, sources, baseline = null) {
  if (!evidence || Object.keys(evidence).sort().join(',') !== 'quote,source' ||
      typeof evidence.source !== 'string' || typeof evidence.quote !== 'string' ||
      evidence.quote.trim().length < 1 || evidence.quote.length > 200) {
    throw new Error('Evidence needs exactly {source, quote}, with an exact 1–200 character excerpt.');
  }
  let source = sources.find(s => s.id === evidence.source);
  if (!source && evidence.source.startsWith('base:') && baseline) {
    const [,group,id] = evidence.source.split(':');
    const collection = group === 'coverage' ? baseline.coverage.gaps : baseline[group];
    const row = Array.isArray(collection) && collection.find(r => (group === 'relations' ? `${r.from}>${r.to}` : r.id) === id);
    if (row) source = {id:evidence.source,kind:'baseline',text:JSON.stringify(row)};
  }
  if (!source || !source.text.includes(evidence.quote)) throw new Error(`Evidence quote is absent from source ${evidence.source}. No inferred debrief, summary or GM route is accepted.`);
  return source;
}

export function sourceNote(evidence, max = 120) {
  // Validation already checked the full current excerpt. Persist its stable
  // content-addressed ID, rather than repeating clipped narration in every
  // source/basis/via field. This function does not migrate historical notes;
  // the separate host format-maintenance pass handles exact legacy forms.
  if(typeof evidence.source!=='string'||!evidence.source||evidence.source.length>max)
    throw new Error('Stored evidence identity exceeds its field bound.');
  return evidence.source;
}
