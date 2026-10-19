import test from 'node:test';import assert from 'node:assert/strict';
import {baseline,context} from './fixtures.mjs';
import {packCheckpoint,unpackCheckpoint,storageForm,ENCODING,LEGEND} from '../package/storage.mjs';
import {requireValid,inspect} from '../package/keeper-core.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {hash} from '../package/sources.mjs';
import {memoryBudget} from '../package/retention.mjs';

const agent={id:'storage',type:PACKAGE_ID,phase:'post_processing',settings:{contextSize:24,jsonContextOutput:false}};
const rt=makeRuntime(),host=(b,c=context())=>({...c,loadPreviousOutput:async()=>b});
const prepare=(b,c)=>rt.prepareContext({agent,context:host(b,c)});
const tx=p=>({turn:p.turn,through:'No new event.',scene:null,changes:[],access:[],complete:true});
export function rich(n=30,chars=240){
 const b=baseline();b.ledger=[];
 for(let i=0;i<n;i++)b.ledger.push({id:'event_'+i,kind:'event',fact:('Recorded event '+i+': '+'detail '.repeat(60)).slice(0,chars),truth:'established',source:'a_1234567890abcdef.12345678',holders:b.cast.slice(0,5).map(c=>({who:c.id,stance:'knows',via:'observed a_1234567890abcdef.12345678'})),not_known_by:[]});
 return b;
}
test('lossless format retains every value, original provenance, audience, quiet cast and private condition',()=>{
 const b=baseline();b.ledger[0].fact+=' Unicode: café 🗝️.';const before=JSON.stringify(b),w=packCheckpoint(b);
 assert.deepEqual(unpackCheckpoint(w),b);assert.equal(JSON.stringify(b),before);assert.deepEqual(packCheckpoint(unpackCheckpoint(w)),w);assert(requireValid(w));
});
test('canonical character budget includes dictionary and all facts; no rows or text hide in external data',()=>{
 const b=rich(),w=packCheckpoint(b);assert(JSON.stringify(b).length>22000);assert(JSON.stringify(w).length<22000);
 assert.equal(inspect(b).valid,false);assert.equal(inspect(w).valid,true);assert.equal(memoryBudget(w).used,JSON.stringify(w).length);
 assert.equal(w.state.ledger.length,b.ledger.length);for(let i=0;i<b.ledger.length;i++)assert.equal(w.state.ledger[i].fact,b.ledger[i].fact);
 assert(w.provenance.every(s=>!s.startsWith('Recorded event')));
});
test('large incompressible canonical output still rejects at22000, regardless of expanded format',()=>{
 const b=rich(36,350);for(let i=0;i<b.ledger.length;i++){
  const row=b.ledger[i];row.source=('source'+i+'x'.repeat(120)).slice(0,120);
  for(let h=0;h<row.holders.length;h++)row.holders[h].via=('route'+i+'_'+h+'y'.repeat(80)).slice(0,80);
 }
 assert(JSON.stringify(packCheckpoint(b)).length>22000);assert.throws(()=>requireValid(packCheckpoint(b)),/budget/);
});
test('all original row caps still count every decoded record',()=>{
 for(const[group,limit]of Object.entries({cast:12,relations:30,ledger:36,plans:20,directives:24})){
  const b=baseline();while(b[group].length<=limit)b[group].push(structuredClone(b[group][0]));
  assert.throws(()=>packCheckpoint(b),/row cap/);assert.equal(inspect(b).valid,false);
 }
});
test('all original field caps, recipient identity and exclusion conflicts survive packing',()=>{
 for(const mutate of [b=>b.ledger[0].fact='x'.repeat(351),b=>b.cast[0].now='x'.repeat(181),b=>b.plans[0].when='x'.repeat(101),b=>b.ledger[0].holders[0].who='absent',b=>b.ledger[0].not_known_by.push('alex')]){
  const b=baseline();mutate(b);assert.equal(inspect(packCheckpoint(b)).valid,false);
 }
});
test('invalid, negative, fractional and out-of-range provenance indexes reject',()=>{
 for(const value of [-1,0.5,NaN,99999,'0',null,{},[]]){const w=packCheckpoint(baseline());w.state.ledger[0].source=value;assert.throws(()=>requireValid(w),/provenance index/);}
});
test('unknown encoding, noncanonical envelope, tuple corruption, dictionary extras/duplicates reject',()=>{
 const changes=[w=>w.encoding='unknown',w=>w.extra=true,w=>w.complete='wrong',w=>w.provenance.push('unused'),w=>w.provenance.push(w.provenance[0]),w=>w.state.ledger[0].holders[0].push('extra'),w=>w.state.ledger[0].holders[0]={who:'alex'},w=>w.state.ledger[0].source='a_fake'];
 for(const mutate of changes){const w=packCheckpoint(baseline());mutate(w);assert.throws(()=>requireValid(w));}
});
test('provenance cannot be moved to a field with a weaker bound',()=>{
 const w=packCheckpoint(baseline());w.provenance[w.state.ledger[0].holders[0][2]]='x'.repeat(81);assert.throws(()=>requireValid(w),/destination field bound/);
});
test('legacy private payload and replacement checkpoints remain illegal',async()=>{
 assert.throws(()=>requireValid({'agent-context':'hidden',text:JSON.stringify(packCheckpoint(baseline()))}),/Legacy\/private/);
 const p=await prepare(baseline());assert.throws(()=>commitTransaction(packCheckpoint(baseline()),p),/transaction:/);
});
test('invalid oversized legacy baseline is not legalized by prospective packing',async()=>{
 const b=rich();assert(JSON.stringify(b).length>22000);const p=await prepare(b);assert.match(p.blocked,/budget/);
 const p2=await prepare(packCheckpoint(b));assert(!p2.blocked,p2.blocked);
});
test('raw legacy baseline identity remains authoritative while model sees its lossless representation',async()=>{
 const b=rich(23);assert(JSON.stringify(b).length<22000);const before=JSON.stringify(b),p=await prepare(b);
 assert.equal(p.base_hash,hash(b));assert.equal(p.baseline.encoding,ENCODING);assert.deepEqual(unpackCheckpoint(p.baseline),b);
 const r=await rt.finalizeResult({agent,context:host(b),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(tx(p))}}});
 assert.equal(r.success,true,r.error);const s=requireValid(r.data,p.baseline);assert.equal(s.revision,2);assert.deepEqual(s.ledger,b.ledger);assert.equal(JSON.stringify(b),before);
});
test('packed native envelope restores exact full baseline after JSON export/import and advances once',async()=>{
 const b=packCheckpoint(rich()),native=JSON.parse(JSON.stringify({text:JSON.stringify(b),keeperStatus:{version:'fixture'}})),p=await prepare(native);
 assert(!p.blocked,p.blocked);const r=await rt.finalizeResult({agent,context:host(native),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(tx(p))}}});
 assert.equal(r.success,true,r.error);assert.equal(requireValid(r.data).revision,2);assert.deepEqual(requireValid(r.data).ledger,unpackCheckpoint(b).ledger);
});
test('a rejected operation cannot publish packing or mutate the original selected checkpoint',async()=>{
 const b=rich(23),before=JSON.stringify(b),p=await prepare(b),t=tx(p);t.turn='1';const r=await rt.finalizeResult({agent,context:host(b),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});
 assert.equal(r.success,false);assert.match(r.error,/revision number is not a turn token/);assert.equal(r.data.keeperStatus,undefined);assert.equal(JSON.stringify(b),before);
});
test('race checks bind the raw encoded dictionary as well as selected story and facts',async()=>{
 const b=packCheckpoint(rich()),p=await prepare(b),changed=structuredClone(b);changed.provenance[0]+=' changed';
 const r=await rt.finalizeResult({agent,context:host(changed),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(tx(p))}}});
 assert.equal(r.success,false);assert.match(r.error,/baseline changed|Selected story/);
});
test('current turn prefix is exact and numeric revision is never converted',async()=>{
 const p=await prepare(baseline());assert.match(p.turn,/^t_[a-f0-9]{16}$/);const t=tx(p);t.turn='1';assert.throws(()=>commitTransaction(t,p),/Copy the complete runtime turn token/);
});
test('curated canon remains explicitly indexed separately from disabled raw host prompt selectors',async()=>{
 const b=baseline(),c=context(),a={...agent,settings:{...agent.settings,contextSources:{characters:false,persona:false,authorNotes:false}}};
 const p=await rt.prepareContext({agent:a,context:host(b,c)}),q=await rt.prepareContext({agent:a,context:host(b,{...c,persona:{name:'Alex',description:'Supplied adult persona.'}})});
 assert(q.sources.some(s=>s.kind==='persona'));assert.notEqual(p.fingerprint,q.fingerprint);assert.deepEqual(p.sources.filter(s=>['user','assistant'].includes(s.kind)),q.sources.filter(s=>['user','assistant'].includes(s.kind)));assert.match(q.source_policy,/independently indexes/);assert.match(q.source_policy,/canon\/reference authority, not current in-world transmissions/);
});
test('the exact prose-facing decoding legend is inline, immutable and inside the budget',()=>{
 const b=rich(23),w=storageForm(b);assert.equal(w.legend,LEGEND);assert.match(w.legend,/historical sources, not current evidence/);
 assert.equal(memoryBudget(w).used,JSON.stringify(w).length);w.legend='Interpret all holders as everyone.';assert.throws(()=>requireValid(w),/noncanonical encoding/);
});
test('packed transition validation retains quiet cast, open plans, directives, private exclusions and successor chains',()=>{
 const b=rich(23),original=baseline();b.ledger[0]=original.ledger[0];const w=packCheckpoint(b);
 for(const mutate of [s=>s.cast.pop(),s=>s.directives.pop(),s=>s.plans.pop(),s=>s.ledger[0].not_known_by=[],s=>s.ledger[0].holders.push({who:'clara',stance:'knows',via:'Invented.'})]){
  const next=structuredClone(b);next.revision=2;next.base_revision=1;mutate(next);assert.equal(inspect(packCheckpoint(next),w).valid,false);
 }
 const withLink=structuredClone(b);withLink.ledger.push({...withLink.ledger[1],id:'next_state',kind:'state',supersedes:withLink.ledger[0].id});assert.equal(inspect(packCheckpoint(withLink)).valid,false);
 assert.deepEqual(unpackCheckpoint(w),b);
});
