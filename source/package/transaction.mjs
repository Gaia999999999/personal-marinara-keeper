import {applyDelta, DELTA, DELTA_COMPLETE, requireValid} from './keeper-core.mjs';
import {hash} from './sources.mjs';

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const error=(where,message)=>{throw Error(`${where}: ${message}`);};
function shape(x,keys,where){
  if(!object(x))error(where,'expected an object');
  const missing=keys.filter(k=>!Object.hasOwn(x,k)),extra=Object.keys(x).filter(k=>!keys.includes(k));
  if(missing.length||extra.length)error(where,`${missing.length?'missing '+missing.join(', '):''}${missing.length&&extra.length?'; ':''}${extra.length?'unknown '+extra.join(', '):''}`);
}
function array(x,max,where){if(!Array.isArray(x)||x.length>max)error(where,`expected an array of at most ${max}`);}
function identity(x,where){if(typeof x!=='string'||!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(x)||['__proto__','prototype','constructor'].includes(x))error(where,'invalid record ID');}
function parseRef(ref,where){
  if(typeof ref!=='string'||ref.split(':').length!==2)error(where,'use group:id');
  const [group,id]=ref.split(':');
  if(!['cast','relations','ledger','plans','directives'].includes(group))error(where,'unknown group');
  if(group==='relations'){
    const pair=id.split('>');if(pair.length!==2)error(where,'use relations:from>to');pair.forEach(x=>identity(x,where));
  }else identity(id,where);
  return {group,id};
}
const find=(base,group,id)=>base?.[group]?.find(r=>(group==='relations'?`${r.from}>${r.to}`:r.id)===id);
const citationId=entry=>`${entry.origin}.${hash(entry.text).slice(0,8)}`;
const fields={cast:{name:80,identity:180,voice:120,core:180,now:180,growth:180},relations:{stance:220},ledger:{fact:350},plans:{action:300,when:100,where:120},directives:{rule:300}};

export function parseTransaction(input){
  let x=typeof input==='string'?JSON.parse(input):input;
  if(object(x)&&Object.hasOwn(x,'text')){
    if(typeof x.text!=='string')throw Error('Output text is missing.');
    const raw=x.text.trim();
    const fenced=raw.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
    x=JSON.parse(fenced?fenced[1]:raw);
  }
  return x;
}

