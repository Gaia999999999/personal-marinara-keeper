import test from 'node:test';import assert from 'node:assert/strict';
import {baseline,context} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {admissionReview} from '../package/admission.mjs';
const agent={id:'audit-rc2',type:PACKAGE_ID,phase:'post_processing',settings:{contextSize:24,jsonContextOutput:false}},rt=makeRuntime();
const prep=(b,c)=>rt.prepareContext({agent,context:{...c,loadPreviousOutput:async()=>b}});
const empty=p=>({turn:p.turn,through:'Current scene recorded.',scene:null,changes:[],access:[],complete:true});
const ev=(p,kind)=>p.sources.filter(s=>s.current&&s.kind===kind).map(s=>s.id);
const ledger=(id,fact,evidence,op='set')=>({op,ref:'ledger:'+id,data:{kind:'state',fact,truth:'established'},evidence});
const now=(text,ids)=>({op:'set',ref:'cast:alex',data:{now:text},evidence:ids});
const cues=(text,kind='user')=>admissionReview([{id:'E1',origin:'u',kind,current:true,text}]).cues;
const oldKit=()=>({id:'kit',kind:'state',fact:'The kit rests on the bench.',truth:'established',source:'Prior accepted placement.',holders:[{who:'alex',stance:'knows',via:'Placed it.'}],not_known_by:['clara']});
const plan=(action,ids)=>({op:'set',ref:'plans:evac',data:{actor:'bea',action,when:null,where:null,status:'intended',known_by:['bea','alex']},evidence:ids});

