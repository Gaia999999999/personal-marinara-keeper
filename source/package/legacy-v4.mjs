// Personal Keeper v4: shared offline/native structural and transition validator.
// No model calls, file access, mutation, text repair, or semantic truth guarantee.
export const SCHEMA = 'character_memory.v4';
export const COMPLETE = 'KEEPER_V4_COMPLETE';
export const SOFT_CHARS = 16000;
export const MAX_CHARS = 22000;
const TOP = ['schema','revision','base_revision','coverage','scene','cast','relations','ledger','plans','directives','changes','complete'];
const CAPS = {cast:12, relations:30, ledger:36, plans:20, directives:24, changes:24};
const OPEN = new Set(['proposed','intended','agreed','in_progress','blocked']);
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const idOK = x => typeof x === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(x);
export const canonical = x => JSON.stringify(x);
export const refFor = (group, row) => `${group}:${group === 'relations' ? `${row.from}>${row.to}` : row.id}`;
const textSize = x => typeof x === 'string' ? x.length : Array.isArray(x) ? x.reduce((n,v)=>n+textSize(v),0) : isObj(x) ? Object.values(x).reduce((n,v)=>n+textSize(v),0) : 0;

export function unwrap(input) {
  let value = typeof input === 'string' ? JSON.parse(input) : input;
  if (isObj(value) && Object.hasOwn(value, 'resultData')) value = typeof value.resultData === 'string' ? JSON.parse(value.resultData) : value.resultData;
  if (isObj(value) && (Object.hasOwn(value,'agent-context') || Object.hasOwn(value,'agentContext'))) {
    throw new Error('Legacy/private payload found. Import v4 as a NEW agent; use an audited v4 seed, not a partial v3 continuation.');
  }
  if (isObj(value) && Object.hasOwn(value,'text')) {
    if (typeof value.text !== 'string') throw new Error('Stored text must be a string.');
    value = JSON.parse(value.text); // Strict: deliberately no fences, repair, or salvage.
  }
  return value;
}

