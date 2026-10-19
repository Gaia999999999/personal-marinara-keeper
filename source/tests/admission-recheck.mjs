import test from 'node:test';import assert from 'node:assert/strict';
import {baseline,context} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {admissionReview} from '../package/admission.mjs';
const agent={id:'rc3-recheck',type:PACKAGE_ID,phase:'post_processing',settings:{contextSize:24,jsonContextOutput:false}},rt=makeRuntime();
const cues=(text,kind='user')=>admissionReview([{id:'E1',origin:'u',kind,current:true,text}]).cues;
const empty=p=>({turn:p.turn,through:'Current scene recorded.',scene:null,changes:[],access:[],complete:true});
async function fixture(user,reply='Bea waits by the door.'){
 const b=baseline();b.cast[0].now='The kit rests on the crate.';
 const c={...context(user,reply),loadPreviousOutput:async()=>b},p=await rt.prepareContext({agent,context:c});assert(!p.blocked,p.blocked);
 return {b,c,p,ids:p.sources.filter(s=>s.current&&s.kind==='user').map(s=>s.id)};
}
function move(p,ids,fact='The kit rests on the bench.'){
 const t=empty(p);t.changes=[{op:'set',ref:'cast:alex',data:{now:'Standing by the doorway.'},evidence:ids},{op:'set',ref:'ledger:kit_new',data:{kind:'state',fact,truth:'established'},evidence:ids}];
 t.access=[{ref:'ledger:kit_new',who:['alex'],stance:'knows',route:'self',from:null,evidence:ids}];return t;
}
for(const text of ['I set the kit down, not on the wet floor.','I set the kit not on the wet floor.','I put the kit down, never on the wet floor.'])test('S2 denied prepositional destination creates no placement obligation: '+text,()=>assert.deepEqual(cues(text),[]));
for(const text of ['Did I set the kit on the bench; or did Bea?','Do I put the kit on the bench; or on the crate?','Bea asks, "Did I set the kit on the bench; or did you?"'])test('S5 auxiliary-led question before semicolon creates no placement obligation: '+text,()=>assert.deepEqual(cues(text),[]));
for(const text of ['Is the case seal intact; or has it been broken?','Bea asks: Did you read the asset sticker GL-09; or ZX-17?'])test('S5 assistant question prefix cannot become a seal/inspection finding: '+text,()=>assert.deepEqual(cues(text,'assistant'),[]));
for(const [name,user,fact]of [['S2','I set the kit down, not on the wet floor.','The kit rests on the wet floor.'],['S5','Did I set the kit on the bench; or did Bea?','The kit rests on the bench.']])test(name+' full custody transaction rejects atomically, retains baseline, then accepts a supported proposal',async()=>{
 const {b,c,p,ids}=await fixture(user),t=move(p,ids,fact),before=JSON.stringify({b,p,t});
 assert.throws(()=>commitTransaction(t,p),/still-current custody/);assert.equal(JSON.stringify({b,p,t}),before);
 const r=await rt.finalizeResult({agent,context:c,preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});assert.equal(r.success,false);assert.match(r.error,/Saved revision 1 retained/);assert.equal(r.data.keeperStatus,undefined);assert.equal(JSON.stringify({b,p,t}),before);
 // A no-change proposal preserves the known location without fabricating a move.
 const s=commitTransaction(empty(p),p);assert.deepEqual(s.cast,b.cast);assert.deepEqual(s.ledger,b.ledger);assert.deepEqual(s.plans,b.plans);assert.deepEqual(s.directives,b.directives);
 // A later actual placement can still authorize its own move and separate audience.
 const valid=await fixture('I set the kit on the dry shelf.');const next=commitTransaction(move(valid.p,valid.ids,'The kit rests on the dry shelf.'),valid.p);assert.equal(next.revision,2);assert.deepEqual(next.cast.slice(1),valid.b.cast.slice(1));assert.deepEqual(next.ledger.slice(0,valid.b.ledger.length),valid.b.ledger);assert.deepEqual(next.plans,valid.b.plans);assert.deepEqual(next.directives,valid.b.directives);assert.deepEqual(next.ledger.at(-1).holders.map(x=>x.who),['alex']);assert.deepEqual(next.ledger.at(-1).not_known_by,[]);
});
test('S2/S5 split source chunks keep negation and interrogative prefix in scope',()=>{
 for(const [first,last,kind]of [['I set the kit down, not','on the wet floor.','user'],['Did I set the kit','on the bench; or did Bea?','user'],['Bea asks, "Is the case seal','intact; or torn?"','assistant']]){
  assert.deepEqual(admissionReview([{id:'E1',origin:'x',kind,current:true,text:first},{id:'E2',origin:'x',kind,current:true,text:last}]).cues,[]);
 }
});
test('S5 a later question must not suppress a preceding completed placement or observation',()=>{
 assert.deepEqual(cues('I set the kit on the bench; did Bea see?').map(x=>x.anchors),[['kit','bench']]);
 assert.deepEqual(cues('The case seal is intact; could the storm worsen?','assistant').map(x=>x.family),['seal']);
 assert.deepEqual(cues('You read the serial number ZX-17; is that the right part?','assistant').map(x=>x.family),['inspection']);
});
test('S2 actual placement followed by separate denial retains its positive destination',()=>{
 const c=cues('I set the kit on the bench; I did not set it on the wet floor.');assert.equal(c.length,1);assert.deepEqual(c[0].anchors,['kit','bench']);
});
test('S5 ordinary subject-led condition/abbreviation and fresh affirmative sentences remain recognized',()=>{
 assert.equal(cues('Bea says: If Riley does not rouse, request evacuation.','assistant')[0].family,'evacuation');
 assert.equal(cues('Dr. Vale confirms the case seal is intact.','assistant')[0].family,'seal');
 assert.equal(cues('Did I set the kit down? I set the kit on the dry shelf.')[0].family,'placement');
});
test('current question or denial cannot be used for advance instead of set',async()=>{
 for(const user of ['I set the kit down, not on the bench.','Did I set the kit on the bench; or did Bea?']){
  const {b,c}=await fixture(user);b.ledger.push({id:'kit_old',kind:'state',fact:'The kit rests on the crate.',truth:'established',source:'Prior accepted action.',holders:[{who:'alex',stance:'knows',via:'Prior self action.'}],not_known_by:['clara']});
  const p=await rt.prepareContext({agent,context:c}),ids=p.sources.filter(x=>x.current&&x.kind==='user').map(x=>x.id),t=move(p,ids);t.changes[1].op='advance';t.changes[1].ref='ledger:kit_old';t.access[0].ref='ledger:kit_old';const before=JSON.stringify(b);assert.throws(()=>commitTransaction(t,p),/still-current custody/);assert.equal(JSON.stringify(b),before);
 }
});
test('changed question scope cannot convert OOC into in-world access or invent exclusions',async()=>{
 const {p}=await fixture('<ooc>The kit rests on the bench. Alex knows from the historical placement; grant nobody else access.</ooc>','Acknowledged.');const ids=p.sources.filter(s=>s.current&&s.kind==='author').map(s=>s.id),t=move(p,ids);assert.throws(()=>commitTransaction(t,p),/in-world route requires current/);
 t.access=[{ref:'ledger:kit_new',who:['clara'],stance:'excluded',route:'self',from:null,evidence:ids}];assert.throws(()=>commitTransaction(t,p),/in-world route requires current|exclusions need author/);
});
