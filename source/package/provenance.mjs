export const PROVENANCE_POLICY='legacy-provenance-v1';
const ORIGIN='[uacpl]_[a-f0-9]{16}\\.[a-f0-9]{8}';
const TRACE=new RegExp(`^(${ORIGIN}): ([\\s\\S]+)$`);
const VIA=new RegExp(`^((?:observed|claim|inferred|self|canon|author_correction|disclosed/[a-z0-9][a-z0-9_-]{0,79}) ${ORIGIN}): ([\\s\\S]+)$`);
const groups=['relations','ledger','plans','directives'];
const key=(group,row)=>group==='relations'?`${row.from}>${row.to}`:row.id;

// Recognize only the exact former formatter, within that field's original cap.
// An origin+chunk hash is preserved literally, including a via route/sender.
// This does not authenticate the old quote, reconstruct its full source, grant
// new evidence authority, or infer the creation version of the record.
export function normalizedLegacyTrace(value,via=false){
  if(typeof value!=='string'||value.length>(via?80:120))return value;
  const match=value.match(via?VIA:TRACE);
  return match&&match[2].trim()?match[1]:value;
}

function matchingFields(state,base,visit){
  if(!base)return;
  for(const group of groups)for(const old of base[group]??[]){
    const row=state[group]?.find(x=>key(group,x)===key(group,old));if(!row)continue;
    const ref=`${group}:${key(group,old)}`,field=group==='relations'?'basis':'source';
    visit(row,field,old[field],false,ref,field);
    if(group==='ledger')for(const prior of old.holders){
      const holder=row.holders?.find(h=>h.who===prior.who&&h.stance===prior.stance);
      if(holder)visit(holder,'via',prior.via,true,ref,`holders:${prior.who}.via`);
    }
  }
}

export function provenanceDifference(base,state){
  const changes=[];
  matchingFields(state,base,(row,field,before,via,ref,path)=>{
    const after=normalizedLegacyTrace(before,via);
    if(after!==before&&row[field]===after)changes.push({ref,path,before,after});
  });
  return {policy:PROVENANCE_POLICY,fields:changes.length,records:new Set(changes.map(x=>x.ref)).size,
    valueCharacters:changes.reduce((n,x)=>n+x.before.length-x.after.length,0),
    serializedCharacters:changes.reduce((n,x)=>n+JSON.stringify(x.before).length-JSON.stringify(x.after).length,0)};
}

// Work on the prospective checkpoint only. The exact raw baseline remains the
// predecessor and race-check input. New/currently edited provenance is excluded.
// Host-created receipts use the EXISTING validator and existing 48-receipt cap.
// If the complete operation cannot validate, the whole transaction is rejected.
export function maintainLegacyProvenance(candidate,base){
  const state=structuredClone(candidate),changed=new Map();
  matchingFields(state,base,(row,field,before,via,ref,path)=>{
    if(row[field]!==before)return;
    const after=normalizedLegacyTrace(before,via);if(after===before)return;
    row[field]=after;
    if(!changed.has(ref))changed.set(ref,[]);
    changed.get(ref).push({path,before,after});
  });
  for(const [ref]of changed){
    if(state.changes.some(r=>r.ref===ref))continue;
    state.changes.push({ref,why:'Normalize legacy provenance.',replacement:[],
      evidence:`host:${PROVENANCE_POLICY}`});
  }
  return {state,report:provenanceDifference(base,state)};
}
