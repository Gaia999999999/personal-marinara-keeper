// 4.1.3 regressions: synthetic scenes only, with no provider calls or private exports.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction,MAX_EVIDENCE_IDS} from '../package/transaction.mjs';
import {baseline,context,oldContext} from './fixtures.mjs';

const agent={id:'initialization-fixture',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const runtime=makeRuntime();
const host=(ctx,b)=>({...ctx,loadPreviousOutput:async()=>b});
const prepare=(ctx,b=null)=>runtime.prepareContext({agent,context:host(ctx,b)});
const tx=p=>({turn:p.turn,through:'Accepted scene recorded.',scene:p.baseline?null:'Ranger office.',changes:[],access:[],complete:true});
const change=(ref,data,evidence,op='set')=>({op,ref,data,evidence});
const access=(ref,who,evidence,route='claim',stance='heard',from=null)=>({ref,who,stance,route,from,evidence});
const ev=(p,kind,contains='')=>{const s=p.sources.find(s=>s.current&&s.kind===kind&&s.text.includes(contains));assert.ok(s,`${kind}: ${contains}`);return [s.id];};
const finalize=(p,t,ctx,b=null)=>runtime.finalizeResult({agent,context:host(ctx,b),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});
const freshContext=()=>({...oldContext,recentMessages:[{id:'u1',role:'user',content:'(OOC: Keep my voluntary choices under my control.) I am Alex, an adult ranger. I agree to check in at seven if still in the field.'}],mainResponse:[
  'Rowan tells Alex and Bea that the remote station lost power. Clara is absent and cannot hear. Rowan does not say he verified the power loss.',
  'Bea asks which station he means. Rowan repeats the name slowly and points to its place on a paper map. Alex and Bea listen from the same desk.',
  'The desk is wide enough for the unfolded map. Rowan keeps one hand on its edge while Bea checks the printed station name and the nearest marked trail.',
  'A closed window separates the office from the empty yard. No radio call or phone message takes place during this exchange, and nobody else enters.',
  'Rowan says that the supply request is still being considered. Bea leaves the spare equipment on its shelf rather than treating the request as an order.',
  'The two listeners have the report but no observation of the remote instruments. Rowan offers no photograph, inspection log or independent verification.',
  'Bea agrees to the seven-o-clock check-in if Alex is still in the field. There is no commitment to call after an earlier return, and no departure occurs.',
  'The conversation pauses. Rowan stays by the desk, Bea waits beside the map, and Clara remains offscreen. No new information is sent to anyone outside.'
].join('\n\n')});
function initialize(p,count=1){
  const t=tx(p),ids=p.sources.filter(s=>s.current&&s.kind==='assistant').slice(0,count).map(s=>s.id);
  assert.equal(ids.length,count);
  t.changes=[
    change('cast:alex',{name:'Alex',role:'user',identity:'Adult ranger.'},ev(p,'user')),
    ...['bea','rowan','clara'].map(id=>change(`cast:${id}`,{name:id[0].toUpperCase()+id.slice(1),role:'npc'},ids)),
    change('ledger:power',{kind:'state',fact:'The remote station has lost power, according to Rowan.',truth:'reported'},ids),
    change('plans:checkin',{actor:'alex',action:'Check in at seven if still in the field.',when:'19:00 if still in the field',where:null,status:'agreed',known_by:['alex','bea']},ev(p,'user')),
    change('directives:choices',{rule:'Alex retains control of voluntary choices.',status:'active'},ev(p,'author'))
  ];
  t.access=[access('ledger:power',['alex','bea'],ids)];
  return t;
}

for(const count of [4,6])test(`initialization accepts ${count} checked evidence IDs on changes and access`,async()=>{
  const ctx=freshContext(),p=await prepare(ctx),t=initialize(p,count),before=JSON.stringify(t);
  assert.equal(p.budget.evidence_ids_per_item,6);assert.equal(MAX_EVIDENCE_IDS,6);
  const r=await finalize(p,t,ctx);assert.equal(r.success,true,r.error);
  const s=JSON.parse(r.data.text);assert.equal(s.revision,1);assert.match(s.plans[0].action,/if still in the field/);
  assert.deepEqual(s.ledger[0].holders.map(h=>[h.who,h.stance]),[['alex','heard'],['bea','heard']]);
  assert.equal(JSON.stringify(t),before,'No IDs or output items are silently trimmed or rewritten.');
});

test('ongoing changes and access also accept six actual IDs without changing their audience',async()=>{
  const ctx=context('I wait at the office.',freshContext().mainResponse),b=baseline(),p=await prepare(ctx,b),t=tx(p);
  const ids=p.sources.filter(s=>s.current&&s.kind==='assistant').slice(0,6).map(s=>s.id);assert.equal(ids.length,6);
  t.changes=[change('cast:bea',{now:'Waiting beside the map.'},ids)];
  t.access=[access('ledger:key',['bea'],ids,'observed','knows')];
  const s=commitTransaction(t,p);assert.equal(s.cast.find(c=>c.id==='bea').now,'Waiting beside the map.');
  assert.deepEqual(s.ledger.find(l=>l.id==='notepad'),b.ledger.find(l=>l.id==='notepad'));
});

test('multiple seven-ID lists report both changes and access before committing anything',async()=>{
  const ctx=freshContext(),p=await prepare(ctx),t=initialize(p,7),before=JSON.stringify(p);
  // Isolate three count failures to make the full combined diagnostic inspectable.
  for(const c of t.changes)c.evidence=c.evidence.slice(0,1);
  const ids=p.sources.filter(s=>s.current&&s.kind==='assistant').slice(0,7).map(s=>s.id);
  t.changes[1].evidence=ids;t.changes[4].evidence=ids;
  const r=await finalize(p,t,ctx);assert.equal(r.success,false);assert.match(r.error,/No checkpoint saved yet/);
  for(const path of ['changes[1] cast:bea.evidence','changes[4] ledger:power.evidence','access[0] ledger:power.evidence'])assert.ok(r.error.includes(path),r.error);
  assert.equal((r.error.match(/at most 6/g)||[]).length,3);assert.equal(r.data.keeperStatus,undefined);
  assert.equal(JSON.stringify(p),before);
});

test('empty and non-array lists aggregate, while larger error sets report the omitted count',async()=>{
  const p=await prepare(freshContext()),t=initialize(p,1);
  t.changes[0].evidence=[];t.changes[1].evidence=null;t.access[0].evidence=[];
  assert.throws(()=>commitTransaction(t,p),e=>e.message.includes('changes[0]')&&e.message.includes('changes[1]')&&e.message.includes('access[0]'));
  for(const c of t.changes)c.evidence=Array(7).fill('E1');
  assert.throws(()=>commitTransaction(t,p),/4 more validation errors/);
});

test('invalid IDs in every newly allowed position reject changes and access atomically',async()=>{
  const ctx=context('I wait.',freshContext().mainResponse),b=baseline(),p=await prepare(ctx,b),before=JSON.stringify(b);
  const ids=p.sources.filter(s=>s.current&&s.kind==='assistant').slice(0,6).map(s=>s.id);
  for(const index of [3,4,5])for(const bad of ['E99999',p.compact[0].id])for(const group of ['changes','access']){
    const t=tx(p),invalid=[...ids];invalid[index]=bad;
    t.changes=[change('cast:bea',{now:'Waiting beside the map.'},group==='changes'?invalid:ids)];
    if(group==='access')t.access=[access('ledger:key',['bea'],invalid,'observed','knows')];
    const r=await finalize(p,t,ctx,b);assert.equal(r.success,false);assert.match(r.error,/unknown or wrong-scope/);
    assert.equal(JSON.stringify(b),before);assert.equal(r.data.keeperStatus,undefined);
  }
});

test('six-ID allowance still selects current eligible evidence and rejects stale authority',async()=>{
  const first={...oldContext,recentMessages:[{id:'u1',role:'user',content:'<ooc>Old explicit correction.</ooc> I wait.'}]};
  const b=baseline();b.anchor=(await prepare(first)).anchor;
  const ctx={...first,recentMessages:[...first.recentMessages,{id:'a1',role:'assistant',content:first.mainResponse},{id:'u2',role:'user',content:'I wait quietly.'}],mainResponse:freshContext().mainResponse,characters:[{name:'Bea',description:'A ranger.'}]};
  const p=await prepare(ctx,b),ids=p.sources.filter(s=>s.current&&s.kind==='assistant').slice(0,6).map(s=>s.id),old=p.sources.find(s=>s.kind==='author'&&!s.current).id;
  const t=tx(p);t.changes=[change('cast:bea',{now:'Waiting beside the map.'},[ev(p,'card')[0],...ids.slice(0,5)])];
  assert.equal(commitTransaction(t,p).revision,2);
  t.changes=[change('cast:bea',{now:'Waiting elsewhere.'},[old,...ids.slice(0,5)],'correct')];
  assert.throws(()=>commitTransaction(t,p),/current.*OOC/);
  t.changes=[change('cast:bea',{now:'Waiting elsewhere.'},[old,old,old,old,old,ev(p,'card')[0]])];
  assert.throws(()=>commitTransaction(t,p),/current|eligible/);
  t.access=[access('ledger:key',['clara'],[old,...ids.slice(0,5)],'author_correction','knows')];t.changes=[];
  assert.throws(()=>commitTransaction(t,p),/current.*OOC/);
  const corrected={...ctx,recentMessages:[...ctx.recentMessages.slice(0,-1),{id:'u2',role:'user',content:'<ooc>Correction: Bea is waiting beside the map.</ooc>'}]};
  const p2=await prepare(corrected,b),t2=tx(p2);t2.changes=[change('cast:bea',{now:'Waiting beside the map.'},[...p2.sources.filter(s=>s.current&&s.kind==='assistant').slice(0,5).map(s=>s.id),ev(p2,'author')[0]],'correct')];
  assert.equal(commitTransaction(t2,p2).revision,2,'Current author in the sixth position remains usable.');
});

test('heard report initializes only its named listeners, without inventing sender knowledge',async()=>{
  const p=await prepare(freshContext()),s=commitTransaction(initialize(p),p),row=s.ledger.find(l=>l.id==='power');
  assert.equal(row.truth,'reported');assert.deepEqual(row.holders.map(h=>h.who),['alex','bea']);
  assert.ok(row.holders.every(h=>h.stance==='heard'&&h.via.startsWith('claim ')));
  assert.ok(!row.holders.some(h=>['rowan','clara'].includes(h.who)));assert.deepEqual(row.not_known_by,[]);
});

test('heard claim cannot become verified knowledge or supply an ungrounded disclosure sender',async()=>{
  const p=await prepare(freshContext());
  const t=initialize(p,6);t.access[0].stance='knows';assert.throws(()=>commitTransaction(t,p),/guess\/claim/);
  const d=initialize(p,6);d.access[0].route='disclosed';d.access[0].from='rowan';
  assert.throws(()=>commitTransaction(d,p),/sender|grounded/);
});

test('a claim cannot bypass an explicit exclusion',async()=>{
  const b=baseline(),p=await prepare(context('I wait.','Bea repeats an unsupported claim about the notepad.'),b),t=tx(p);
  t.access=[access('ledger:notepad',['bea'],ev(p,'assistant'))];
  assert.throws(()=>commitTransaction(t,p),/exclusion/);
});

test('first-save grounded disclosure works in either order and preserves absent recipients',async()=>{
  const ctx=freshContext();ctx.mainResponse='Bea alone reads the key tag: HQ 24-A. She then tells Alex exactly what it says; Clara and Rowan are absent.';
  const p=await prepare(ctx),ids=ev(p,'assistant');
  for(const reverse of [false,true]){
    const t=initialize(p);t.changes=t.changes.filter(c=>c.ref!=='ledger:power');
    t.changes.push(change('ledger:key_tag',{kind:'reference',fact:'The key tag reads HQ 24-A.',truth:'established'},ids));
    t.access=[access('ledger:key_tag',['bea'],ids,'observed','knows'),access('ledger:key_tag',['alex'],ids,'disclosed','knows','bea')];
    if(reverse)t.access.reverse();
    const s=commitTransaction(t,p);assert.deepEqual(s.ledger[0].holders.map(h=>[h.who,h.stance]).sort(),[['alex','knows'],['bea','knows']]);
  }
});

test('self-disclosure reports the offending recipient group and never silently removes the sender',async()=>{
  const ctx=freshContext(),p=await prepare(ctx),t=initialize(p,6),before=JSON.stringify(t);
  t.access=[access('ledger:power',['alex','rowan'],ev(p,'assistant'),'disclosed','heard','rowan')];
  const unchanged=JSON.stringify(t),r=await finalize(p,t,ctx);assert.equal(r.success,false);
  assert.match(r.error,/access\[0\].*different named sender.*who must exclude/);assert.equal(JSON.stringify(t),unchanged);
  assert.notEqual(unchanged,before);assert.equal(p.baseline,null);
});

test('historical first-reply retry recovers after rejection, then two updates preserve quiet memory',async()=>{
  const first=freshContext(),p=await prepare(first),bad=initialize(p,7);
  assert.equal((await finalize(p,bad,first)).success,false);
  const second={...first,recentMessages:[...first.recentMessages,{id:'a1',role:'assistant',content:first.mainResponse},{id:'u2',role:'user',content:'I wait by the map.'}],mainResponse:'Bea waits with Alex. No one else enters.'};
  const blocked=await prepare(second);assert.match(blocked.blocked,/without an accepted keeper checkpoint/);
  // Pinned host forMessageId truncates here and excludes this target from the base lookup.
  const historical={...first,recentMessages:[...first.recentMessages,{id:'a1',role:'assistant',content:first.mainResponse}]};
  const retry=await prepare(historical);assert.equal(retry.turn,p.turn);assert.ok(!retry.sources.some(s=>s.text.includes('No one else enters')));
  let r=await finalize(retry,initialize(retry,6),historical);assert.equal(r.success,true,r.error);
  let b=JSON.parse(r.data.text),preserved=structuredClone({cast:b.cast,ledger:b.ledger,plans:b.plans,directives:b.directives});
  for(const ctx of [second,{...second,recentMessages:[...second.recentMessages,{id:'a2',role:'assistant',content:second.mainResponse},{id:'u3',role:'user',content:'I pause once more.'}],mainResponse:'Bea continues waiting by the map.'}]){
    const next=await prepare(ctx,b);r=await finalize(next,tx(next),ctx,b);assert.equal(r.success,true,r.error);b=JSON.parse(r.data.text);
    assert.deepEqual({cast:b.cast,ledger:b.ledger,plans:b.plans,directives:b.directives},preserved);
  }
  assert.equal(b.revision,3);
});

test('the shipped prompt audience examples pass the same compiler as real transactions',async()=>{
  const prompt=readFileSync(new URL('../Keeper_Prompt_v4.1.4.txt',import.meta.url),'utf8');
  const rows=prompt.split('\n').filter(l=>l.startsWith('{"ref":"ledger:station_power"')||l.startsWith('{"ref":"ledger:key_tag"')||l.startsWith('{"op":"set","ref":"ledger:station_power"')).map(JSON.parse);
  assert.equal(rows.length,4);
  const ctx=freshContext();ctx.mainResponse='Rowan tells Alex and Bea that the remote station lost power. Clara is outside and cannot hear. Bea alone reads the key tag: HQ 24-A. She then tells Alex exactly what it says; Clara is absent.';
  const p=await prepare(ctx),t=initialize(p);t.changes=t.changes.filter(c=>c.ref!=='ledger:power');
  const report=rows[0];report.evidence=ev(p,'assistant','remote station');t.changes.push(report);
  t.changes.push(change('ledger:key_tag',{kind:'reference',fact:'The key tag reads HQ 24-A.',truth:'established'},ev(p,'assistant','key tag')));
  t.access=rows.slice(1).map(a=>({...a,evidence:ev(p,'assistant',a.ref.endsWith('station_power')?'remote station':'key tag')}));
  const s=commitTransaction(t,p);assert.equal(s.ledger.length,2);assert.ok(s.ledger.every(r=>!r.holders.some(h=>h.who==='clara')));
});
