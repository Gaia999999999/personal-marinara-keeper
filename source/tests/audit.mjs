// Adversarial regressions derived from the independent 4.1.1 audit.
// Synthetic names/text only; no private roleplay exports or provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,context,oldContext} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {inspect} from '../package/keeper-core.mjs';
import {scopes} from '../package/evidence.mjs';
import {upgradePatch} from '../package/client.js';
const agent={id:'audit-fixture',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const runtime=makeRuntime();
const host=(ctx,b)=>({...ctx,loadPreviousOutput:async()=>b});
const prep=(b=baseline(),ctx=context())=>runtime.prepareContext({agent,context:host(ctx,b)});
const tx=p=>({turn:p.turn,through:'Audit fixture accepted reply.',scene:null,changes:[],access:[],complete:true});
const ev=(p,kind,current=true)=>{const s=p.sources.find(s=>s.kind===kind&&s.current===current);assert.ok(s,`${kind} current=${current}`);return s.id;};
const ch=(ref,data,evidence,op='set')=>({op,ref,data,evidence});
const ac=(ref,who,evidence,route='observed',stance='knows',from=null)=>({ref,who,stance,route,from,evidence});
function rejects(t,p,pattern){const bytes=JSON.stringify(p.baseline);assert.throws(()=>commitTransaction(t,p),pattern);assert.equal(JSON.stringify(p.baseline),bytes);}
const stateBase=()=>{const b=baseline();b.ledger.find(r=>r.id==='key').kind='state';return b;};
const next=(ctx,user='I wait quietly.',reply='Bea waits quietly.')=>({...ctx,recentMessages:[...ctx.recentMessages,{id:'a2',role:'assistant',content:ctx.mainResponse},{id:'u3',role:'user',content:user}],mainResponse:reply});
async function mixed(){
 const old={...oldContext,recentMessages:[{id:'u1',role:'user',content:'(OOC: Minor note on turn one.) I wait at the workshop.'}]};
 const b=stateBase();b.anchor=(await prep(null,old)).anchor;
 const ctx={...old,characters:[{name:'Bea',description:'Adult ranger at the workshop.'}],recentMessages:[...old.recentMessages,{id:'a1',role:'assistant',content:old.mainResponse},{id:'u2',role:'user',content:'I am a steadfast ranger. I pocket the key while Clara is upstairs.'}],mainResponse:'Alex pockets the key while Bea watches. The agreed meeting with Riley concludes.'};
 return {b,ctx,p:await prep(b,ctx)};
}

test('F1: multiline OOC remains author-scoped through its closing tag',()=>{
 const s=scopes('I wait. <ooc>\nCorrection: The key tag reads HQ 24-B.\n</ooc> Then I sit.','user');
 assert.deepEqual(s.map(x=>x.kind),['user','author','user']);assert.match(s[1].text,/24-B/);assert.equal(s[2].text,' Then I sit.');
 const unclosed=scopes('<ooc>\nCorrection: The key tag reads HQ 24-B.','user');assert.equal(unclosed.length,1);assert.equal(unclosed[0].kind,'author');
});
test('F1: bare OOC is one line and cannot authorize a following IC action',()=>{
 const s=scopes('OOC: Keep the rain light.\n\nI pocket the key.','user');
 assert.equal(s.length,2);assert.equal(s[0].kind,'author');assert.equal(s[1].kind,'user');assert.match(s[1].text,/pocket/);
});
test('F2: stale OOC plus current ordinary dialogue cannot authorize corrections',async()=>{
 const {p}=await mixed(),t=tx(p),ids=[ev(p,'author',false),ev(p,'user')];
 t.changes=[ch('ledger:key',{fact:'Absent Clara knows the new key location.'},ids,'correct')];rejects(t,p,/current.*OOC/);
 t.changes=[];t.access=[ac('ledger:key',['clara'],ids,'author_correction')];rejects(t,p,/current.*OOC/);
});
test('F2: stale scene plus current static card cannot authorize a transition',async()=>{
 const {p}=await mixed(),t=tx(p);t.changes=[ch('ledger:key',{fact:'Alex now holds the key.',truth:'established'},[ev(p,'assistant',false),ev(p,'card')],'advance')];
 rejects(t,p,/current|eligible|accepted scene/);
});
test('F2: eligible current evidence works regardless of an ineligible first ID',async()=>{
 const {p}=await mixed(),t=tx(p);
 t.changes=[ch('cast:alex',{core:'Steadfast ranger.'},[ev(p,'assistant'),ev(p,'user')]),ch('plans:riley',{status:'completed'},[ev(p,'card'),ev(p,'assistant')])];
 t.access=[ac('ledger:key',['bea'],[ev(p,'card'),ev(p,'assistant')])];
 const s=commitTransaction(t,p);assert.equal(s.cast[0].core,'Steadfast ranger.');assert.equal(s.plans[0].status,'completed');
});
test('F3: compaction cannot lengthen or replace even a shorter known proposition',async()=>{
 const p=await prep(),t=tx(p),id=p.compact.find(x=>x.ref==='ledger:key').id;
 for(const fact of ['Alex now carries the brass key while Clara is away.','Alex holds the key.']){
  t.changes=[ch('ledger:key',{fact},[id],'compact')];rejects(t,p,/Compaction|compaction/);
 }
});
test('F3: short directives cannot be compacted into punctuation or lose negation',async()=>{
 const p=await prep(),t=tx(p),id=p.compact.find(x=>x.ref==='directives:private_notepad').id;
 for(const rule of ['.','Bea read the notepad contents.']){t.changes=[ch('directives:private_notepad',{rule},[id],'compact')];rejects(t,p,/Compaction|compaction/);}
});
test('F3: whitespace cleanup preserves all words, conditions and private audiences',async()=>{
 const b=baseline();b.plans[0].action='Meet Riley  if access can be arranged;  no cancellation established.';
 const p=await prep(b),t=tx(p);t.changes=[ch('plans:riley',{action:'Meet Riley if access can be arranged; no cancellation established.'},[p.compact.find(x=>x.ref==='plans:riley').id],'compact')];
 const s=commitTransaction(t,p);assert.deepEqual(s.ledger,b.ledger);assert.deepEqual(s.cast,b.cast);assert.deepEqual(s.plans[0].known_by,b.plans[0].known_by);assert.equal(s.changes.length,0);
});
test('F4: ordinary receipts cannot authorize clearing quiet cast or plan terms',async()=>{
 const b=baseline();b.cast.find(c=>c.id==='erin').core='Keeps her own counsel.';const p=await prep(b),t=tx(p),ids=[ev(p,'assistant')];
 t.changes=[ch('cast:erin',{identity:null,voice:null,core:null,now:null,growth:null},ids)];rejects(t,p,/clearing|protected/);
 t.changes=[ch('plans:riley',{when:null,where:null},ids)];rejects(t,p,/clearing|protected/);
 t.changes=[ch('plans:riley',{action:'Meet.'},ids)];rejects(t,p,/protected|40%/);
});
test('F4: current author correction may explicitly clear a mistaken field',async()=>{
 const ctx=context('(OOC: Correction: Erin has no established voice description. Clear that mistaken field.)');
 const p=await prep(baseline(),ctx),t=tx(p);t.changes=[ch('cast:erin',{voice:null},[ev(p,'author')],'correct')];
 const s=commitTransaction(t,p);assert.equal(s.cast.find(c=>c.id==='erin').voice,null);
});
function busyBase(){const b=baseline();for(let i=1;i<=19;i++)b.ledger.push({id:`f${i}`,kind:'state',fact:`Short state ${i}.`,truth:'established',source:'Init.',holders:[],not_known_by:[]});return b;}
function busyTx(p,b,n){const t=tx(p),ids=[ev(p,'assistant')];t.changes=b.cast.map(c=>ch(`cast:${c.id}`,{now:'Listening.'},ids));t.access=Array.from({length:n},(_,i)=>ac(`ledger:f${i+1}`,['alex'],ids));return t;}
test('F5: 25 distinct touched rows fit the published combined operation limits',async()=>{
 const b=busyBase(),p=await prep(b),s=commitTransaction(busyTx(p,b,19),p);assert.equal(s.changes.length,25);assert.equal(inspect(s,b).valid,true);
});
test('F5: quiet turn accepts old bulky receipts expiring without any domain loss',async()=>{
 const b=busyBase(),ctx=context(),p=await prep(b,ctx),s=commitTransaction(busyTx(p,b,18),p);
 // Reconstruct valid legacy receipt sizes rather than assuming new receipts stay bulky.
 for(const r of s.changes){r.evidence='E'.repeat(200);r.why='Recorded historical change. '.repeat(7);}
 assert.equal(inspect(s).valid,true);
 const p2=await prep(s,next(ctx)),after=commitTransaction(tx(p2),p2);
 assert.equal(after.changes.length,0);for(const g of ['cast','ledger','plans','directives','relations'])assert.deepEqual(after[g],s[g]);
});
test('F5: near-cap whitespace compaction reduces the checkpoint without receipt expansion',async()=>{
 const b=baseline();let n=0;
 while(n<33){const text=`Case ${n}: The northern footbridge remains open only to pedestrians until the bridge inspector returns with the signed load assessment. The posted restriction still applies.`;
  b.ledger.push({id:`long_${n++}`,kind:'reference',fact:text.replace(': ',': '+' '.repeat(340-text.length)),truth:'established',source:'Accepted earlier inspection. '.repeat(4),holders:[],not_known_by:[]});}
 assert.equal(inspect(b).valid,true,JSON.stringify(inspect(b).errors));assert.ok(JSON.stringify(b).length>19000);
 const p=await prep(b),t=tx(p);t.changes=b.ledger.slice(3,27).map(row=>ch(`ledger:${row.id}`,{fact:row.fact.trim().replace(/\s+/g,' ')},[p.compact.find(x=>x.ref===`ledger:${row.id}`).id],'compact'));
 const s=commitTransaction(t,p);assert.ok(JSON.stringify(s).length<JSON.stringify(b).length-3000);assert.equal(s.ledger.length,b.ledger.length);assert.equal(s.changes.length,0);
});
test('F6: advance cannot change the kind or hide a state chain from current_states',async()=>{
 const p=await prep(stateBase()),t=tx(p);
 for(const kind of ['secret','event','reference','belief']){t.changes=[ch('ledger:key',{kind,fact:'Alex now holds the key.',truth:'established'},[ev(p,'assistant')],'advance')];rejects(t,p,/kind|state/);}
});
test('F7: advance inherits unchanged truth and accepts truth-only verification',async()=>{
 const b=stateBase(),p=await prep(b),t=tx(p);t.changes=[ch('ledger:key',{fact:'Alex now holds the key.'},[ev(p,'assistant')],'advance')];
 assert.equal(commitTransaction(t,p).ledger.at(-1).truth,'established');
 b.ledger.find(r=>r.id==='key').truth='uncertain';const p2=await prep(b),t2=tx(p2);t2.changes=[ch('ledger:key',{truth:'established'},[ev(p2,'assistant')],'advance')];
 const row=commitTransaction(t2,p2).ledger.at(-1);assert.equal(row.fact,b.ledger.at(-1).fact);assert.equal(row.truth,'established');assert.deepEqual(row.holders,[]);
});
test('F8: disclosures resolve grounded multi-hop senders independent of array order',async()=>{
 const p=await prep(stateBase()),ids=[ev(p,'assistant')],t=tx(p);t.changes=[ch('ledger:key',{fact:'Bea has hidden the key.',truth:'established'},ids,'advance')];
 t.access=[ac('ledger:key',['clara'],ids,'disclosed','knows','alex'),ac('ledger:key',['alex'],ids,'disclosed','knows','bea'),ac('ledger:key',['bea'],ids,'self')];
 const forward=commitTransaction(t,p);t.access.reverse();const reversed=commitTransaction(t,p);assert.deepEqual(forward,reversed);assert.equal(forward.ledger.at(-1).holders.length,3);
});
test('F8: circular disclosures and heard-only senders cannot manufacture knowledge',async()=>{
 const p=await prep(stateBase()),ids=[ev(p,'assistant')],t=tx(p);t.changes=[ch('ledger:key',{fact:'Bea has hidden the key.',truth:'established'},ids,'advance')];
 t.access=[ac('ledger:key',['alex'],ids,'disclosed','knows','bea'),ac('ledger:key',['bea'],ids,'disclosed','knows','alex')];rejects(t,p,/sender|grounded/);
 t.access=[ac('ledger:key',['alex'],ids,'disclosed','knows','bea'),ac('ledger:key',['bea'],ids,'claim','heard')];rejects(t,p,/sender|grounded/);
});
test('F8: explicit same-transaction revocation applies before dependent disclosure',async()=>{
 const ctx=context('(OOC: Correction: Bea does not know the key tag.) I wait.','Bea claims to tell Alex the key tag.');
 const p=await prep(baseline(),ctx),t=tx(p);t.access=[ac('ledger:key',['alex'],[ev(p,'assistant')],'disclosed','knows','bea'),ac('ledger:key',['bea'],[ev(p,'author')],'author_correction','excluded')];rejects(t,p,/sender|grounded/);
});
test('F9: already-committed preparation reports that condition, not lost recovery',async()=>{
 const b=baseline(),p=await prep(b,{...oldContext,recentMessages:[...oldContext.recentMessages,{id:'a1',role:'assistant',content:oldContext.mainResponse}]});
 assert.match(p.blocked,/already committed/);assert.doesNotMatch(p.blocked,/Recovery window/);
});
test('F9: failed initial save does not silently initialize from later partial history',async()=>{
 const p=await prep(null,context());assert.match(p.blocked,/existing story/);
});
test('F10: an existing selected save retains priority over an author-notes seed',async()=>{
 const b=baseline(),seed=baseline();seed.scene='Alternative audited scene.';
 const p=await prep(b,{...context(),authorNotes:`[KEEPER_V41_SEED]${JSON.stringify(seed)}[/KEEPER_V41_SEED]`});assert.equal(p.origin,'previous');assert.equal(p.baseline.scene,b.scene);
});
test('F10: successor IDs remain unique after an audited revision-one seed',async()=>{
 const b=stateBase(),row={...structuredClone(b.ledger.at(-1)),id:'key__r2',supersedes:'key'};b.ledger.push(row);assert.equal(inspect(b).valid,true);
 const p=await prep(b),t=tx(p);t.changes=[ch('ledger:key__r2',{fact:'Alex now holds the key.',truth:'established'},[ev(p,'assistant')],'advance')];
 const s=commitTransaction(t,p);assert.equal(s.ledger.at(-1).supersedes,'key__r2');assert.notEqual(s.ledger.at(-1).id,'key__r2');
});
test('F10: seeds reject forked chains and successors of a non-state kind',()=>{
 const b=stateBase(),row={...structuredClone(b.ledger.at(-1)),id:'key__r2',supersedes:'key'};b.ledger.push(row,{...structuredClone(row),id:'key__r3'});assert.equal(inspect(b).valid,false);
 b.ledger.pop();b.ledger.at(-1).kind='secret';assert.equal(inspect(b).valid,false);
});
test('F11: setup failure distinguishes unloaded checkpoint status from no checkpoint',async()=>{
 const wrong={...agent,settings:{...agent.settings,contextSize:8}},ctx=host(context(),baseline()),p=await runtime.prepareContext({agent:wrong,context:ctx});
 const r=await runtime.finalizeResult({agent:wrong,context:ctx,preparedContext:p,result:{success:true,agentId:agent.id,type:'context_injection',data:{text:'{"blocked":true}'}}});
 assert.equal(r.success,false);assert.doesNotMatch(r.error,/No checkpoint saved yet/);assert.match(r.error,/not loaded/);
});
test('F11: upgrade resets every extraneous injection/tool switch while preserving model preferences',()=>{
 const old={connectionId:'private-model',settings:{temperature:0.4,includePreGenInjections:true,includeParallelResults:true,triggerLorebooksForAgentCalls:true,enabledTools:['unsafe_context_source']}};
 const p=upgradePatch(old);for(const key of ['includePreGenInjections','includeParallelResults','triggerLorebooksForAgentCalls'])assert.equal(p.settings[key],false);assert.deepEqual(p.settings.enabledTools,[]);assert.equal(p.settings.temperature,0.4);assert.equal(p.connectionId,undefined);
});
test('F11: short real dialogue remains usable as literal current evidence',async()=>{
 const p=await prep(baseline(),context('I nod.','Bea nods.')),t=tx(p);assert.equal(p.sources.find(s=>s.kind==='user'&&s.current).text,'I nod.');
 t.changes=[ch('cast:alex',{now:'Nodded.'},[ev(p,'user')])];assert.equal(commitTransaction(t,p).cast[0].now,'Nodded.');
});

test('rejected update recovers on the next reply without dropping pending evidence or old memory',async()=>{
 const b=stateBase(),bytes=JSON.stringify(b),ctx=context('Bea hands me the key.','Alex takes the key while Bea watches; Clara is upstairs.'),p=await prep(b,ctx),bad=tx(p);
 bad.changes=[ch('cast:erin',{voice:null},[ev(p,'assistant')])];
 const r=await runtime.finalizeResult({agent,context:host(ctx,b),preparedContext:p,result:{success:true,agentId:agent.id,type:'context_injection',data:{text:JSON.stringify(bad)}}});
 assert.equal(r.success,false);assert.equal(JSON.stringify(b),bytes);
 const later=next(ctx),p2=await prep(b,later),good=tx(p2);assert.equal(p2.recovery.pending_replies,2);
 const span=p2.sources.find(s=>s.current&&s.kind==='assistant'&&s.text.includes('takes the key'));assert.ok(span);
 good.changes=[ch('ledger:key',{fact:'Alex now holds the key.'},[span.id],'advance')];good.access=[ac('ledger:key',['alex','bea'],[span.id])];
 const saved=await runtime.finalizeResult({agent,context:host(later,b),preparedContext:p2,result:{success:true,agentId:agent.id,type:'context_injection',data:{text:JSON.stringify(good)}}});
 assert.equal(saved.success,true,saved.error);const s=JSON.parse(saved.data.text);assert.equal(s.revision,2);assert.deepEqual(s.cast,b.cast);assert.deepEqual(s.plans,b.plans);assert.deepEqual(s.directives,b.directives);assert.equal(s.ledger.at(-1).holders.some(h=>h.who==='clara'),false);
});
test('a short new state is allowed because advance retains the earlier detailed observation',async()=>{
 const b=stateBase();b.ledger.at(-1).fact='Bea carries the brass workshop key on a blue cord beside her belt, which Alex and Bea inspected together earlier in the afternoon.';
 const p=await prep(b),t=tx(p);t.changes=[ch('ledger:key',{fact:'Alex holds the key.'},[ev(p,'assistant')],'advance')];
 const s=commitTransaction(t,p);assert.deepEqual(s.ledger.find(r=>r.id==='key'),b.ledger.at(-1));assert.equal(s.ledger.at(-1).fact,'Alex holds the key.');
});
test('F5: the full 24-change plus 24-access budget supports 48 distinct receipts',async()=>{
 const b=baseline();while(b.cast.length<12){const n=b.cast.length;b.cast.push({...structuredClone(b.cast[1]),id:`npc${n}`,name:`NPC ${n}`});}
 while(b.plans.length<12){const n=b.plans.length;b.plans.push({...structuredClone(b.plans[0]),id:`plan${n}`});}
 while(b.ledger.length<27){const n=b.ledger.length;b.ledger.push({id:`fact${n}`,kind:'reference',fact:`Retained reference ${n}.`,truth:'established',source:'Accepted scene.',holders:[],not_known_by:[]});}
 const p=await prep(b),t=tx(p),ids=[ev(p,'assistant')];
 t.changes=[...b.cast.map(r=>ch(`cast:${r.id}`,{now:'Listening.'},ids)),...b.plans.map(r=>ch(`plans:${r.id}`,{status:'in_progress'},ids))];
 t.access=b.ledger.slice(3).map(r=>ac(`ledger:${r.id}`,['alex'],ids));const s=commitTransaction(t,p);assert.equal(s.changes.length,48);assert.equal(inspect(s,b).valid,true);
});

test('F2: mixed fields cannot borrow persona authority for a new on-scene user state',async()=>{
 const ctx={...context(),persona:{name:'Alex',description:'A steadfast ranger.'}},p=await prep(baseline(),ctx),t=tx(p);
 t.changes=[ch('cast:alex',{core:'Steadfast ranger.',now:'At the other outpost.'},[ev(p,'persona'),ev(p,'assistant')])];rejects(t,p,/eligible|current/);
 // Current user evidence can support both user traits and current action.
 t.changes[0].evidence.push(ev(p,'user'));assert.equal(commitTransaction(t,p).cast[0].core,'Steadfast ranger.');
});