// D1: membership in the resulting state is not independent evidence.
test('D1a stale placement plus unrelated current evidence cannot launder a new ledger head',async()=>{
 const b=baseline();b.cast[0].now='The radio rests on the crate.';const p=await prep(b,context('I check the door.','Bea waits.'));p.sources.push({id:'E90',origin:'old',kind:'user',current:false,text:'I set the radio onto the crate.'});
 const t=empty(p),ids=ev(p,'user');t.changes=[now('Standing by the doorway.',ids),ledger('radio','The radio rests on the crate.',['E90',...ids])];
 const before=JSON.stringify({b,p,t});assert.throws(()=>commitTransaction(t,p),/still-current custody/);assert.equal(JSON.stringify({b,p,t}),before);
});
test('D1b an actual current move can set first durable custody without a predecessor ledger row',async()=>{
 const b=baseline();b.cast[0].now='The radio rests on the crate.';const p=await prep(b,context('I move and set the radio onto the dry shelf.','Bea nods.')),t=empty(p),ids=ev(p,'user');
 t.changes=[now('Standing by the dry shelf.',ids),ledger('radio_shelf','The radio rests on the dry shelf.',ids)];t.access=[{ref:'ledger:radio_shelf',who:['alex'],stance:'knows',route:'self',from:null,evidence:ids}];
 const s=commitTransaction(t,p);assert.equal(s.ledger.at(-1).fact,'The radio rests on the dry shelf.');assert.deepEqual(s.ledger.at(-1).holders.map(x=>x.who),['alex']);assert.deepEqual(s.ledger.at(-1).not_known_by,[]);assert.deepEqual(s.cast.slice(1),b.cast.slice(1));assert.deepEqual(s.directives,b.directives);assert.deepEqual(s.plans,b.plans);
});
test('D1 a current bare asset mention does not establish custody or its destination',async()=>{
 const b=baseline();b.cast[0].now='The radio rests on the crate.';const p=await prep(b,context('I think about the radio.','Bea waits.')),t=empty(p),ids=ev(p,'user');
 t.changes=[now('Standing by the doorway.',ids),ledger('radio','The radio rests on the dry shelf.',ids)];assert.throws(()=>commitTransaction(t,p),/still-current custody/);
});
test('D1 a different current destination cannot justify dropping the old custody clause',async()=>{
 const b=baseline();b.cast[0].now='The radio rests on the crate.';const p=await prep(b,context('I carry the radio to the dry shelf.','Bea waits.')),t=empty(p),ids=ev(p,'user');
 t.changes=[now('Standing by the doorway.',ids),ledger('radio','The radio rests on the wet floor.',ids)];assert.throws(()=>commitTransaction(t,p),/still-current custody/);
});
test('D1 recognized current assistant location can support the first durable custody row',async()=>{
 const b=baseline();b.cast[0].now='The radio rests on the crate.';const p=await prep(b,context('I wait.','The radio now rests on the dry shelf.')),t=empty(p),ids=ev(p,'assistant');
 t.changes=[now('Standing by the doorway.',ids),ledger('radio','The radio rests on the dry shelf.',ids)];assert.doesNotThrow(()=>commitTransaction(t,p));
});
test('D1 a baseline head superseded in this transaction cannot count as retained custody',async()=>{
 const b=baseline();b.cast[0].now='The kit rests on the bench.';b.ledger.push(oldKit());const p=await prep(b,context('I remember the kit.','Bea waits.')),t=empty(p),ids=ev(p,'user');
 t.changes=[now('Standing by the doorway.',ids),ledger('kit','The kit rests in the trunk.',ids,'advance')];assert.throws(()=>commitTransaction(t,p),/still-current custody/);
});
test('D1 a surviving baseline head preserves custody without repeating its audience or adding rows',async()=>{
 const b=baseline();b.cast[0].now='The kit rests on the bench.';b.ledger.push(oldKit());const p=await prep(b,context()),t=empty(p);t.changes=[now('Standing by the doorway.',ev(p,'assistant'))];
 const s=commitTransaction(t,p);assert.deepEqual(s.ledger,b.ledger);
});
test('D1 guard cannot be bypassed using a speculative, negated or conditional current location',async()=>{
 for(const text of ['The radio might rest on the dry shelf.','The radio is not on the dry shelf.','If the radio is on the dry shelf, wait.','Is the radio on the dry shelf?']){
  const b=baseline();b.cast[0].now='The radio rests on the crate.';const p=await prep(b,context('I wait.',text)),t=empty(p),ids=ev(p,'assistant');t.changes=[now('Standing by the doorway.',ids),ledger('radio','The radio rests on the dry shelf.',ids)];assert.throws(()=>commitTransaction(t,p),/still-current custody/,text);
 }
});
test('D1 all split current location spans must be cited; unrelated current spans cannot fill gaps',async()=>{
 const b=baseline();b.cast[0].now='The radio rests on the crate.';const p=await prep(b,context()),t=empty(p);
 p.sources.push({id:'E90',origin:'current-location',kind:'assistant',current:true,text:'The radio rests on'},{id:'E91',origin:'current-location',kind:'assistant',current:true,text:'the dry shelf.'});
 t.changes=[now('Standing by the doorway.',['E90']),ledger('radio','The radio rests on the dry shelf.',['E90'])];assert.throws(()=>commitTransaction(t,p),/still-current custody/);
 t.changes[1].evidence.push('E91');assert.doesNotThrow(()=>commitTransaction(t,p));
});
test('a repeated baseline seal observation must still survive the same transaction',async()=>{
 const b=baseline();b.ledger.push({...oldKit(),id:'seal',fact:'The case seal is intact.'});const p=await prep(b,context('I wait.','The case seal is intact.')),t=empty(p);
 t.changes=[ledger('seal','The case seal is not intact.',ev(p,'assistant'),'advance')];assert.throws(()=>commitTransaction(t,p),/admission:seal/);
});

