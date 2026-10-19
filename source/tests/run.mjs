import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {baseline,context,oldContext} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID,readSeed} from '../package/server.mjs';
import {commitTransaction,parseTransaction} from '../package/transaction.mjs';
import {prepareEvidence,scopes} from '../package/evidence.mjs';
import {inspect,baselineHash} from '../package/keeper-core.mjs';
import {hash} from '../package/sources.mjs';

const agent={id:'native-fixture',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const runtime=makeRuntime();
const host=(ctx,base)=>({...ctx,loadPreviousOutput:async()=>base});
const prep=async(base=baseline(),ctx=context())=>runtime.prepareContext({agent,context:host(ctx,base)});
const tx=p=>({turn:p.turn,through:'Accepted reply recorded.',scene:null,changes:[],access:[],complete:true});
const ev=(p,kind,text=null)=>{const s=p.sources.find(s=>s.kind===kind&&s.current&&(!text||s.text.includes(text)));assert.ok(s,`missing ${kind} evidence ${text}`);return [s.id];};
const change=(ref,data,evidence,op='set')=>({op,ref,data,evidence});
const access=(ref,who,evidence,route='observed',stance='knows',from=null)=>({ref,who,stance,route,from,evidence});
const result=data=>({agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(data)}});
async function finalize(p,t,ctx=context(),base=baseline(),extra={}){
  return runtime.finalizeResult({agent,context:host(ctx,base),preparedContext:p,result:{...result(t),...extra}});
}
const stateBase=()=>{const b=baseline();b.ledger.find(r=>r.id==='key').kind='state';return b;};

test('fresh initialization: consistent new-row shape, conditional plan and separate audience',async()=>{
  const ctx={...oldContext,recentMessages:[{id:'u1',role:'user',content:'I am Alex, an adult ranger. I will check in at seven if still in the field.'}],mainResponse:'Bea agrees to the conditional check-in. Bea carries the brass key.'};
  const p=await prep(null,ctx),t=tx(p);assert.ok(!p.blocked);t.scene='Ranger outpost.';
  t.changes=[change('cast:alex',{name:'Alex',role:'user',identity:'Adult ranger.'},ev(p,'user')),
    change('cast:bea',{name:'Bea',role:'npc',voice:'Dry and practical.'},ev(p,'assistant')),
    change('plans:checkin',{actor:'alex',action:'Check in at seven if still in the field.',status:'agreed',when:'19:00',known_by:['alex','bea']},ev(p,'user')),
    change('ledger:key',{kind:'state',fact:'Bea carries the brass key.',truth:'established'},ev(p,'assistant'))];
  t.access=[access('ledger:key',['bea'],ev(p,'assistant'),'self')];
  const r=await finalize(p,t,ctx,null);assert.equal(r.success,true,r.error);const s=JSON.parse(r.data.text);
  assert.equal(s.revision,1);assert.match(s.plans[0].action,/if still/);assert.equal(inspect(s).valid,true);
});

test('five consecutive saves preserve quiet cast, unresolved plans and corrections',async()=>{
  let b=baseline(),history=[...oldContext.recentMessages,{id:'a1',role:'assistant',content:oldContext.mainResponse}];
  const protectedRows=structuredClone({cast:b.cast,plans:b.plans,directives:b.directives});
  for(let n=2;n<=6;n++){
    history.push({id:`u${n}`,role:'user',content:`I wait another moment, beat ${n}.`});
    const ctx={...oldContext,recentMessages:history,mainResponse:`Bea waits by the entrance for another moment, beat ${n}.`};
    const p=await prep(b,ctx),r=await finalize(p,tx(p),ctx,b);assert.equal(r.success,true,r.error);
    b=JSON.parse(r.data.text);assert.equal(b.revision,n);assert.equal(b.anchor.turn_key,p.anchor.turn_key);
    assert.deepEqual({cast:b.cast,plans:b.plans,directives:b.directives},protectedRows);
    history.push({id:`a${n}`,role:'assistant',content:ctx.mainResponse});
  }
});

