import {createHash} from 'node:crypto';

export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const normalize = text => String(text ?? '').replace(/\r\n?/g, '\n').trim();

// These blocks are GM/reference material, not evidence of in-world access.
// An unclosed known block consumes the remainder rather than exposing its text.
export function narrative(text) {
  let value = normalize(text);
  for (const name of ['gm_update','gm_notes','agent-context','agent_context','think','thinking']) {
    value = value.replace(new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?(?:<\\/${name}\\s*>|$)`, 'gi'), '');
  }
  return value.trim();
}

function annotations(text) {
  return [...String(text??'').matchAll(/<(gm_update|gm_notes)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)].map(m=>m[2].trim()).filter(Boolean).join('\n');
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
  // source/basis/via field. Historical notes are not migrated or shortened.
  if(typeof evidence.source!=='string'||!evidence.source||evidence.source.length>max)
    throw new Error('Stored evidence identity exceeds its field bound.');
  return evidence.source;
}