for(const text of ['I do not set the kit on the wet floor.','I don\'t set the kit on the wet floor.','I don’t set the kit on the wet floor.','I never set the kit on the wet floor.','If I set the battery on the wet floor, it shorts out.','Unless I set the kit on the bench, we wait.','I set the kit on the floor if permitted.']){
 test('D2 nonactual placement creates no obligation: '+text,()=>assert.deepEqual(cues(text),[]));
}
test('D2 conditional/question scope before a chunk boundary is not lost',()=>{
 for(const [start,end]of [['If I set the kit',' on the bench, wait.'],['Could I set the kit',' on the bench?']]){
  const c=admissionReview([{id:'E1',origin:'u',kind:'user',current:true,text:start},{id:'E2',origin:'u',kind:'user',current:true,text:end}]).cues;assert.deepEqual(c,[]);
 }
});
test('D2 simultaneous bystander action is not a location token or new audience',async()=>{
 const b=baseline(),p=await prep(b,context('I set the kit on the bench while Bea watches the door.','Bea nods.')),t=empty(p),ids=ev(p,'user');
 assert.deepEqual(p.admission_review.cues[0].anchors,['kit','bench']);t.changes=[ledger('kit','The kit rests on the bench.',ids)];const s=commitTransaction(t,p);assert.deepEqual(s.ledger.at(-1).holders,[]);assert.deepEqual(s.ledger.at(-1).not_known_by,[]);
});
test('D2 comma/and destination qualifiers and restrictive timing are not stripped indiscriminately',()=>{
 for(const [text,required]of [['I set the kit on the bench, inside the locked room.',['inside','locked','room']],['I set the kit on the bench and under the awning.',['under','awning']],['I set the kit on the bench while the door remains closed.',['while','door','closed']]]){
  const c=cues(text);assert.equal(c.length,1);for(const key of required)assert(c[0].anchors.includes(key),key);
 }
 assert.deepEqual(cues('I set the kit on the bench until the door opens.'),[]); // not a completed unconditional location claim
});
test('D2 a positive placement cue cannot be satisfied by a hypothetical or negated fact',async()=>{
 const p=await prep(baseline(),context('I set the kit on the bench.','Bea nods.'));
 for(const fact of ['The kit is not on the bench.','The kit might be on the bench.','If the kit is on the bench, wait.']){const t=empty(p);t.changes=[ledger('kit',fact,ev(p,'user'))];assert.throws(()=>commitTransaction(t,p),/admission:placement/);}
});
for(const contraction of ["isn't",'isn’t'])test('D3a contracted intact polarity: '+contraction,async()=>{
 const p=await prep(baseline(),context('I wait.',`Bea checks the case seal. It ${contraction} intact.`)),t=empty(p);assert.equal(p.admission_review.cues[0].polarity,'negative');t.changes=[ledger('seal','The case seal is not intact.',ev(p,'assistant'))];assert.doesNotThrow(()=>commitTransaction(t,p));t.changes[0].data.fact='The case seal is intact.';assert.throws(()=>commitTransaction(t,p),/admission:seal/);
});
test('D3b parenthetical commas and rouse inflection preserve condition operator and polarity',async()=>{
 for(const [source,target]of [['If Riley is not ambulatory by morning, request evacuation.','If, by morning, Riley is not ambulatory, request evacuation.'],['Unless Riley rouses, request evacuation.','Unless Riley does rouse, request evacuation.']]){
  const p=await prep(baseline(),context('I wait.','Bea says: '+source)),t=empty(p);t.changes=[plan(target,ev(p,'assistant'))];assert.doesNotThrow(()=>commitTransaction(t,p));
  t.changes[0].data.action=target.replace(/^If/,'Unless').replace(/^Unless/,'Until');assert.throws(()=>commitTransaction(t,p),/admission:evacuation/);
 }
});
for(const text of ['Bea asks, "Is the case seal still intact?"','Bea asks, "If Riley rouses, what should we tell her?"','Does the serial number read ZX-17?','Is the coupling misaligned?'])test('D3c assistant question is not a discovery: '+text,()=>assert.deepEqual(cues(text,'assistant'),[]));
test('D3d unrelated later speculation does not erase established seal or identifier cues',()=>{
 const c=admissionReview([{id:'E1',origin:'a',kind:'assistant',current:true,text:'Bea checks the case seal. The white custody sticker is intact. You read the asset sticker GL-09 on the wrench.'},{id:'E2',origin:'a',kind:'assistant',current:true,text:'Later, the storm might worsen before dawn.'}]).cues;
 assert.deepEqual(c.map(x=>x.family),['seal','inspection']);assert(c.every(x=>JSON.stringify(x.source_ids)==='["E1"]'));
});
test('D3d speculation local to the actual observation still suppresses its cue',()=>{
 for(const text of ['The seal might be intact.','The serial number will read ZX-17.','The coupling might be misaligned.'])assert.deepEqual(cues(text,'assistant'),[]);
});
test('split observations cite all and only contributing spans; all must be supplied',async()=>{
 const p=await prep(baseline(),context()),t=empty(p);
 p.sources.push({id:'E90',origin:'new-seal',kind:'assistant',current:true,text:'The case seal'},{id:'E91',origin:'new-seal',kind:'assistant',current:true,text:"isn't intact."},{id:'E92',origin:'new-seal',kind:'assistant',current:true,text:'It might rain tomorrow.'});
 const c=admissionReview(p.sources).cues;assert.deepEqual(c[0].source_ids,['E90','E91']);t.changes=[ledger('seal','The case seal is not intact.',['E90','E92'])];assert.throws(()=>commitTransaction(t,p),/admission:seal/);t.changes[0].evidence=['E90','E91'];assert.doesNotThrow(()=>commitTransaction(t,p));
});
test('current/stale, author/scene, and distinct origins never combine into cue authority',()=>{
 const first={id:'E1',origin:'a',kind:'assistant',current:true,text:'The case seal'};
 for(const second of [{id:'E2',origin:'b',kind:'assistant',current:true,text:'is intact.'},{id:'E2',origin:'a',kind:'author',current:true,text:'is intact.'},{id:'E2',origin:'a',kind:'assistant',current:false,text:'is intact.'}])assert.deepEqual(admissionReview([first,second]).cues,[]);
});
test('abbreviations inside one bounded sentence do not sever its assertion',()=>{
 const c=cues('Dr. Vale confirms the case seal is intact.','assistant');assert.equal(c.length,1);assert.equal(c[0].family,'seal');
});
test('over-bound sentences are not chopped into false affirmative fragments',()=>{
 const text='If '+('someone waits near the door '.repeat(18))+'I set the kit on the bench, we leave.';const spans=text.match(/.{1,180}(?:\s|$)/g)??[];assert(spans.length>2);
 assert.deepEqual(admissionReview(spans.map((text,i)=>({id:'E'+i,origin:'u',kind:'user',current:true,text}))).cues,[]);
});
test('N2 objective facts may remain audience-unknown; cues cannot invent holders or exclusions',async()=>{
 const p=await prep(baseline(),context('I wait.','The seal is intact.')),t=empty(p);t.changes=[ledger('seal','The case seal is intact.',ev(p,'assistant'))];
 const s=commitTransaction(t,p);assert.deepEqual(s.ledger.at(-1).holders,[]);assert.deepEqual(s.ledger.at(-1).not_known_by,[]);
 t.access=[{ref:'ledger:seal',who:['clara'],stance:'excluded',route:'self',from:null,evidence:ev(p,'assistant')}];assert.throws(()=>commitTransaction(t,p),/exclusions need author\/canon/);
});

