// Lossless canonical serialization. No fact text, audience, row, provenance value,
// condition or historical identity is dropped. No external store or archive.
export const ENCODING='keeper.provenance.v1';
export const PACKED_COMPLETE='KEEPER_PACKED_COMPLETE';
export const LEGEND='source/basis integers and holder tuples [who,stance,viaIndex] reference provenance. These are historical sources, not current evidence IDs.';
export const MAX_CHARS=22000;
const GROUP_CAPS={cast:12,relations:30,ledger:36,plans:20,directives:24};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=message=>{throw Error(`Stored checkpoint: ${message}`);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function storedValue(input){
  let value=typeof input==='string'?JSON.parse(input):input;
  if(plain(value)&&Object.hasOwn(value,'resultData'))value=typeof value.resultData==='string'?JSON.parse(value.resultData):value.resultData;
  if(plain(value)&&(Object.hasOwn(value,'agent-context')||Object.hasOwn(value,'agentContext')))
    fail('Legacy/private payload found. Use the accepted native checkpoint, not split private memory.');
  if(plain(value)&&Object.hasOwn(value,'text')){
    if(typeof value.text!=='string')fail('Stored text must be a string.');
    value=JSON.parse(value.text);
  }
  return value;
}
function checkCollections(state){
  if(!plain(state))fail('state must be an object');
  for(const [group,max]of Object.entries(GROUP_CAPS)){
    if(!Array.isArray(state[group])||state[group].length>max)fail(`${group}: existing row cap ${max} exceeded or invalid array`);
    if(state[group].some(row=>!plain(row)))fail(`${group}: invalid record`);
  }
}
export function packCheckpoint(state){
  checkCollections(state);
  const data=structuredClone(state),pool=[];
  const index=(value,max)=>{
    if(typeof value!=='string'||!value.trim()||value.length>max)fail('provenance value violates its existing field bound');
    let i=pool.indexOf(value);if(i<0){i=pool.length;pool.push(value);}return i;
  };
  for(const row of data.relations)row.basis=index(row.basis,120);
  for(const group of ['ledger','plans','directives'])for(const row of data[group]){
    row.source=index(row.source,120);
    if(group==='ledger'){
      if(!Array.isArray(row.holders)||row.holders.length>12)fail('invalid holders');
      row.holders=row.holders.map(h=>{
        if(!plain(h)||Object.keys(h).sort().join(',')!=='stance,via,who')fail('invalid holder shape');
        return [h.who,h.stance,index(h.via,80)];
      });
    }
  }
  return {encoding:ENCODING,legend:LEGEND,provenance:pool,state:data,complete:PACKED_COMPLETE};
}
export function unpackCheckpoint(input){
  const wire=storedValue(input);
  if(!plain(wire)||!Object.hasOwn(wire,'encoding'))return wire;
  if(Object.keys(wire).join(',')!=='encoding,legend,provenance,state,complete'||wire.encoding!==ENCODING||wire.legend!==LEGEND||wire.complete!==PACKED_COMPLETE)
    fail('unknown/noncanonical encoding envelope');
  if(JSON.stringify(wire).length>MAX_CHARS)fail(`budget: canonical packed checkpoint exceeds ${MAX_CHARS}`);
  if(!Array.isArray(wire.provenance)||wire.provenance.length>542||wire.provenance.some(v=>typeof v!=='string'||!v.trim()||v.length>120))fail('invalid provenance dictionary');
  checkCollections(wire.state);
  const state=structuredClone(wire.state);
  const value=(i,max)=>{
    if(!Number.isSafeInteger(i)||i<0||i>=wire.provenance.length)fail('invalid provenance index');
    const v=wire.provenance[i];if(v.length>max)fail('provenance exceeds its destination field bound');return v;
  };
  for(const row of state.relations)row.basis=value(row.basis,120);
  for(const group of ['ledger','plans','directives'])for(const row of state[group]){
    row.source=value(row.source,120);
    if(group==='ledger'){
      if(!Array.isArray(row.holders)||row.holders.length>12)fail('invalid holders');
      row.holders=row.holders.map(h=>{
        if(!Array.isArray(h)||h.length!==3)fail('holder tuple must be [who,stance,viaIndex]');
        return {who:h[0],stance:h[1],via:value(h[2],80)};
      });
    }
  }
  if(!equal(packCheckpoint(state),wire))fail('dictionary/tuples are not the exact deterministic encoding');
  return state;
}
export function storageForm(state){
  // A compact format is used only for larger valid-shaped snapshots when useful.
  // Validation still runs independently; malformed state is never repaired here.
  const raw=JSON.stringify(state);
  if(raw.length<=16000)return state;
  const packed=packCheckpoint(state);
  return JSON.stringify(packed).length<raw.length?packed:state;
}
export const storedCharacters=input=>JSON.stringify(storedValue(input)).length;
