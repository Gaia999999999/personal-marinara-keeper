import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,context} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {admissionReview} from '../package/admission.mjs';

const agent={id:'rc4-audit',type:PACKAGE_ID,phase:'post_processing',settings:{contextSize:24,jsonContextOutput:false}};
const cues=(text,kind='user')=>admissionReview([{id:'E1',origin:'u',kind,current:true,text}]).cues;
const denied=[
 ['F1 no determiner','I set no kit on the wet floor.','The kit rests on the wet floor.'],
 ['F1 neither determiner','I put neither the kit nor the radio on the wet floor.','The kit rests on the wet floor.'],
 ['F1 not before asset','I place not the kit on the wet floor.','The kit rests on the wet floor.'],
 ['F1 instead of before asset','I set instead of the kit the radio on the wet floor.','The kit rests on the wet floor.'],
 ['F2 wh auxiliary','Why did I set the kit on the bench; or was that Bea?','The kit rests on the bench.'],
 ['F2 straight quotation',"'Did I set the kit on the bench; or did Bea?'",'The kit rests on the bench.'],
 ['F2 curly quotation','‘Did I set the kit on the bench; or did Bea?’','The kit rests on the bench.'],
 ['F2 quoted wh','Bea asks: ‘Where did I put the kit on the bench; or did I move it?’','The kit rests on the bench.'],
];
async function setup(user,advance=false){
 const rt=makeRuntime(),b=baseline();b.cast[0].now='The kit rests on the crate.';
 if(advance)b.ledger.push({id:'kit_old',kind:'state',fact:'The kit rests on the crate.',truth:'established',source:'Prior accepted action.',holders:[{who:'alex',stance:'knows',via:'Prior self action.'}],not_known_by:['clara']});
 const c={...context(user,'Bea waits by the door.'),loadPreviousOutput:async()=>b};
 const p=await rt.prepareContext({agent,context:c});assert(!p.blocked,p.blocked);
 return {rt,b,c,p,ids:p.sources.filter(x=>x.current&&x.kind==='user').map(x=>x.id)};
}
function tx(p,ids,fact,advance=false){
 const ref=advance?'ledger:kit_old':'ledger:kit_new';
 return {turn:p.turn,through:'Current scene recorded.',scene:null,changes:[{op:'set',ref:'cast:alex',data:{now:'Standing by the doorway.'},evidence:ids},{op:advance?'advance':'set',ref,data:{kind:'state',fact,truth:'established'},evidence:ids}],access:[{ref,who:['alex'],stance:'knows',route:'self',from:null,evidence:ids}],complete:true};
}
async function finalize(f,t){return f.rt.finalizeResult({agent,context:f.c,preparedContext:f.p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});}
for(const [name,user,fact]of denied)for(const advance of [false,true])test(`${name}: ${advance?'advance':'set'} cannot save false custody or self knowledge`,async()=>{
 assert.deepEqual(cues(user),[]);
 const f=await setup(user,advance),t=tx(f.p,f.ids,fact,advance),before=JSON.stringify({b:f.b,p:f.p,t});
 const r=await finalize(f,t);assert.equal(r.success,false);assert.equal(r.data.keeperStatus,undefined);assert.match(r.error,/still-current custody/);assert.match(r.error,/Saved revision 1 retained/);assert.equal(JSON.stringify({b:f.b,p:f.p,t}),before);
 // Rejection preserves all memory; a supported update against that same
 // baseline then works without a seed, route coercion or discarded records.
 const c={...context('I set the kit on the dry shelf.','Bea waits by the door.'),loadPreviousOutput:async()=>f.b};
 const p=await f.rt.prepareContext({agent,context:c}),ids=p.sources.filter(x=>x.current&&x.kind==='user').map(x=>x.id);
 const valid=tx(p,ids,'The kit rests on the dry shelf.',advance),s=commitTransaction(valid,p);
 const saved=await finalize({...f,c,p},valid);assert.equal(saved.success,true);assert.equal(saved.data.keeperStatus.revision,2);
 assert.deepEqual(s.cast.slice(1),f.b.cast.slice(1));assert.deepEqual(s.plans,f.b.plans);assert.deepEqual(s.directives,f.b.directives);assert.deepEqual(s.relations,f.b.relations);
 assert.deepEqual(s.ledger.filter(x=>x.id!=='kit_old'&&x.id!=='kit_new'&&!x.supersedes),f.b.ledger.filter(x=>x.id!=='kit_old'));
 const newest=s.ledger.find(x=>advance?x.supersedes==='kit_old':x.id==='kit_new');assert.deepEqual(newest.holders.map(x=>x.who),['alex']);assert.deepEqual(newest.not_known_by,[]);
 if(advance){const previous=s.ledger.find(x=>x.id==='kit_old');assert.deepEqual(previous.not_known_by,['clara']);assert.equal(previous.fact,'The kit rests on the crate.');}
});

