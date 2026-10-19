import test from 'node:test';import assert from 'node:assert/strict';
import {baseline,context} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {admissionReview} from '../package/admission.mjs';

const agent={id:'admission',type:PACKAGE_ID,phase:'post_processing',settings:{contextSize:24,jsonContextOutput:false}},rt=makeRuntime();
const prep=(b,c)=>rt.prepareContext({agent,context:{...c,loadPreviousOutput:async()=>b}});
const empty=p=>({turn:p.turn,through:'Current scene recorded.',scene:null,changes:[],access:[],complete:true});
const ev=(p,kind,part)=>p.sources.filter(s=>s.current&&s.kind===kind&&s.text.includes(part)).map(s=>s.id);
const ledger=(id,fact,evidence)=>({op:'set',ref:'ledger:'+id,data:{kind:'state',fact,truth:'established'},evidence});
const changedNow=(text,ids)=>({op:'set',ref:'cast:alex',data:{now:text},evidence:ids});

test('new explicit placement must be durable while current; a temporary-status-only update rejects atomically',async()=>{
 const b=baseline(),before=JSON.stringify(b),c=context('I set the kit onto the dry bench, then turn to the door.','Bea watches the doorway.'),p=await prep(b,c),t=empty(p),ids=ev(p,'user','kit');
 t.changes=[changedNow('Kit rests on the dry bench.',ids)];assert.throws(()=>commitTransaction(t,p),/admission:placement/);assert.equal(JSON.stringify(b),before);
 t.changes.push(ledger('kit_position','The kit rests on the dry bench.',ids));const s=commitTransaction(t,p);assert.equal(s.ledger.at(-1).fact,'The kit rests on the dry bench.');
});
test('future placement and a question do not become a completed-placement obligation',()=>{
 for(const text of ['I will put the kit on the bench.','I would put the kit on the bench if allowed.','Could I put the kit on the bench?'])assert.equal(admissionReview([{id:'E1',origin:'u',kind:'user',current:true,text}]).cues.length,0);
});
test('old, author, canon and GM material cannot become new in-world admission evidence',()=>{
 const text='I set the kit on the bench. Its seal is intact. If Riley rouses, evacuate.';
 for(const kind of ['author','card','persona','lore','gm'])assert.equal(admissionReview([{id:'E1',origin:'x',kind,current:true,text}]).cues.length,0);
 assert.equal(admissionReview([{id:'E1',origin:'u',kind:'user',current:false,text}]).cues.length,0);
});
test('a seal discovery cannot be hidden only in through, scene or a cast note',async()=>{
 const b=baseline(),p=await prep(b,context('I wait.','Bea checks the case seal. It appears intact; no visible tampering.')),t=empty(p),ids=ev(p,'assistant','seal');
 t.through='The case seal is intact.';t.scene='Case seal intact.';t.changes=[changedNow('Watching the intact case seal.',ids)];assert.throws(()=>commitTransaction(t,p),/admission:seal/);
 t.changes.push(ledger('case_seal','The case seal appears intact; no visible tampering.',ids));assert.doesNotThrow(()=>commitTransaction(t,p));
});
test('an unrelated ledger row or irrelevant evidence does not satisfy a seal cue',async()=>{
 const p=await prep(baseline(),context('I hear a bell.','Bea checks the case seal. It appears intact.')),t=empty(p);
 t.changes=[ledger('bell','The bell rings.',ev(p,'assistant','seal'))];assert.throws(()=>commitTransaction(t,p),/admission:seal/);
 t.changes=[ledger('seal','The case seal appears intact.',ev(p,'user','bell'))];assert.throws(()=>commitTransaction(t,p),/admission:seal/);
});
test('already-durable matching seal observation does not require duplicate rows',async()=>{
 const b=baseline();b.ledger.push({id:'seal',kind:'state',fact:'The case seal appears intact.',truth:'established',source:'Earlier accepted inspection.',holders:[{who:'bea',stance:'knows',via:'Observed it.'}],not_known_by:[]});
 const p=await prep(b,context('I wait.','Bea checks the case seal. It still appears intact.'));assert.doesNotThrow(()=>commitTransaction(empty(p),p));
});
test('a concrete serial inspection requires a durable finding rather than a generic inspected status',async()=>{
 const p=await prep(baseline(),context('I look at the instrument.','You read the serial number ZX-17 on the instrument.')),t=empty(p),ids=ev(p,'assistant','serial');
 t.changes=[changedNow('Inspected the instrument.',ids)];assert.throws(()=>commitTransaction(t,p),/admission:inspection/);
 t.changes.push(ledger('instrument_serial','Alex read serial number ZX-17 on the instrument.',ids));assert.doesNotThrow(()=>commitTransaction(t,p));
});
test('conditional rescue instruction needs an actual conditional plan; status is insufficient',async()=>{
 const p=await prep(baseline(),context('I wait.','Bea says: If Riley rouses, we move together; otherwise wait until morning evacuation.')),t=empty(p),ids=ev(p,'assistant','rouses');
 t.changes=[changedNow('Waiting until Riley rouses.',ids)];assert.throws(()=>commitTransaction(t,p),/admission:evacuation/);
 t.changes.push({op:'set',ref:'plans:evac',data:{actor:'bea',action:'If Riley rouses, move together; otherwise wait until morning evacuation.',when:'Conditional on Riley rousing.',where:null,status:'intended',known_by:['bea','alex']},evidence:ids});
 const s=commitTransaction(t,p);assert.equal(s.plans.at(-1).status,'intended');assert.deepEqual(s.plans.at(-1).known_by,['bea','alex']);
});
test('an unconditional plan does not satisfy the recognized conditional evacuation cue',async()=>{
 const p=await prep(baseline(),context('I wait.','Bea says: If Riley rouses, we move together; otherwise wait until morning evacuation.')),t=empty(p);
 t.changes=[{op:'set',ref:'plans:evac',data:{actor:'bea',action:'Move together when Riley rouses.',when:null,where:null,status:'intended',known_by:['bea','alex']},evidence:ev(p,'assistant','rouses')}];assert.throws(()=>commitTransaction(t,p),/admission:evacuation/);
});
test('old object-led custody cannot evaporate when attention changes',async()=>{
 const b=baseline();b.cast[0].now='Near the door; the kit remains in the locked trunk.';const p=await prep(b,context()),t=empty(p);t.changes=[changedNow('Walking to the doorway.',ev(p,'assistant','entrance'))];
 assert.throws(()=>commitTransaction(t,p),/still-current custody/);t.changes[0].data.now='At the doorway; the kit remains in the locked trunk.';assert.doesNotThrow(()=>commitTransaction(t,p));
});
test('existing durable current custody allows foreground replacement; superseded custody does not',async()=>{
 const b=baseline();b.cast[0].now='The kit remains in the locked trunk.';const old={id:'kit',kind:'state',fact:'The kit remains in the locked trunk.',truth:'established',source:'Prior placement.',holders:[{who:'alex',stance:'knows',via:'Placed it.'}],not_known_by:[]};b.ledger.push(old);
 let p=await prep(b,context()),t=empty(p);t.changes=[changedNow('At the doorway.',ev(p,'assistant','entrance'))];assert.doesNotThrow(()=>commitTransaction(t,p));
 b.ledger.push({...old,id:'kit_new',fact:'The kit is on the roof.',supersedes:'kit'});p=await prep(b,context());t.turn=p.turn;assert.throws(()=>commitTransaction(t,p),/still-current custody/);
});
test('negation or conditional wrapping cannot fake retention of old custody',async()=>{
 const b=baseline();b.cast[0].now='The kit remains in the locked trunk.';const p=await prep(b,context());
 for(const now of ['The kit is not in the locked trunk.','If the kit remains in the locked trunk, wait.']){const t=empty(p);t.changes=[changedNow(now,ev(p,'assistant','entrance'))];assert.throws(()=>commitTransaction(t,p),/still-current custody/);}
});
test('a supported current custody advance can replace its previous temporary location',async()=>{
 const b=baseline();b.cast[0].now='The kit remains in the locked trunk.';b.ledger.push({id:'kit',kind:'state',fact:'The kit remains in the locked trunk.',truth:'established',source:'Prior action.',holders:[{who:'alex',stance:'knows',via:'Placed it.'}],not_known_by:[]});
 const p=await prep(b,context('I carry the kit to the roof.','Bea watches the door.')),t=empty(p),ids=ev(p,'user','kit');
 t.changes=[changedNow('Standing on the roof.',ids),{op:'advance',ref:'ledger:kit',data:{fact:'The kit is now on the roof with Alex.'},evidence:ids}];t.access=[{ref:'ledger:kit',who:['alex'],stance:'knows',route:'self',from:null,evidence:ids}];
 const s=commitTransaction(t,p);assert(s.ledger.some(x=>x.supersedes==='kit'));assert.deepEqual(s.ledger.find(x=>x.id==='kit'),b.ledger.find(x=>x.id==='kit'));
});
test('current explicit author correction is still required for clearing a custody status',async()=>{
 const b=baseline();b.cast[0].now='The kit remains in the locked trunk.';const p=await prep(b,context('<ooc>Correct Alex: that kit-location note was erroneous. Remove the note; no new action or disclosure.</ooc>','Acknowledged.')),t=empty(p),ids=ev(p,'author','kit');
 t.changes=[{op:'correct',ref:'cast:alex',data:{now:'At the doorway.'},evidence:ids}];assert.doesNotThrow(()=>commitTransaction(t,p));
 t.changes[0].evidence=ev(p,'assistant','Acknowledged');assert.throws(()=>commitTransaction(t,p),/current explicit OOC/);
});
test('guard cues do not authorize author routes or fabricated exclusions',async()=>{
 const p=await prep(baseline(),context('I set the kit on the bench.','Bea waits outside.')),t=empty(p),ids=ev(p,'user','kit');t.changes=[ledger('kit','The kit rests on the bench.',ids)];
 t.access=[{ref:'ledger:kit',who:['clara'],stance:'excluded',route:'self',from:null,evidence:ids}];assert.throws(()=>commitTransaction(t,p),/exclusions need author\/canon/);
 t.access=[{ref:'ledger:kit',who:['alex'],stance:'knows',route:'author_correction',from:null,evidence:ids}];assert.throws(()=>commitTransaction(t,p),/author_correction needs current explicit OOC/);
});