export function inspect(input, previousInput = null) {
  const errors = [], warnings = [];
  let state;
  try { state = unwrap(input); } catch (e) { return {valid:false, errors:[e.message], warnings, metrics:null}; }
  const bad = (path, message) => errors.push(`${path}: ${message}`);
  const keys = (x, list, path) => {
    if (!isObj(x)) {bad(path,'must be an object'); return false;}
    const missing = list.filter(k=>!Object.hasOwn(x,k)), extra = Object.keys(x).filter(k=>!list.includes(k));
    if (missing.length) bad(path,`missing ${missing.join(', ')}`);
    if (extra.length) bad(path,`unknown keys ${extra.join(', ')}`);
    return true;
  };
  const str = (v, max, path, nullable=false) => {if (nullable && v === null) return; if (typeof v !== 'string' || !v.trim() || v.length > max) bad(path,`must be nonempty text <=${max} characters${nullable?' or null':''}`);};
  const en = (v, choices, path) => {if (!choices.includes(v)) bad(path,`must be one of ${choices.join('|')}`);};
  const arr = (v, max, path) => {
    if (!Array.isArray(v)) {bad(path,`must be an array with <=${max} rows`); return [];}
    // An over-cap collection is invalid, not empty. Continue indexing its rows
    // so the diagnostics never manufacture a mass disappearance.
    if (v.length > max) bad(path,`must be an array with <=${max} rows`);
    return v;
  };
  if (!keys(state, TOP, 'checkpoint')) return {valid:false, errors, warnings, metrics:null};
  if (state.schema !== SCHEMA) bad('schema',`expected ${SCHEMA}`);
  if (state.complete !== COMPLETE || Object.keys(state).at(-1) !== 'complete') bad('complete','missing/wrong final completion sentinel');
  if (!Number.isSafeInteger(state.revision) || state.revision < 1) bad('revision','positive safe integer required');
  if (!(state.base_revision === null || (Number.isSafeInteger(state.base_revision) && state.base_revision >= 1))) bad('base_revision','positive integer or null required');
  if (state.base_revision === null && state.revision !== 1) bad('revision','new/audited seed starts at 1');
  if (state.base_revision !== null && state.revision !== state.base_revision + 1) bad('revision','must equal base_revision + 1');
  if (keys(state.coverage,['mode','through','gaps'],'coverage')) {
    en(state.coverage.mode,['initialized','carried','recovered','limited'],'coverage.mode');
    str(state.coverage.through,240,'coverage.through');
    if (state.coverage.mode === 'initialized' && state.base_revision !== null) bad('coverage.mode','initialized cannot replace an existing checkpoint');
    const gapIds = new Set();
    for (const [i,g] of arr(state.coverage.gaps,12,'coverage.gaps').entries()) {
      if (!keys(g,['id','detail'],`gap[${i}]`)) continue;
      if (!idOK(g.id) || gapIds.has(g.id)) bad(`gap[${i}].id`,'invalid/duplicate ID');
      gapIds.add(g.id); str(g.detail,240,`gap[${i}].detail`);
    }
    if (state.coverage.gaps?.length && !['limited','recovered'].includes(state.coverage.mode)) bad('coverage.mode','unresolved gaps require limited/recovered');
  }
  str(state.scene,240,'scene');
  const refs = new Map(), casts = new Set();
  for (const [group,cap] of Object.entries(CAPS)) {
    const rows = arr(state[group],cap,group);
    if (group === 'changes') continue;
    for (const [i,r] of rows.entries()) {
      if (!isObj(r)) {bad(`${group}[${i}]`,'must be object');continue;}
      const ref = refFor(group,r);
      if (refs.has(ref)) bad(ref,'duplicate record'); refs.set(ref,r);
      if (group !== 'relations' && !idOK(r.id)) bad(ref,'invalid ID');
      if (group === 'cast') casts.add(r.id);
    }
  }
  if (!casts.size) bad('cast','must include the user and relevant recurring cast');
  if ((state.cast??[]).filter?.(r=>r?.role === 'user').length !== 1) bad('cast','exactly one user record required');
  const castRef = (id,path) => {if (!casts.has(id)) bad(path,`unknown cast ID ${JSON.stringify(id)}`);};
  const castList = (v,path) => {
    const rows = arr(v,12,path), seen = new Set();
    rows.forEach(id=>{castRef(id,path);if(seen.has(id))bad(path,'duplicate cast ID');seen.add(id);});
    return rows;
  };
  for (const [ref,r] of refs) {
    const group = ref.split(':')[0];
    if (group === 'cast') {
      keys(r,['id','name','role','identity','voice','core','now','growth'],ref);
      str(r.name,80,`${ref}.name`); en(r.role,['npc','user'],`${ref}.role`);
      for (const f of ['identity','core','now','growth']) str(r[f],180,`${ref}.${f}`,true);
      str(r.voice,120,`${ref}.voice`,true);
    } else if (group === 'relations') {
      keys(r,['from','to','stance','basis'],ref); castRef(r.from,ref);castRef(r.to,ref);
      if (r.from === r.to) bad(ref,'self-bond not supported');str(r.stance,220,`${ref}.stance`);str(r.basis,120,`${ref}.basis`);
    } else if (group === 'ledger') {
      keys(r,['id','kind','fact','truth','source','holders','not_known_by'],ref);
      en(r.kind,['event','secret','belief','state','reference','correction'],`${ref}.kind`);
      en(r.truth,['established','reported','uncertain'],`${ref}.truth`);
      str(r.fact,350,`${ref}.fact`);str(r.source,120,`${ref}.source`);
      const excluded = castList(r.not_known_by,`${ref}.not_known_by`), holders = new Set();
      for (const h of arr(r.holders,12,`${ref}.holders`)) {
        if (!keys(h,['who','stance','via'],`${ref}.holder`)) continue;
        castRef(h.who,ref);en(h.stance,['knows','heard','believes','suspects'],ref);str(h.via,80,`${ref}.via`);
        if (holders.has(h.who) || excluded.includes(h.who)) bad(ref,'duplicate/conflicting audience');holders.add(h.who);
      }
    } else if (group === 'plans') {
      keys(r,['id','actor','action','when','where','status','known_by','source'],ref);castRef(r.actor,ref);
      str(r.action,300,`${ref}.action`);str(r.when,100,`${ref}.when`,true);str(r.where,120,`${ref}.where`,true);str(r.source,120,`${ref}.source`);
      en(r.status,[...OPEN,'completed','abandoned'],`${ref}.status`);castList(r.known_by,`${ref}.known_by`);
    } else if (group === 'directives') {
      keys(r,['id','rule','source','status'],ref);str(r.rule,300,`${ref}.rule`);str(r.source,120,`${ref}.source`);en(r.status,['active','retired'],`${ref}.status`);
    }
  }
  for (const g of (Array.isArray(state.coverage?.gaps) ? state.coverage.gaps : [])) if (isObj(g)) refs.set(`coverage:${g.id}`,g);
  const receipts = new Map();
  for (const [i,r] of (Array.isArray(state.changes)?state.changes:[]).entries()) {
    if (!keys(r,['ref','why','replacement','evidence'],`changes[${i}]`)) continue;
    str(r.ref,180,`changes[${i}].ref`);str(r.why,200,`changes[${i}].why`);str(r.evidence,200,`changes[${i}].evidence`);
    if (receipts.has(r.ref)) bad(r.ref,'duplicate change receipt'); receipts.set(r.ref,r);
    const replacements = arr(r.replacement,12,`${r.ref}.replacement`);
    for (const dest of replacements) if (typeof dest !== 'string' || !refs.has(dest)) bad(r.ref,`replacement target not retained: ${JSON.stringify(dest)}`);
    if (new Set(replacements).size !== replacements.length) bad(r.ref,'duplicate replacement');
  }
  const chars = canonical(state).length;
  if (chars > MAX_CHARS) bad('budget',`${chars} canonical characters exceeds ${MAX_CHARS}`);
  else if (chars > SOFT_CHARS) warnings.push(`Above working compact target: ${chars}/${SOFT_CHARS} canonical characters; compress wording, never omit protected records.`);
  const metrics = {canonicalCharacters:chars, valueTextCharacters:textSize(state), counts:Object.fromEntries(Object.keys(CAPS).map(k=>[k,Array.isArray(state[k])?state[k].length:0]))};
  let previous;
  if (previousInput !== null) {
    const priorReport = inspect(previousInput);
    if (!priorReport.valid) bad('baseline',`invalid; cannot certify transition (${priorReport.errors.slice(0,3).join('; ')})`);
    else {
      previous = unwrap(previousInput);
      if (state.base_revision !== previous.revision) bad('base_revision',`must reference supplied baseline revision ${previous.revision}`);
      if (state.revision !== previous.revision+1) bad('revision','must advance exactly once from supplied baseline');
      const priorRefs = new Map();
      for (const group of ['cast','relations','ledger','plans','directives']) for (const r of previous[group]) priorRefs.set(refFor(group,r),r);
      for (const g of previous.coverage.gaps) priorRefs.set(`coverage:${g.id}`,g);
      for (const ref of receipts.keys()) if (!priorRefs.has(ref)) bad(ref,'receipt does not refer to baseline record');
      for (const [ref,old] of priorRefs) {
        const group=ref.split(':')[0], now=refs.get(ref), receipt=receipts.get(ref);
        if (!now) {
          if (group === 'cast' || group === 'directives' || (group === 'plans' && OPEN.has(old.status))) bad(ref,'protected record disappeared');
          if (!receipt) bad(ref,'removed without change receipt');
          if (['ledger','relations'].includes(group) && !receipt?.replacement?.length) bad(ref,'removed without retained replacement');
          if (group === 'ledger' && old.kind === 'secret' && receipt?.replacement?.length) {
            // Refuse to hide a secret in a plan/bond or widen its audience during a merge.
            for (const dest of receipt.replacement) {
              const replacement=refs.get(dest);
              if (!dest.startsWith('ledger:') || !replacement || replacement.kind !== 'secret') bad(ref,'secret must remain a secret ledger record');
              else if (canonical(replacement.holders) !== canonical(old.holders) || canonical(replacement.not_known_by) !== canonical(old.not_known_by)) bad(ref,'secret compaction changed access; update access explicitly before compacting');
            }
          }
        } else {
          if (group === 'cast' && (now.role !== old.role || now.name !== old.name)) bad(ref,'cast identity changed; use an audited seed for renaming/identity repair');
          if (group === 'plans' && OPEN.has(old.status) && !OPEN.has(now.status) && !receipt) bad(ref,'resolution requires receipt');
          if (group === 'directives' && canonical(now) !== canonical(old) && !receipt) bad(ref,'directive edit/retirement requires receipt');
          if (group === 'ledger') {
            const lostHolder = old.holders.some(h=>!now.holders?.some?.(n=>n.who===h.who));
            const lostExclusion = old.not_known_by.some(id=>!now.not_known_by?.includes?.(id));
            if ((lostHolder || lostExclusion || (old.kind==='secret' && now.kind!=='secret')) && !receipt) bad(ref,'access/secret boundary removed without correction receipt');
          }
          if (group === 'plans' && old.known_by.some(id=>!now.known_by?.includes?.(id)) && !receipt) bad(ref,'plan audience removed without correction receipt');
          if (textSize(old) > 120 && textSize(now) < textSize(old)*0.60 && !receipt) bad(ref,'over 40% of record text lost without compaction receipt');
          // A null field must not quietly erase an established identity or commitment term.
          const protectedFields = group==='cast'?['identity','voice','core','growth']:group==='plans'?['when','where']:[];
          for (const f of protectedFields) if (old[f] !== null && now[f] === null && !receipt) bad(`${ref}.${f}`,'cleared without correction receipt');
        }
      }
      const oldChars=canonical(previous).length;
      if (chars < oldChars*0.65 && receipts.size===0) bad('continuity','over 35% total shrinkage without explained compaction');
    }
  } else if (state.base_revision !== null) warnings.push('No baseline supplied: completeness checked, carry-forward NOT certified.');
  return {valid:errors.length===0,errors,warnings,metrics};
}

export function requireValid(input, previous=null) {
  const report=inspect(input,previous);
  if (!report.valid) throw new Error(`Keeper v4 rejected: ${report.errors.slice(0,6).join('; ')}`);
  return unwrap(input);
}
