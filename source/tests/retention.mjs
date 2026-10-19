// Synthetic checks. Handcrafted transactions prove runtime behavior, not model compliance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,context,prepare,delta,evidence} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {applyDelta,inspect} from '../package/keeper-core.mjs';
import {memoryBudget,retentionReview,ROW_LIMITS} from '../package/retention.mjs';
import {hash,sourceNote} from '../package/sources.mjs';

const agent={id:'retention-fixture',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const runtime=makeRuntime();
const host=(ctx,b)=>({...ctx,loadPreviousOutput:async()=>b});
const prep=(b,ctx)=>runtime.prepareContext({agent,context:host(ctx,b)});
const tx=p=>({turn:p.turn,through:'Current choices recorded.',scene:null,changes:[],access:[],complete:true});
const ch=(ref,data,evidence,op='set')=>({op,ref,data,evidence});
const ac=(ref,who,evidence,route='observed',stance='knows',from=null)=>({ref,who,evidence,route,stance,from});
const ev=(p,kind,text='')=>{const s=p.sources.find(s=>s.current&&s.kind===kind&&s.text.includes(text));assert(s,`${kind}: ${text}`);return [s.id];};
const next=(ctx,n,user,reply)=>({...ctx,recentMessages:[...ctx.recentMessages,{id:`a${n}`,role:'assistant',content:ctx.mainResponse},{id:`u${n+1}`,role:'user',content:user}],mainResponse:reply});

test('budget reports actual canonical size and existing caps without mutating memory',()=>{
 const b=baseline(),before=JSON.stringify(b),x=memoryBudget(b);
 assert.equal(x.used,before.length);assert.equal(x.remaining,22000-before.length);assert.equal(x.max,22000);assert.equal(x.target,16000);
 assert.equal(x.pressure,'normal');assert.equal(x.counts.ledger,b.ledger.length);assert.equal(x.row_limits.ledger,36);
 x.row_limits.ledger=999;assert.equal(ROW_LIMITS.ledger,36);assert.equal(memoryBudget(b).row_limits.ledger,36);assert.equal(JSON.stringify(b),before);
});
test('tight budget is visible at the target without authorizing removal or raising caps',()=>{
 const b=baseline();let n=0;
 while(memoryBudget(b).used<16000)b.ledger.push({id:`reference_${n++}`,kind:'reference',fact:'The service bridge remains open only to pedestrians until the inspector returns with a signed assessment. '.repeat(3),truth:'established',source:'Earlier accepted inspection.',holders:[],not_known_by:[]});
 assert(inspect(b).valid);const x=memoryBudget(b);assert.equal(x.pressure,'tight');assert.equal(x.max,22000);assert.equal(x.row_limits.ledger,36);
});
test('fresh initialization has empty retention refs and a full unchanged budget',()=>{
 assert.equal(memoryBudget(null).used,0);assert.equal(memoryBudget(null).remaining,22000);
 const x=retentionReview(null);assert.deepEqual(x.prior_now_refs,[]);assert.deepEqual(x.unresolved_plan_refs,[]);
});
test('review identifies quiet current-status fields and unresolved plans without rewriting them',()=>{
 const b=baseline();b.plans.push({...b.plans[0],id:'finished',status:'completed'});
 const before=JSON.stringify(b),review=retentionReview(b);
 assert(review.prior_now_refs.includes('cast:erin'));assert.deepEqual(review.unresolved_plan_refs,['plans:riley']);
 assert(review.transient_fields.includes('cast.now'));assert.equal(JSON.stringify(b),before);
});
test('new provenance retains exact stable source IDs and eliminates copied quote fragments',async()=>{
 const b=baseline(),ctx=context('I alone place the blue kit in the locked rear compartment. Bea stays outside.','Bea asks Alex to watch the lane; Clara remains upstairs.'),p=await prep(b,ctx),t=tx(p),ids=ev(p,'user','blue kit');
 t.changes=[ch('ledger:kit',{kind:'state',fact:'The blue kit is secured in the locked rear compartment.',truth:'established'},ids)];
 t.access=[ac('ledger:kit',['alex'],ids,'self')];
 const s=commitTransaction(t,p),row=s.ledger.at(-1),src=p.sources.find(x=>x.id===ids[0]),id=`${src.origin}.${hash(src.text).slice(0,8)}`;
 assert.equal(row.source,id);assert.equal(row.holders[0].via,`self ${id}`);assert(!row.source.includes('blue kit'));
 const legacySource=`${id}: ${src.text}`.slice(0,120),legacyVia=`self ${legacySource}`.slice(0,80);
 assert(row.source.length+row.holders[0].via.length<legacySource.length+legacyVia.length);
 for(const old of b.ledger)assert.deepEqual(s.ledger.find(r=>r.id===old.id),old);
});
test('compact source traces do not bypass the literal evidence quote check',()=>{
 const p=prepare(),t=delta(p),proof=evidence(p,'assistant');proof.quote='A fabricated unobserved event.';
 t.updates=[{group:'cast',id:'bea',set:{now:'At the lane.'},evidence:proof,reason:'Scene change.'}];
 const before=JSON.stringify(p.baseline);assert.throws(()=>applyDelta(t,p),/quote is absent/);assert.equal(JSON.stringify(p.baseline),before);
});
test('source identity is not silently truncated when a supplied bound is too short',()=>{
 assert.equal(sourceNote({source:'a_1234567890abcdef.12345678',quote:'Checked excerpt.'}),'a_1234567890abcdef.12345678');
 assert.throws(()=>sourceNote({source:'long_source',quote:'Checked excerpt.'},3),/identity exceeds/);
});
test('recognized legacy suffixes normalize with a receipt while all domain values survive a quiet update',async()=>{
 const b=baseline();b.ledger[0].source='a_1234567890abcdef.12345678: A previous literal excerpt.';
 const p=await prep(b,context()),s=commitTransaction(tx(p),p);
 const expected=structuredClone(b);expected.ledger[0].source='a_1234567890abcdef.12345678';
 for(const g of ['cast','relations','ledger','plans','directives'])assert.deepEqual(s[g],expected[g]);
 assert.equal(s.changes.find(x=>x.ref==='ledger:door').evidence,'host:legacy-provenance-v1');assert.equal(inspect(s,b).valid,true);
});
test('custody and a conditional private proposal survive three subsequent status changes',async()=>{
 const b=baseline();let ctx=context('I alone secure the blue kit in the rear compartment. I privately propose a talk with Bea after finding Riley, only if safe, while Clara helps Riley.','Bea answers with a joke, without agreeing, then asks Alex to watch the lane. Clara cannot hear their exchange.');
 let p=await prep(b,ctx),t=tx(p);const ids=ev(p,'user');
 t.changes=[ch('cast:alex',{now:'At the vehicle; the lane-watch request awaits his response.'},ev(p,'assistant')),
   ch('ledger:kit_location',{kind:'state',fact:'The blue kit is secured in the rear compartment.',truth:'established'},ids),
   ch('plans:private_talk',{actor:'alex',action:'Privately talk with Bea; her agreement remains unresolved.',when:'After finding Riley, only if safe, while Clara helps Riley.',where:null,status:'proposed',known_by:['alex','bea']},ids)];
 t.access=[ac('ledger:kit_location',['alex'],ids,'self')];
 let s=commitTransaction(t,p);const custody=structuredClone(s.ledger.at(-1)),plan=structuredClone(s.plans.at(-1));
 for(let n=2;n<=4;n++){
   ctx=next(ctx,n,'I watch the lane and report it clear.','Bea continues driving. No handoff, plan amendment or new disclosure occurs.');
   p=await prep(s,ctx);t=tx(p);t.changes=[ch('cast:alex',{now:'Watching the lane from the vehicle.'},ev(p,'user'))];
   const nextState=commitTransaction(t,p);assert(inspect(nextState,s).valid);s=nextState;
   assert.deepEqual(s.ledger.find(r=>r.id==='kit_location'),custody);assert.deepEqual(s.plans.find(r=>r.id==='private_talk'),plan);
   assert.equal(s.ledger.length,b.ledger.length+1);assert.equal(s.plans.length,b.plans.length+1);
   assert.deepEqual(s.cast.find(r=>r.id==='erin'),b.cast.find(r=>r.id==='erin'));
 }
 assert(!plan.known_by.includes('clara'));assert.equal(plan.status,'proposed');
});
test('a private amendment updates one plan while preserving unrelated conditions',async()=>{
 const b=baseline();b.plans.push({id:'private_talk',actor:'alex',action:'Privately talk with Bea; her agreement remains unresolved.',when:'After finding Riley, only if safe.',where:'At the shelter.',status:'proposed',known_by:['alex','bea'],source:'Earlier private proposal.'});
 const ctx=context('I privately tell Bea: keep the same proposal, only if safe, but after we return to the shelter.','Bea jokes without agreeing. Clara is absent.'),p=await prep(b,ctx),t=tx(p);
 t.changes=[ch('plans:private_talk',{when:'After returning to the shelter, only if safe.'},ev(p,'user'))];
 const s=commitTransaction(t,p),r=s.plans.at(-1);assert.equal(r.status,'proposed');assert.deepEqual(r.known_by,['alex','bea']);assert.equal(r.where,'At the shelter.');assert.equal(r.action,b.plans.at(-1).action);assert.deepEqual(s.plans[0],b.plans[0]);
});
test('retention hints cannot be cited or make old evidence current',async()=>{
 const b=baseline(),p=await prep(b,context()),before=JSON.stringify(b),t=tx(p);
 t.changes=[ch('ledger:kit',{kind:'state',fact:'A kit was secured earlier.',truth:'established'},[p.retention_review.prior_now_refs[0]])];
 assert.throws(()=>commitTransaction(t,p),/unknown or wrong-scope/);
 t.changes[0].evidence=[p.sources.find(s=>s.kind==='user'&&!s.current).id];
 assert.throws(()=>commitTransaction(t,p),/old overlapping/);assert.equal(JSON.stringify(b),before);
});
test('author correction restores omitted custody without granting fictional witnesses',async()=>{
 const b=baseline(),ctx=context('<ooc>OOC: Restore omitted memory: Alex earlier secured the blue kit in the rear compartment. Only Alex has established access. Do not advance the scene.</ooc>','Acknowledged.'),p=await prep(b,ctx),t=tx(p),ids=ev(p,'author');
 t.changes=[ch('ledger:kit_location',{kind:'state',fact:'The blue kit is secured in the rear compartment.',truth:'established'},ids,'correct')];
 t.access=[ac('ledger:kit_location',['alex'],ids,'author_correction')];
 const s=commitTransaction(t,p);assert.equal(s.scene,b.scene);assert.deepEqual(s.cast,b.cast);assert.deepEqual(s.ledger.at(-1).holders.map(h=>h.who),['alex']);
 t.access[0].route='observed';assert.throws(()=>commitTransaction(t,p),/OOC is not in-world transmission/);
});
test('retention guidance does not turn an overlong scene into a partial save',async()=>{
 const b=baseline(),ctx=host(context(),b),p=await runtime.prepareContext({agent,context:ctx}),t=tx(p),before=JSON.stringify(b);
 t.scene='s'.repeat(243);t.changes=[ch('cast:alex',{now:'Watching the lane.'},ev(p,'user'))];
 const r=await runtime.finalizeResult({agent,context:ctx,preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});
 assert.equal(r.success,false);assert.match(r.error,/Saved revision 1 retained.*scene is 243 characters; maximum 240/);assert.equal(JSON.stringify(b),before);assert.equal(r.data.keeperStatus,undefined);
});