test('state handoff creates a successor without passing knowledge to absent witnesses',async()=>{
  const b=stateBase(),ctx=context('Bea hands me the key.','Alex pockets the key while Bea watches. Clara and Drew are absent.');
  b.ledger.find(r=>r.id==='key').holders.push({who:'clara',stance:'knows',via:'Saw the earlier location.'});
  const original=structuredClone(b),p=await prep(b,ctx),t=tx(p);
  t.changes=[change('ledger:key',{fact:'Alex now carries the key.',truth:'established'},ev(p,'assistant'),'advance')];
  t.access=[access('ledger:key',['alex','bea'],ev(p,'assistant'))];
  const s=commitTransaction(t,p),row=s.ledger.find(r=>r.supersedes==='key');
  assert.deepEqual(s.ledger.find(r=>r.id==='key'),b.ledger.find(r=>r.id==='key'));
  assert.deepEqual(row.holders.map(h=>h.who),['alex','bea']);assert.deepEqual(b,original);
  const ctx2={...ctx,recentMessages:[...ctx.recentMessages,{id:'a2',role:'assistant',content:ctx.mainResponse},{id:'u3',role:'user',content:'I return the key to Bea.'}],mainResponse:'Bea takes the key back and fastens it to her belt.'};
  const p2=await prep(s,ctx2),t2=tx(p2);t2.changes=[change(`ledger:${row.id}`,{fact:'Bea has the returned key on her belt.',truth:'established'},ev(p2,'assistant'),'advance')];
  const s2=commitTransaction(t2,p2);assert.equal(s2.ledger.find(r=>r.id==='key__r3').supersedes,row.id);
  t2.changes[0].ref='ledger:key';assert.throws(()=>commitTransaction(t2,p2),/current successor/);
});

test('ordinary user action cannot rewrite a known proposition or masquerade as correction',async()=>{
  const p=await prep(stateBase(),context('I pocket the key while Bea watches.')),t=tx(p);
  t.changes=[change('ledger:key',{fact:'Alex now carries the key.'},ev(p,'user'))];
  assert.throws(()=>commitTransaction(t,p),/use advance/);
  t.changes[0].op='correct';assert.throws(()=>commitTransaction(t,p),/explicit OOC/);
  t.changes=[];t.access=[access('ledger:notepad',['bea'],ev(p,'user'),'author_correction')];
  assert.throws(()=>commitTransaction(t,p),/explicit OOC/);
});

test('explicit OOC can correct a fact and preserve an ongoing directive',async()=>{
  const ctx=context('(OOC: Correction: the tag actually reads HQ 24-B. Keep Bea unaware of the notepad.)'),p=await prep(baseline(),ctx),t=tx(p);
  t.changes=[change('ledger:key',{fact:'The key tag reads HQ 24-B.'},ev(p,'author'),'correct'),change('directives:private_notepad',{rule:'Bea remains unaware of the private notepad contents.'},ev(p,'author'),'correct')];
  const s=commitTransaction(t,p);assert.match(s.ledger.find(r=>r.id==='key').fact,/24-B/);assert.equal(s.directives[0].status,'active');
  assert.equal(s.ledger.find(r=>r.id==='notepad').holders.length,1);
});

test('OOC scopes distinguish explicit markup from in-character parentheses',()=>{
  for(const text of ['(OOC: Keep this secret.)','[OOC: Keep this secret.]','<ooc>Keep this secret.</ooc>','OOC: Keep this secret.'])assert.equal(scopes(text,'user')[0].kind,'author');
  assert.equal(scopes('(I reach for the map.)','user')[0].kind,'user');
  assert.deepEqual(scopes('I wait. (OOC: Do not move me.) Then I look up.','user').map(s=>s.kind),['user','author','user']);
});

test('OOC cannot serve as in-world disclosure; a claim cannot confer knowledge',async()=>{
  const p=await prep(baseline(),context('(OOC: Bea has not seen the notepad.)')),t=tx(p);
  t.access=[access('ledger:notepad',['bea'],ev(p,'author'),'observed')];assert.throws(()=>commitTransaction(t,p),/not in-world/);
  t.access=[access('ledger:notepad',['bea'],ev(p,'assistant'),'claim')];assert.throws(()=>commitTransaction(t,p),/guess\/claim/);
});

test('GM notes do not become evidence and chunks retain literal source text',async()=>{
  const ctx=context('I wait.','Bea waits. <gm_notes>SECRET: Clara knows everything.</gm_notes><think>Analysis here.</think>');
  const p=await prep(baseline(),ctx);assert.ok(p.sources.every(s=>s.kind!=='gm'&&!s.text.includes('SECRET:')&&!s.text.includes('Analysis here.')));
  assert.ok(p.sources.every(s=>s.text.length>=1&&s.text.length<=190));
});

test('evidence ID compilation handles punctuation without model-authored quotes',async()=>{
  const p=await prep(baseline(),context('I wait.','Bea says, “I’ll wait by the door.”')),t=tx(p);
  t.changes=[change('cast:bea',{now:'Waiting by the door.'},ev(p,'assistant','I’ll'))];
  const s=commitTransaction(t,p);assert.equal(s.cast.find(r=>r.id==='bea').now,'Waiting by the door.');
  t.changes[0].evidence=['E99999'];assert.throws(()=>commitTransaction(t,p),/unknown or wrong-scope/);
});