test('F1/F2 scope survives contiguous current evidence chunks',()=>{
 for(const [a,b,kind]of [
  ['I set no','kit on the wet floor.','user'],
  ['I put neither the','kit nor the radio on the wet floor.','user'],
  ['Why did','I set the kit on the bench; or was that Bea?','user'],
  ["'Did I set the kit", "on the bench; or did Bea?'",'user'],
  ['Bea asks: ‘Why is the case seal','intact; or is it broken?’','assistant'],
 ])assert.deepEqual(admissionReview([{id:'E1',origin:'same',current:true,kind,text:a},{id:'E2',origin:'same',current:true,kind,text:b}]).cues,[]);
});
test('F2 auxiliary wh questions suppress findings without inventing answers',()=>{
 for(const text of ["'Is the case seal intact; or torn?'",'Why is the coupling misaligned; or is it just worn?','Where did you read the serial number ZX-17; or was it GL-09?'])assert.deepEqual(cues(text,'assistant'),[]);
});
test('F2 bounded wh prefix family and quotation forms are covered',()=>{
 for(const word of ['Where','When','Why','How','Who','What','Which'])for(const quote of ['',"'",'‘','"','“'])assert.deepEqual(cues(`${quote}${word} did I set the kit on the bench; or was that Bea?`),[]);
});
test('F2 completed positive clauses before later questions remain obligations',()=>{
 assert.deepEqual(cues('I set the kit on the bench; why did Bea leave?').map(x=>x.anchors),[['kit','bench']]);
 assert.deepEqual(cues("I set the kit on the bench; 'Did Bea see?' ").map(x=>x.anchors),[['kit','bench']]);
 assert.deepEqual(cues('The case seal is intact; why is the room empty?','assistant').map(x=>x.family),['seal']);
 assert.deepEqual(cues('You read the serial number ZX-17; where did it come from?','assistant').map(x=>x.family),['inspection']);
});
test('F1/F2 completed quoted positives and a new affirmative sentence remain recognized',()=>{
 assert.deepEqual(cues("'I set the kit on the bench.'").map(x=>x.anchors),[['kit','bench']]);
 assert.deepEqual(cues('Why did I set the kit down? I set the kit on the dry shelf.').map(x=>x.anchors),[['kit','dry','shelf']]);
 assert.deepEqual(cues('I set the kit on the bench; I set no radio on the floor.').map(x=>x.anchors),[['kit','bench']]);
});
test('F1b contrastive positive tail remains a documented conservative rejection',async()=>{
 const f=await setup('I set the kit on the bench, not on the wet floor.'),t=tx(f.p,f.ids,'The kit rests on the bench.'),before=JSON.stringify(f.b);
 assert.deepEqual(cues('I set the kit on the bench, not on the wet floor.'),[]);assert.equal((await finalize(f,t)).success,false);assert.equal(JSON.stringify(f.b),before);
});
test('F1 neither is placement-local and does not invert evacuation/condition polarity',()=>{
 const c=cues('If Riley does not rouse, request evacuation.','assistant');assert.equal(c[0].family,'evacuation');assert.deepEqual(c[0].condition,{operator:'if',term:'rouse',negative:true});
 assert.equal(cues('Dr. Vale confirms the case seal is intact.','assistant')[0].polarity,'positive');
});
test('F2 questions cannot be reclassified as current author authority',async()=>{
 const f=await setup('Why did I set the kit on the bench; or was that Bea?'),t=tx(f.p,f.ids,'The kit rests on the bench.');t.access[0].route='author_correction';
 assert.throws(()=>commitTransaction(t,f.p),/author|OOC/);
});