test('N3 packed audited seed uses the decoded logical hash consistently and finalizes once',async()=>{
 const {packCheckpoint}=await import('../package/storage.mjs'),{hash}=await import('../package/sources.mjs');const b=baseline(),w=packCheckpoint(b),c={...context(),authorNotes:'[KEEPER_V41_SEED]'+JSON.stringify(w)+'[/KEEPER_V41_SEED]',loadPreviousOutput:async()=>null};
 const p=await rt.prepareContext({agent,context:c});assert(!p.blocked,p.blocked);assert.equal(p.origin,'seed');assert.equal(p.base_hash,hash(b));assert.notEqual(p.base_hash,hash(w));
 const result=await rt.finalizeResult({agent,context:c,preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(empty(p))}}});assert.equal(result.success,true,result.error);assert.equal(result.data.keeperStatus.revision,2);
});
test('N3 changing seed provenance during generation still rejects without mutation',async()=>{
 const {packCheckpoint}=await import('../package/storage.mjs');const b=baseline(),w=packCheckpoint(b),c={...context(),authorNotes:'[KEEPER_V41_SEED]'+JSON.stringify(w)+'[/KEEPER_V41_SEED]',loadPreviousOutput:async()=>null};const p=await rt.prepareContext({agent,context:c});
 const changed=structuredClone(b);changed.ledger[0].source='Different prior provenance.';const c2={...c,authorNotes:'[KEEPER_V41_SEED]'+JSON.stringify(packCheckpoint(changed))+'[/KEEPER_V41_SEED]'},before=JSON.stringify({b,w,p});
 const result=await rt.finalizeResult({agent,context:c2,preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(empty(p))}}});assert.equal(result.success,false);assert.match(result.error,/baseline changed/);assert.equal(JSON.stringify({b,w,p}),before);
});