export function commitTransaction(input,prep){
  const tx=parseTransaction(input),base=prep.baseline;
  shape(tx,['turn','through','scene','changes','access','complete'],'transaction');
  if(tx.turn!==prep.turn)error('turn','does not match this prepared reply');
  if(tx.complete!==true||Object.keys(tx).at(-1)!=='complete')error('complete','must be true and last');
  array(tx.changes,base?24:60,'changes');array(tx.access,base?24:60,'access');
  if(JSON.stringify(tx).length>(base?14000:22000))error('transaction','output exceeds the bounded change budget');
  const delta={schema:DELTA,base_revision:base?.revision??0,base_hash:prep.base_hash,turn_key:prep.anchor.turn_key,
    through:tx.through,scene:tx.scene,updates:[],access:[],retire:[],complete:DELTA_COMPLETE};
  const aliases=new Map(),links=[],seen=new Set();
  const cite=(ids,where,compactRef=null)=>{
    array(ids,3,`${where}.evidence`);if(!ids.length)error(where,'select at least one evidence ID');
    return ids.map(id=>{
      const entry=compactRef?prep.compact.find(s=>s.id===id&&s.ref===compactRef):prep.sources.find(s=>s.id===id);
      if(!entry)error(where,`unknown or wrong-scope evidence ${String(id)}`);
      if(compactRef){const {group,id}=parseRef(compactRef,where);return {source:`base:${compactRef}`,quote:JSON.stringify(find(base,group,id)).slice(0,190),kind:'baseline',current:false};}
      return {source:citationId(entry),quote:entry.text,kind:entry.kind,current:entry.current};
    });
  };
  // Validate every envelope first so malformed later rows do not hide behind
  // an unrelated evidence or knowledge error earlier in the transaction.
  const structural=[];
  tx.changes.forEach((c,i)=>{try{shape(c,['op','ref','data','evidence'],`changes[${i}]`);}catch(e){structural.push(e.message);}});
  tx.access.forEach((a,i)=>{try{shape(a,['ref','who','stance','route','from','evidence'],`access[${i}]`);}catch(e){structural.push(e.message);}});
  if(structural.length)throw Error(structural.slice(0,4).join(' | '));
  for(const [i,c]of tx.changes.entries()){
    const where=`changes[${i}] ${c.ref}`,r=parseRef(c.ref,where),old=find(base,r.group,r.id);
    if(seen.has(c.ref))error(where,'record is changed twice');seen.add(c.ref);
    if(!['set','advance','correct','compact'].includes(c.op))error(where,'op must be set, advance, correct or compact');
    if(!object(c.data)||!Object.keys(c.data).length)error(where,'data must contain the changed fields');
    for(const [field,value]of Object.entries(c.data))if(typeof value==='string'&&fields[r.group][field]&&value.length>fields[r.group][field])error(where,`${field} is ${value.length} characters; maximum ${fields[r.group][field]}`);
    const refs=cite(c.evidence,where,c.op==='compact'?c.ref:null);
    const author=refs.find(e=>e.kind==='author');
    if(c.op==='correct'&&!author)error(where,'correction needs explicit OOC/author evidence; ordinary user dialogue is not correction authority');
    if(r.group==='directives'&&c.op!=='compact'&&!author)error(where,'ongoing author rules need explicit OOC/author evidence');
    if(c.op==='compact'&&!old)error(where,'only existing records can be compacted');
    if(c.op!=='compact'&&refs.every(e=>!e.current))error(where,'old overlapping dialogue cannot establish a new change');
    let id=r.id,data=structuredClone(c.data);
    if(r.group==='ledger'&&old){
      const changed=['kind','fact','truth'].some(k=>k in data&&data[k]!==old[k]);
      if(c.op==='advance'){
        if(!['state','belief'].includes(old.kind))error(where,'advance is for changing state or belief, not rewriting events');
        if(base.ledger.some(row=>row.supersedes===old.id))error(where,'advance the current successor, not an older observation');
        if(typeof data.fact!=='string'||data.fact===old.fact||!Object.hasOwn(data,'truth'))error(where,'supply a new current proposition and its truth');
        if(!refs.some(e=>['user','assistant','author'].includes(e.kind)))error(where,'a transition needs accepted scene or explicit author evidence');
        id=`${r.id.replace(/__r\d+$/,'').slice(0,65)}__r${(base?.revision??0)+1}`;
        if(find(base,'ledger',id))error(where,'successor ID already exists');
        aliases.set(c.ref,`ledger:${id}`);links.push({id,previous:old.id});
        data={kind:old.kind,truth:old.truth,...data};
      }else if(changed&&!['correct','compact'].includes(c.op))error(where,'use advance for a new state with its own audience; correct requires explicit OOC');
    }else if(c.op==='advance')error(where,'advance needs an existing ledger state/belief');
    const chosen=c.op==='correct'||(r.group==='directives'&&c.op!=='compact')?author:refs.find(e=>e.current)??refs[0];
    delta.updates.push({group:r.group,id,set:data,evidence:{source:chosen.source,quote:chosen.quote},reason:`${c.op} from ${c.evidence.join(', ')}`});
  }
  for(const [i,a]of tx.access.entries()){
    const where=`access[${i}] ${a.ref}`,r=parseRef(aliases.get(a.ref)??a.ref,where);
    if(r.group!=='ledger')error(where,'knowledge targets a ledger fact');
    array(a.who,12,where);if(!a.who.length||new Set(a.who).size!==a.who.length)error(where,'who needs distinct recipients');
    const refs=cite(a.evidence,where);
    if(refs.every(e=>!e.current))error(where,'a new knowledge route needs current evidence');
    const author=refs.find(e=>e.kind==='author');
    if(a.route==='author_correction'&&!author)error(where,'author_correction needs explicit OOC/author evidence');
    if(a.route!=='author_correction'&&refs.some(e=>e.kind==='author'))error(where,'OOC is not in-world transmission');
    const chosen=a.route==='author_correction'?author:refs.find(e=>e.current)??refs[0];
    for(const who of a.who)delta.access.push({id:r.id,who,stance:a.stance,route:a.route,from:a.from,evidence:{source:chosen.source,quote:chosen.quote}});
  }
  if(delta.access.length>(base?24:80))error('access',`expanded recipients exceed ${base?24:80}; batch only genuine shared routes and avoid repeating unchanged audiences`);
  const state=applyDelta(delta,{...prep,sources:prep.sources.map(s=>({...s,id:citationId(s)}))});
  for(const link of links)state.ledger.find(r=>r.id===link.id).supersedes=link.previous;
  requireValid(state,base);
  return state;
}