test('new and existing row structural errors identify their operation before commit',async()=>{
  const p=await prep(),t=tx(p);t.changes=[{op:'set',ref:'ledger:new',fact:'wrong nesting',evidence:[]}];
  assert.throws(()=>commitTransaction(t,p),/changes\[0\].*missing data.*unknown fact/);
  t.changes=[change('cast:bea',{voice:'x'.repeat(121)},ev(p,'assistant'))];assert.throws(()=>commitTransaction(t,p),/voice is 121.*maximum 120/);
});

test('bounded compaction preserves conditions, audiences and protected collections',async()=>{
  const base=baseline();base.plans[0].action='Meet Riley  if access can be arranged; no cancellation established.';
  const p=await prep(base),t=tx(p),b=p.compact.find(x=>x.ref==='plans:riley');
  t.changes=[change('plans:riley',{action:'Meet Riley if access can be arranged; no cancellation established.'},[b.id],'compact')];
  const s=commitTransaction(t,p);assert.deepEqual(s.cast,p.baseline.cast);assert.deepEqual(s.directives,p.baseline.directives);assert.deepEqual(s.plans[0].known_by,p.baseline.plans[0].known_by);
  t.changes[0].data={action:'Done'};assert.throws(()=>commitTransaction(t,p),/whitespace cleanup/);
  t.changes[0].data={action:null};assert.throws(()=>commitTransaction(t,p),/cannot clear/);
  t.changes[0].data={status:'completed'};assert.throws(()=>commitTransaction(t,p),/wording compaction/);
  t.changes[0].evidence=[p.compact.find(x=>x.ref==='cast:bea').id];assert.throws(()=>commitTransaction(t,p),/wrong-scope/);
});

test('lost anchor blocks rebuilding; recovery includes failed replies beyond normal eight',async()=>{
  const b=baseline(),history=[...oldContext.recentMessages,{id:'a1',role:'assistant',content:oldContext.mainResponse}];
  for(let n=2;n<8;n++)history.push({id:`u${n}`,role:'user',content:`I pause at interval ${n}.`},{id:`a${n}`,role:'assistant',content:`Bea waits at interval ${n}.`});
  history.push({id:'u8',role:'user',content:'I check the entrance again.'});
  const ctx={...oldContext,recentMessages:history,mainResponse:'The entrance is still clear.'},p=await prep(b,ctx);
  assert.equal(p.recovery.mode,'catch_up');assert.equal(p.recovery.pending_replies,7);assert.ok(p.sources.some(s=>s.text.includes('interval 2')));
  const r=await finalize(p,tx(p),ctx,b);assert.equal(r.success,true,r.error);assert.equal(r.data.keeperStatus.coveredReplies,7);
  const lost=await prep(b,{...ctx,recentMessages:history.slice(-8)});assert.match(lost.blocked,/Saved anchor not found: revision 1.*in 8 supplied history entries/);
  const fail=await finalize(lost,{blocked:true},{...ctx,recentMessages:history.slice(-8)},b);assert.equal(fail.success,false);assert.match(fail.error,/revision 1 retained/);
});

test('repeated assistant wording cannot masquerade as the saved anchor',async()=>{
  const b=baseline(),ctx=context();ctx.recentMessages=[{id:'u-new',role:'user',content:'A different action entirely.'},{id:'a-new',role:'assistant',content:oldContext.mainResponse},ctx.recentMessages.at(-1)];
  assert.match((await prep(b,ctx)).blocked,/Saved anchor not found: revision 1.*in 3 supplied history entries/);
});

test('manual retry removes the duplicated completed reply from its evidence pool',async()=>{
  const ctx=context(),p1=await prep(baseline(),ctx),p2=await prep(baseline(),{...ctx,recentMessages:[...ctx.recentMessages,{id:'a2',role:'assistant',content:ctx.mainResponse}]});
  assert.equal(p1.turn,p2.turn);assert.deepEqual(p1.sources,p2.sources);
});

test('existing story without state requires audit, while an explicit valid seed loads',async()=>{
  assert.match((await prep(null,context())).blocked,/existing story/);
  const b=baseline(),ctx={...context(),authorNotes:`[KEEPER_V41_SEED]${JSON.stringify(b)}[/KEEPER_V41_SEED]`};
  const p=await prep(null,ctx);assert.equal(p.origin,'seed');assert.ok(!p.blocked);assert.ok(p.sources.every(s=>!s.text.includes('KEEPER_V41_SEED')));
  assert.throws(()=>readSeed(ctx.authorNotes+ctx.authorNotes),/one audited seed/);
});

