import {inspect as inspectV4, unwrap as unwrapV4, refFor, MAX_CHARS} from './legacy-v4.mjs';
import {hash, proof, sourceNote} from './sources.mjs';
import {maintainLegacyProvenance} from './provenance.mjs';

export const SCHEMA = 'character_memory.v4.1';
export const DELTA = 'character_memory.delta.v4.1';
export const COMPLETE = 'KEEPER_V41_COMPLETE';
export const DELTA_COMPLETE = 'KEEPER_V41_DELTA_COMPLETE';
const GROUPS = ['cast','relations','ledger','plans','directives'];
const OPEN = ['proposed','intended','agreed','in_progress','blocked'];
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const copy = x => structuredClone(x);
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const fail = message => {throw new Error(`Keeper v4.1 rejected: ${message}`);};
const key = (group,row) => group === 'relations' ? `${row.from}>${row.to}` : row.id;
const exact = (value, keys, path) => {
  if (!plain(value) || Object.keys(value).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(value,k))) fail(`${path}: expected keys ${keys.join(', ')}.`);
};
const text = (value,max,path) => {if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${path}: nonempty text <=${max} required.`);};
const list = (value,max,path) => {if (!Array.isArray(value) || value.length > max) fail(`${path}: array <=${max} required.`);};
const identity = value => {if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(value) || ['__proto__','prototype','constructor'].includes(value)) fail('Invalid record identity.');};
export const normalizeWording = text => text.trim().replace(/\s+/gu,' ');
const record = (state,group,id) => state[group]?.find(r => key(group,r) === id);

export function unwrap(input) {
  // The legacy unwrap is strict and rejects private/public split payloads.
  return unwrapV4(input);
}
function legacy(state) {
  const {anchor,...rest} = copy(state);
  // 4.1.1 records a successor observation without changing the old audience.
  // Validate this extension separately; the established bounds stay unchanged.
  for(const row of Array.isArray(rest.ledger)?rest.ledger:[])if(row&&typeof row==='object')delete row.supersedes;
  rest.schema = 'character_memory.v4'; rest.complete = 'KEEPER_V4_COMPLETE';
  return rest;
}
export function inspect(input, previous = null) {
  let state, prior;
  try {state=unwrap(input); prior=previous === null ? null : unwrap(previous);}
  catch(e) {return {valid:false,errors:[e.message],warnings:[],metrics:null};}
  if (!plain(state)) return {valid:false,errors:['Checkpoint must be an object.'],warnings:[],metrics:null};
  const report = inspectV4(legacy(state),prior ? legacy(prior) : null);
  const ledger=Array.isArray(state.ledger)?state.ledger:[];
  const predecessors=new Set();
  for(const row of ledger){
    if(!row||typeof row!=='object')continue;
    if(!Object.hasOwn(row,'supersedes'))continue;
    const previous=ledger.find(r=>r?.id===row.supersedes);
    if(typeof row.supersedes!=='string'||!previous||row.supersedes===row.id||!['state','belief'].includes(previous.kind)||!['state','belief'].includes(row.kind))report.errors.push(`ledger:${row.id}: invalid successor link.`);
    if(predecessors.has(row.supersedes))report.errors.push(`ledger:${row.id}: forked successor history.`);
    predecessors.add(row.supersedes);
    const seen=new Set([row.id]);let cursor=previous;
    while(cursor){if(seen.has(cursor.id)){report.errors.push(`ledger:${row.id}: cyclic successor link.`);break;}seen.add(cursor.id);cursor=ledger.find(r=>r?.id===cursor.supersedes);}
    const old=prior?.ledger?.find(r=>r.id===row.id);
    if(old&&old.supersedes!==row.supersedes)report.errors.push(`ledger:${row.id}: successor history is immutable.`);
  }
  for(const old of Array.isArray(prior?.ledger)?prior.ledger:[]){
    if(old?.supersedes&&ledger.find(r=>r?.id===old.id)?.supersedes!==old.supersedes)report.errors.push(`ledger:${old.id}: successor history disappeared.`);
  }
  if (state.schema !== SCHEMA || state.complete !== COMPLETE || Object.keys(state).at(-1) !== 'complete') report.errors.push('Wrong v4.1 schema/completion sentinel.');
  const a=state.anchor;
  if (!plain(a) || Object.keys(a).sort().join(',') !== 'last_reply_tail,last_user_tail,reply_ref,turn_key,user_ref' ||
      !/^[a-f0-9]{64}$/.test(a.turn_key) || !/^u_[a-f0-9]{16}$/.test(a.user_ref) || !/^a_[a-f0-9]{16}$/.test(a.reply_ref) ||
      typeof a.last_user_tail !== 'string' || !a.last_user_tail || a.last_user_tail.length>320 ||
      typeof a.last_reply_tail !== 'string' || !a.last_reply_tail || a.last_reply_tail.length>480) report.errors.push('Invalid host-generated continuation anchor.');
  const chars=JSON.stringify(state).length;
  if (chars > MAX_CHARS) report.errors.push(`budget: ${chars} canonical characters exceeds ${MAX_CHARS}, including anchor.`);
  if (report.metrics) report.metrics.canonicalCharacters=chars;
  report.valid=report.errors.length===0;
  return report;
}
export function requireValid(input, previous=null) {
  const report=inspect(input,previous);
  if (!report.valid) fail(report.errors.slice(0,8).join('; '));
  return unwrap(input);
}

const MUTABLE = {
  cast:['name','role','identity','voice','core','now','growth'],
  relations:['stance'],
  ledger:['kind','fact','truth'],
  plans:['actor','action','when','where','status','known_by'],
  directives:['rule','status']
};
const COMPACTABLE = {cast:['identity','voice','core','now','growth'],relations:['stance'],ledger:['fact'],plans:['action'],directives:['rule']};

// The LLM never authors the canonical arrays, revisions, anchor or carry-forward.
// Every operation applies to a cloned baseline; any failure rejects the transaction.
export function applyDelta(input, prepared) {
  let delta;
  try {delta=unwrap(input);} catch(e) {fail(e.message);}
  exact(delta,['schema','base_revision','base_hash','turn_key','through','scene','updates','access','retire','complete'],'delta');
  const base=prepared.baseline ? requireValid(prepared.baseline) : null;
  if (delta.schema!==DELTA || delta.complete!==DELTA_COMPLETE || Object.keys(delta).at(-1)!=='complete') fail('Expected one complete v4.1 delta, not a replacement snapshot.');
  if (delta.base_revision!==(base?.revision??0) || delta.base_hash!==prepared.base_hash || delta.turn_key!==prepared.anchor.turn_key) fail('Stale or mismatched baseline/accepted turn.');
  if (base && base.anchor.turn_key===prepared.anchor.turn_key) fail('This exact user/reply pair is already committed. Re-run against the host-selected prior message.');
  text(delta.through,240,'through');
  if (delta.scene!==null) text(delta.scene,240,'scene');
  list(delta.updates,base?24:80,'updates'); list(delta.access,base?24:80,'access'); list(delta.retire,12,'retire');
  if (JSON.stringify(delta).length>(base?16000:26000)) fail('Delta output exceeds its bounded change budget.');
  const state=base?copy(base):{schema:SCHEMA,revision:0,base_revision:null,
    coverage:{mode:'initialized',through:delta.through,gaps:[]},scene:delta.scene,cast:[],relations:[],ledger:[],plans:[],directives:[],changes:[],anchor:prepared.anchor,complete:COMPLETE};
  state.base_revision=base?.revision??null; state.revision=(base?.revision??0)+1;
  state.coverage.through=delta.through; state.coverage.mode=base?'carried':'initialized';
  state.anchor=copy(prepared.anchor); state.changes=[];
  if (delta.scene!==null) state.scene=delta.scene;
  if (prepared.gap && !state.coverage.gaps.some(g=>g.id===prepared.gap.id)) state.coverage.gaps.push(copy(prepared.gap));
  if (state.coverage.gaps.length) state.coverage.mode='limited';
  const receipts=new Map(), touched=new Set();
  const receipt=(group,id,why,evidence,replacement=[]) => {
    if (!base || !record(base,group,id)) return;
    const ref=`${group}:${id}`;
    const old=receipts.get(ref);
    receipts.set(ref,{ref,why:old ? `${old.why}; ${why}`.slice(0,200):why,replacement,evidence:evidence.source});
  };
  for (const u of delta.updates) {
    exact(u,['group','id','set','evidence','reason'],'update');
    const {group,id}=u;
    if (!GROUPS.includes(group)) fail(`Unsupported group ${group}.`);
    if (group==='relations') {
      const pair=String(id).split('>'); if(pair.length!==2) fail('Relation identity must be from>to.'); pair.forEach(identity);
    } else identity(id);
    const ref=`${group}:${id}`;
    if(touched.has(ref)) fail(`Duplicate update ${ref}.`); touched.add(ref);
    text(u.reason,140,'reason');
    if(!plain(u.set) || !Object.keys(u.set).length || Object.keys(u.set).some(k=>!MUTABLE[group].includes(k))) fail(`${ref}: forbidden/empty field patch.`);
    const source=proof(u.evidence,prepared.sources,base);
    const old=record(state,group,id);
    if(source.kind==='gm') {
      const proposed={...old,...u.set};
      if(group!=='ledger' || proposed.kind!=='belief' || proposed.truth!=='uncertain' || old?.holders?.length) fail('GM annotations may only maintain unverified belief rows with no audience. They cannot author established events, access, cast changes or plan outcomes.');
    }
    if (source.kind==='baseline') {
      if (!old || u.evidence.source!==`base:${group}:${id}` || Object.keys(u.set).some(k=>!COMPACTABLE[group].includes(k))) fail('Baseline quotes authorize wording compaction of that record only.');
      for(const [field,value] of Object.entries(u.set)) {
        if(typeof value!=='string' || typeof old[field]!=='string') fail('Compaction cannot clear or invent a field.');
        if(value.length>=old[field].length || value!==normalizeWording(old[field])) fail('Compaction is whitespace cleanup only; words and punctuation must remain unchanged. Semantic rewrites need a supported update or explicit correction.');
      }
    }
    if (group==='directives' && source.kind!=='baseline' && !['user','author'].includes(source.kind)) fail('Only author/user evidence can create or change an OOC directive.');
    if (group==='cast' && (old?.role==='user' || u.set.role==='user') && ['identity','voice','core','growth'].some(k=>Object.hasOwn(u.set,k) && u.set[k]!==null) && !['user','author','persona','baseline'].includes(source.kind)) fail('User traits require user/persona/author evidence.');
    let row=old;
    if(!row) {
      if(group==='relations') {const [from,to]=id.split('>');row={from,to,stance:null,basis:null};}
      else if(group==='cast') row={id,name:null,role:null,identity:null,voice:null,core:null,now:null,growth:null};
      else if(group==='ledger') row={id,kind:null,fact:null,truth:null,source:null,holders:[],not_known_by:[]};
      else if(group==='plans') row={id,actor:null,action:null,when:null,where:null,status:null,known_by:[],source:null};
      else row={id,rule:null,source:null,status:'active'};
      state[group].push(row);
    }
    if(group==='cast' && old && (('name' in u.set && u.set.name!==old.name)||('role' in u.set && u.set.role!==old.role))) fail('Existing cast identity is immutable.');
    if(group==='ledger' && old && ['kind','truth','fact'].some(k=>k in u.set && u.set[k]!==old[k]) && source.kind!=='baseline') {
      // A changed proposition cannot inherit its former audience by accident.
      // Correcting the wording without changing the proposition uses base: proof.
      if(old.holders.length && !['user','author'].includes(source.kind)) fail('Changing a known proposition requires author correction or a new atomic fact. Keep the old audience intact.');
    }
    if(group==='plans' && old && 'known_by' in u.set && !equal(u.set.known_by,old.known_by)) {
      if(!Array.isArray(u.set.known_by) || !old.known_by.every(id=>u.set.known_by.includes(id))) fail('Existing plan audiences cannot silently lose members.');
      if(!['user','assistant','author'].includes(source.kind)) fail('Adding plan recipients requires an actual accepted disclosure/author source.');
    }
    if(group==='plans' && old && OPEN.includes(old.status) && ['completed','abandoned'].includes(u.set.status) && !['user','assistant','author'].includes(source.kind)) fail('Plan resolution requires accepted scene/author evidence, not a summary or old checkpoint.');
    Object.assign(row,copy(u.set));
    if(source.kind!=='baseline') {
      if(group==='relations') row.basis=sourceNote(u.evidence);
      else if(['ledger','plans','directives'].includes(group)) row.source=sourceNote(u.evidence);
    }
    // Cosmetic cleanup needs no bulky transient receipt; inspect verifies it.
    if(source.kind!=='baseline')receipt(group,id,u.reason,u.evidence);
  }

  const accessKeys=new Set();
  // Resolve grounded senders first, independent of model array order.
  // A cycle with no initial holder never creates its own authority.
  const pending=[...delta.access].sort((a,b)=>`${a.id}:${a.who}`.localeCompare(`${b.id}:${b.who}`));
  while(pending.length) {
    const index=pending.findIndex(a=>a.route!=='disclosed');
    const ready=index>=0?index:pending.findIndex(a=>{
      const sender=record(state,'ledger',a.id)?.holders.find(h=>h.who===a.from);
      return sender&&(a.stance!=='knows'||sender.stance==='knows');
    });
    if(ready<0)fail('The sender lacks the proposed knowledge; disclosure dependencies have no grounded source.');
    const [a]=pending.splice(ready,1);
    exact(a,['id','who','stance','route','from','evidence'],'access');
    identity(a.id); identity(a.who);
    if (a.from!==null) identity(a.from);
    const k=`${a.id}:${a.who}`; if(accessKeys.has(k)) fail(`Duplicate access update ${k}.`);accessKeys.add(k);
    const row=record(state,'ledger',a.id), who=record(state,'cast',a.who);
    if(!row || !who) fail('Access references missing fact/cast.');
    if(!['knows','heard','believes','suspects','excluded'].includes(a.stance)) fail('Invalid knowledge stance.');
    if(!['observed','disclosed','inferred','self','canon','author_correction','claim'].includes(a.route)) fail('Invalid access route; a self-assertion is not proof of knowledge.');
    const src=proof(a.evidence,prepared.sources,base);
    if(['baseline','author'].includes(src.kind) && a.route!=='author_correction') fail('GM/baseline material is not an in-world transmission.');
    if(a.route==='author_correction' && !['user','author'].includes(src.kind)) fail('Author correction requires user/author evidence.');
    if(a.route==='canon' && (!['card','persona','lore'].includes(src.kind) || record(base??{},'ledger',a.id)?.holders?.length)) fail('Canon can initialize explicit starting access, not retroactively explain a transfer.');
    if(!['canon','author_correction'].includes(a.route) && !['user','assistant'].includes(src.kind)) fail('An in-world route requires accepted dialogue/narration.');
    if(['inferred','claim'].includes(a.route) && !['heard','believes','suspects'].includes(a.stance)) fail('A guess/claim cannot establish knowledge or truth.');
    if(a.stance==='excluded' && !['author_correction','canon'].includes(a.route)) fail('Explicit exclusions need author/canon support. Unlisted people already have no established access.');
    if(a.route==='disclosed') {
      if(!a.from || a.from===a.who) fail('Disclosure needs a different named sender. The recipient asserting a fact is not their own disclosure.');
      const sender=row.holders.find(h=>h.who===a.from);
      if(!sender || (a.stance==='knows' && sender.stance!=='knows')) fail('The sender lacks the proposed knowledge.');
    } else if(a.from!==null) fail('Only disclosure has a sender.');
    const prior=row.holders.find(h=>h.who===a.who);
    if(prior && prior.stance==='knows' && a.stance!=='knows' && a.route!=='author_correction') fail('Knowledge cannot be downgraded without author correction.');
    if(row.not_known_by.includes(a.who) && !['disclosed','observed','author_correction'].includes(a.route)) fail('An explicit exclusion cannot become self-knowledge, a guess or a canon retelling.');
    row.holders=row.holders.filter(h=>h.who!==a.who);
    row.not_known_by=row.not_known_by.filter(id=>id!==a.who);
    if(a.stance==='excluded') row.not_known_by.push(a.who);
    else row.holders.push({who:a.who,stance:a.stance,via:`${a.route}${a.from?`/${a.from}`:''} ${sourceNote(a.evidence)}`.slice(0,80)});
    receipt('ledger',a.id,`Explicit ${a.route} for ${a.who}`,a.evidence);
  }

  const retired=new Set();
  for(const r of delta.retire) {
    exact(r,['group','id','replacement','evidence','reason'],'retire');
    if(!['ledger','plans'].includes(r.group)) fail('Cast, relationships, directives and unresolved gaps cannot be deleted.');
    text(r.reason,140,'retirement reason');
    const ref=`${r.group}:${r.id}`; if(retired.has(ref)||touched.has(ref)||[...accessKeys].some(k=>r.group==='ledger'&&k.startsWith(`${r.id}:`))) fail('A record cannot be retired and edited in one update.'); retired.add(ref);
    const old=record(state,r.group,r.id);
    if(!old || !record(base??{},r.group,r.id)) fail('Retirement must identify a baseline record.');
    proof(r.evidence,prepared.sources,base);
    const destination=record(state,'ledger',r.replacement);
    if(!destination || (r.group==='ledger' && r.replacement===r.id)) fail('Retirement requires a retained ledger replacement.');
    if(r.group==='ledger') {
      const signature=row=>JSON.stringify({kind:row.kind,fact:row.fact,truth:row.truth,holders:[...row.holders].sort((a,b)=>a.who.localeCompare(b.who)),not_known_by:[...row.not_known_by].sort()});
      if(signature(old)!==signature(destination)) fail('Only exact duplicate facts with identical access can be coalesced. No lossy merge.');
    } else if(OPEN.includes(old.status)) fail('Unresolved plans cannot be retired.');
    state[r.group]=state[r.group].filter(row=>key(r.group,row)!==r.id);
    receipt(r.group,r.id,r.reason,r.evidence,[`ledger:${r.replacement}`]);
  }
  state.changes=[...receipts.values()];
  // Keep completion last even after future schema changes.
  delete state.complete;state.complete=COMPLETE;
  const maintained=maintainLegacyProvenance(state,base).state;
  requireValid(maintained,base);
  return maintained;
}

export function baselineHash(base) {return hash(base??null);}