test('planned serial reading is not reported as a completed inspection',()=>{
 for(const text of ['You will read the serial number ZX-17 tomorrow.','Bea plans to inspect the coupling for scarring.','The seal might still be intact.'])assert.equal(admissionReview([{id:'E1',origin:'a',kind:'assistant',current:true,text}]).cues.length,0);
});
test('a different serial number or bare object label cannot stand in for the observed finding',async()=>{
 const p=await prep(baseline(),context('I inspect it.','You read the serial number ZX-17 on the instrument.')),t=empty(p),ids=ev(p,'assistant','serial');
 t.changes=[ledger('serial','The serial number is ZX-99.',ids)];assert.throws(()=>commitTransaction(t,p),/admission:inspection/);
 const q=await prep(baseline(),context('I look.','The coupling shows fresh scarring.')),u=empty(q);u.changes=[ledger('inspection','Alex inspected the coupling.',ev(q,'assistant','coupling'))];assert.throws(()=>commitTransaction(u,q),/admission:inspection/);
});
test('opposite intact polarity cannot satisfy the recognized seal finding',async()=>{
 const b=baseline();b.ledger.push({id:'seal',kind:'state',fact:'The case seal is intact.',truth:'established',source:'Earlier accepted inspection.',holders:[{who:'bea',stance:'knows',via:'Observed it.'}],not_known_by:[]});
 const p=await prep(b,context('I wait.','Bea checks the seal. It is not intact.')),t=empty(p),ids=ev(p,'assistant','seal');
 assert.throws(()=>commitTransaction(t,p),/admission:seal/);t.changes=[{op:'advance',ref:'ledger:seal',data:{fact:'The case seal is not intact.'},evidence:ids}];assert.doesNotThrow(()=>commitTransaction(t,p));
});
test('negated rescue conditions cannot be satisfied by their positive opposite',async()=>{
 const p=await prep(baseline(),context('I wait.','Bea says: If Riley is not ambulatory by morning, request evacuation.')),t=empty(p),ids=ev(p,'assistant','ambulatory');
 t.changes=[{op:'set',ref:'plans:evac',data:{actor:'bea',action:'If Riley is ambulatory by morning, request evacuation.',when:null,where:null,status:'intended',known_by:['bea','alex']},evidence:ids}];assert.throws(()=>commitTransaction(t,p),/admission:evacuation/);
 t.changes[0].data.action='If Riley is not ambulatory by morning, request evacuation.';assert.doesNotThrow(()=>commitTransaction(t,p));
});