test('old overlapping dialogue is context, not authority for a new action',async()=>{
  const p=await prep(),t=tx(p),old=p.sources.find(s=>s.kind==='assistant'&&!s.current);
  t.changes=[change('cast:bea',{now:'Doing a new thing.'},[old.id])];assert.throws(()=>commitTransaction(t,p),/old overlapping/);
});

test('atomic rejection leaves baseline byte-identical on malformed, truncated and empty outputs',async()=>{
  const b=baseline(),bytes=JSON.stringify(b),p=await prep(b);
  for(const raw of ['', '{"turn":', 'prose\n{}',JSON.stringify({...tx(p),retire:[]})]){
    const r=await finalize(p,null,context(),b,{data:{text:raw}});assert.equal(r.success,false);assert.match(r.error,/NOT SAVED/);assert.equal(JSON.stringify(b),bytes);
  }
  assert.deepEqual(parseTransaction({text:'```json\n'+JSON.stringify(tx(p))+'\n```'}),tx(p));
});

test('provider failure and concurrent source/baseline edits cannot publish a checkpoint',async()=>{
  const b=baseline(),p=await prep(b),t=tx(p);
  assert.match((await finalize(p,t,context(),b,{success:false,error:'Timed out'})).error,/NOT SAVED.*revision 1 retained.*Timed out/);
  assert.equal((await finalize(p,t,context('Edited current action.'),b)).success,false);
  const modified=structuredClone(b);modified.scene='Changed concurrently.';assert.equal((await finalize(p,t,context(),modified)).success,false);
  t.turn='0'.repeat(16);assert.equal((await finalize(p,t,context(),b)).success,false);
});

test('identity, result type and completion marker are enforced',async()=>{
  const p=await prep(),t=tx(p);
  assert.match((await runtime.prepareContext({agent:{...agent,phase:'pre_generation'},context:host(context(),baseline())})).blocked,/phase/);
  assert.match((await runtime.prepareContext({agent:{...agent,settings:{jsonContextOutput:true}},context:host(context(),baseline())})).blocked,/OFF/);
  assert.equal((await finalize(p,t,context(),baseline(),{type:'world_update'})).success,false);
  const reordered={complete:true,...Object.fromEntries(Object.entries(t).filter(([k])=>k!=='complete'))};assert.throws(()=>commitTransaction(reordered,p),/true and last/);
});

test('capacity pressure rejects instead of deleting quiet cast or open plans',async()=>{
  const b=baseline();while(b.ledger.length<36)b.ledger.push({id:`old_${b.ledger.length}`,kind:'reference',fact:'A distinct retained reference.',truth:'established',source:'Prior accepted evidence.',holders:[],not_known_by:[]});
  assert.equal(inspect(b).valid,true);const original=JSON.stringify(b),p=await prep(b),t=tx(p);
  t.changes=[change('ledger:overflow',{kind:'event',fact:'A new event.',truth:'established'},ev(p,'assistant'))];
  assert.throws(()=>commitTransaction(t,p),/36/);assert.equal(JSON.stringify(b),original);
});

test('a source catalog over its bound fails explicitly rather than cutting evidence',async()=>{
  const p=await prep(baseline(),{...context(),characters:[{name:'Large card',description:'Long source. '.repeat(7500)}]});
  assert.match(p.blocked,/catalog is full/);
});

test('successor history cannot be removed or made cyclic in a seed',()=>{
  const b=stateBase(),row=structuredClone(b.ledger.find(r=>r.id==='key'));row.id='key_next';row.supersedes='key';b.ledger.push(row);assert.equal(inspect(b).valid,true);
  const damaged=structuredClone(b);delete damaged.ledger.at(-1).supersedes;assert.equal(inspect(damaged,b).valid,false);
  b.ledger.find(r=>r.id==='key').supersedes='key_next';assert.equal(inspect(b).valid,false);
});

test('bounded compiled sources and stable proposal token contain no duplicate catalog',async()=>{
  const p=await prep();assert.equal(p.catalog,undefined);assert.match(p.turn,/^t_[a-f0-9]{16}$/);assert.equal(p.base_hash,baselineHash(p.baseline));
  assert.equal(p.turn,'t_'+hash([p.base_hash,p.anchor.turn_key,p.fingerprint]).slice(0,16));
});
