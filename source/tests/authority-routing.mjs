// Promoted regressions from the live correction failure; synthetic names only.
// These exercise runtime behavior, not model compliance. No provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,context} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
const runtime=makeRuntime();
const agent={id:'review-authority',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const correction='OOC: Acknowledge only. Do not advance the scene.\n<ooc>Restore omitted continuity. Alex earlier secured the blue kit in the rear compartment and closed it. Keep this as its last confirmed stowage. Alex knows from doing it; grant nobody else access. Preserve the private talk proposed to Bea: after finding Riley, only if safe, while Clara helps Riley. It remains proposed and known only to Alex and Bea. Keep all other memory unchanged.</ooc>';
async function fixture(user=correction,reply='Acknowledged. The scene remains paused.'){
 const b=baseline(),ctx={...context(user,reply),loadPreviousOutput:async()=>b},p=await runtime.prepareContext({agent,context:ctx});assert(!p.blocked,p.blocked);
 const ids=p.sources.filter(s=>s.kind==='author'&&s.current).map(s=>s.id);
 const t={turn:p.turn,through:'Restored two omitted details; no fictional change.',scene:null,changes:[
  {op:'set',ref:'ledger:kit_stowage',data:{kind:'state',fact:'Alex secured the blue kit in the rear compartment.',truth:'established'},evidence:ids},
  {op:'set',ref:'plans:private_talk',data:{actor:'alex',action:'Privately talk with Bea.',when:'After finding Riley, only if safe, while Clara helps Riley.',status:'proposed',known_by:['alex','bea']},evidence:ids}
 ],access:[{ref:'ledger:kit_stowage',who:['alex'],stance:'knows',route:'self',from:null,evidence:ids}],complete:true};
 return {b,ctx,p,t,ids};
}
async function finalize(f,t=f.t){return runtime.finalizeResult({agent,context:f.ctx,preparedContext:f.p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});}
function oldMemoryUnchanged(s,b){assert.equal(s.scene,b.scene);for(const g of ['cast','relations','directives'])assert.deepEqual(s[g],b[g]);for(const g of ['ledger','plans'])for(const row of b[g])assert.deepEqual(s[g].find(x=>x.id===row.id),row);}

test('live failure shape: self with current OOC atomically rejects both proposed additions',async()=>{
 const f=await fixture(),before=JSON.stringify(f.b),prepBefore=JSON.stringify(f.p.baseline);
 assert(f.ids.length>1&&f.ids.length<=6);assert(f.p.sources.filter(s=>f.ids.includes(s.id)).map(s=>s.text).join(' ').includes('grant nobody else access')); // Recipient wording can straddle chunks.
 const r=await finalize(f);assert.equal(r.success,false);assert.match(r.error,/Saved revision 1 retained.*access\[0\] ledger:kit_stowage.*OOC is not in-world transmission/);
 assert.equal(r.data.keeperStatus,undefined);assert.equal(JSON.stringify(f.b),before);assert.equal(JSON.stringify(f.p.baseline),prepBefore);
});
test('explicit author route accepts paired restoration and omitted optional plan location',async()=>{
 const f=await fixture();f.t.access[0].route='author_correction';const r=await finalize(f);assert.equal(r.success,true,r.error);
 const s=JSON.parse(r.data.text);assert.equal(s.revision,2);assert.equal(s.base_revision,1);oldMemoryUnchanged(s,f.b);
 assert.deepEqual(s.ledger.at(-1).holders.map(h=>h.who),['alex']);assert.match(s.ledger.at(-1).holders[0].via,/^author_correction /);
 assert.deepEqual(s.plans.at(-1).known_by,['alex','bea']);assert.equal(s.plans.at(-1).status,'proposed');assert.equal(s.plans.at(-1).when,'After finding Riley, only if safe, while Clara helps Riley.');assert.equal(s.plans.at(-1).where,null);assert.equal(s.directives.length,f.b.directives.length);
});
test('rejected attempt does not consume the turn: corrected proposal uses the same baseline once',async()=>{
 const f=await fixture(),before=JSON.stringify(f.b);assert.equal((await finalize(f)).success,false);
 const corrected=structuredClone(f.t);corrected.access[0].route='author_correction';const accepted=await finalize(f,corrected);assert.equal(accepted.success,true,accepted.error);
 const saved=JSON.parse(accepted.data.text);assert.equal(saved.revision,2);assert.equal(JSON.stringify(f.b),before);
 const committedCtx={...f.ctx,loadPreviousOutput:async()=>saved},blocked=await runtime.prepareContext({agent,context:committedCtx});assert.match(blocked.blocked,/already committed/);
});
test('ordinary accepted first-person action keeps self legitimate and cannot use author authority',async()=>{
 const f=await fixture('I alone secure the blue kit in the rear compartment.','Bea remains outside; Clara stays upstairs.');
 const ids=f.p.sources.filter(s=>s.kind==='user'&&s.current).map(s=>s.id);f.t.changes=f.t.changes.slice(0,1);f.t.changes[0].evidence=ids;f.t.access[0].evidence=ids;
 const s=commitTransaction(f.t,f.p);assert.deepEqual(s.ledger.at(-1).holders.map(h=>h.who),['alex']);assert.match(s.ledger.at(-1).holders[0].via,/^self /);
 f.t.access[0].route='author_correction';assert.throws(()=>commitTransaction(f.t,f.p),/author_correction needs current explicit OOC/);
});
test('an extra invalid evidence ID still rejects an otherwise valid author repair atomically',async()=>{
 const f=await fixture(),before=JSON.stringify(f.b);f.t.access[0].route='author_correction';f.t.access[0].evidence.push('E999999');
 const r=await finalize(f);assert.equal(r.success,false);assert.match(r.error,/unknown or wrong-scope evidence E999999/);assert.equal(JSON.stringify(f.b),before);
});

test('authority diagnostic identifies every cited current author span without changing the proposal',async()=>{
 const f=await fixture(),proposal=JSON.stringify(f.t),before=JSON.stringify(f.b),r=await finalize(f);
 assert.equal(r.success,false);for(const id of f.ids)assert(r.error.includes(`${id}=current author`));
 assert.match(r.error,/use author_correction and cite the complete character\/audience clause/);assert.match(r.error,/Routes are not converted automatically/);
 assert.equal(JSON.stringify(f.t),proposal);assert.equal(JSON.stringify(f.b),before);
});
test('current-author reminder cannot be cited as evidence or alter the source catalog',async()=>{
 const f=await fixture(),before=JSON.stringify(f.b),sources=JSON.stringify(f.p.sources);
 assert.match(f.p.authority_reminder,/own earlier experience/);assert.match(f.p.authority_reminder,/adjacent spans/);
 assert.deepEqual(f.p.scene_boundary.current_author_source_ids,f.p.sources.filter(s=>s.kind==='author'&&s.current).map(s=>s.id));
 f.t.access[0].route='author_correction';f.t.access[0].evidence=['authority_reminder'];
 const r=await finalize(f);assert.equal(r.success,false);assert.match(r.error,/unknown or wrong-scope evidence authority_reminder/);assert.equal(JSON.stringify(f.p.sources),sources);assert.equal(JSON.stringify(f.b),before);
});
test('diagnostic distinguishes stale author evidence from current ordinary roleplay',async()=>{
 const f=await fixture(),first=structuredClone(f.t);first.access[0].route='author_correction';const b=commitTransaction(first,f.p);
 const ctx={...f.ctx,recentMessages:[...f.ctx.recentMessages,{id:'a2',role:'assistant',content:f.ctx.mainResponse},{id:'u3',role:'user',content:'I wait by the vehicle.'}],mainResponse:'Bea waits nearby.',loadPreviousOutput:async()=>b};
 const p=await runtime.prepareContext({agent,context:ctx}),old=p.sources.find(s=>s.kind==='author'&&!s.current),current=p.sources.find(s=>s.kind==='user'&&s.current);assert(old&&current);
 const t={turn:p.turn,through:'No fictional change.',scene:null,changes:[],access:[{ref:'ledger:kit_stowage',who:['clara'],stance:'knows',route:'author_correction',from:null,evidence:[old.id,current.id]}],complete:true};
 const before=JSON.stringify(b);assert.throws(()=>commitTransaction(t,p),e=>e.message.includes(`${old.id}=stale author`)&&e.message.includes(`${current.id}=current user`)&&/needs current explicit OOC/.test(e.message));assert.equal(JSON.stringify(b),before);
});

import {readFileSync} from 'node:fs';
test('complete shipped correction example validates against its declared split author spans',async()=>{
 const prompt=readFileSync(new URL('../Keeper_Prompt_v4.1.7-rc.1.txt',import.meta.url),'utf8');
 const section=prompt.split('COMPLETE AUTHOR CORRECTION EXAMPLE')[1].split('INITIALIZATION AND AUDIENCE EXAMPLES')[0];
 const declared=[...section.matchAll(/^(E6[1-4]): "([^\n]+)"$/gm)].map(m=>({id:m[1],text:m[2]}));assert.equal(declared.length,4);assert(declared.every(x=>x.text.length<=190));
 assert(declared[0].text.endsWith('Alex'));assert(declared[1].text.startsWith('knows from doing it'));assert(declared[3].text.includes('only to Alex and Bea'));
 const f=await fixture('<ooc>'+declared.map(x=>x.text).join(' ')+'</ooc>');
 const origin=f.p.sources.find(s=>s.kind==='author'&&s.current).origin;
 // This validates the exact documented symbolic example, not a model output.
 const p={...f.p,sources:declared.map(s=>({...s,kind:'author',current:true,origin}))};
 const t=JSON.parse(section.split('\n').find(line=>line.startsWith('{"turn"')));t.turn=p.turn;
 const s=commitTransaction(t,p);oldMemoryUnchanged(s,f.b);assert.deepEqual(s.ledger.at(-1).holders.map(h=>h.who),['alex']);assert.deepEqual(s.plans.at(-1).known_by,['alex','bea']);assert.equal(s.plans.at(-1).status,'proposed');
 assert.deepEqual(t.access[0].evidence,['E61','E62']);assert.deepEqual(t.changes[1].evidence,['E63','E64']);
});
