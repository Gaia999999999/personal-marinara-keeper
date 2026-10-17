// Generic reproductions of one- and two-row status overruns; no private exports.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {baseline,context} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {inspect} from '../package/keeper-core.mjs';

const runtime=makeRuntime();
const agent={id:'cast-status-fixture',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const host=(b,c)=>({...c,loadPreviousOutput:async()=>b});
const prepare=(b=baseline(),c=context())=>runtime.prepareContext({agent,context:host(b,c)});
const transaction=p=>({turn:p.turn,through:'Current positions recorded; choices remain open.',scene:null,changes:[],access:[],complete:true});
const update=(p,id,now)=>({op:'set',ref:`cast:${id}`,data:{now},evidence:[p.sources.find(s=>s.current&&s.kind==='assistant').id]});
const finish=(b,c,p,t)=>runtime.finalizeResult({agent,context:host(b,c),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});
const domains=s=>Object.fromEntries(['cast','relations','ledger','plans','directives'].map(k=>[k,s[k]]));
const exactLength=n=>'Waiting beside the entrance; watching the lane; awaiting a signal. '.padEnd(n,'x');

test('a 197-character status rejects atomically without trimming or publishing other changes',async()=>{
 const b=baseline(),c=context(),p=await prepare(b,c),t=transaction(p);
 t.changes=[update(p,'bea','Watching the entrance.'),update(p,'alex',exactLength(197))];
 assert.equal(t.changes[1].data.now.length,197);
 const before=JSON.stringify({b,p,t}),r=await finish(b,c,p,t);
 assert.equal(r.success,false);assert.match(r.error,/Saved revision 1 retained.*cast:alex: now is 197 characters; maximum 180/);
 assert.equal(r.data.keeperStatus,undefined);assert.equal(r.data.text,JSON.stringify(t));
 assert.equal(JSON.stringify({b,p,t}),before);
});

test('186- and 194-character statuses report both failures and retain the same predecessor',async()=>{
 const b=baseline(),c=context(),p=await prepare(b,c),t=transaction(p);
 t.changes=[update(p,'bea',exactLength(186)),update(p,'alex',exactLength(194))];
 const before=JSON.stringify({b,p,t}),r=await finish(b,c,p,t);
 assert.equal(r.success,false);assert.match(r.error,/cast:bea: now is 186 characters; maximum 180/);
 assert.match(r.error,/cast:alex: now is 194 characters; maximum 180/);
 assert.equal(r.data.keeperStatus,undefined);assert.equal(JSON.stringify({b,p,t}),before);
});

test('120 is a soft target: 121 and 180 survive verbatim; 181 remains invalid',async()=>{
 const p=await prepare();
 for(const n of [120,121,180]){
  const t=transaction(p);t.changes=[update(p,'bea',exactLength(n))];
  const s=commitTransaction(t,p);assert.equal(s.cast.find(x=>x.id==='bea').now,t.changes[0].data.now);
 }
 const t=transaction(p);t.changes=[update(p,'bea',exactLength(181))];
 assert.throws(()=>commitTransaction(t,p),/now is 181 characters; maximum 180/);
});

test('a concise status preserves custody, negation and pending choice without ledger growth or quiet-cast edits',async()=>{
 const b=baseline();b.cast.find(x=>x.id==='alex').now='Beside the car door, still holding the kit; has not chosen a seat or boarded.';
 const c=context('I keep holding the kit and wait beside the door.','Bea starts the engine. Alex remains outside with the kit. "Front or back?" Bea asks. He has not answered or boarded.');
 const p=await prepare(b,c),t=transaction(p);
 const now='Beside the open car door with the kit; seat choice unanswered, not boarded.';
 assert(now.length<=120);t.changes=[update(p,'alex',now)];
 const before=JSON.stringify(b),r=await finish(b,c,p,t);assert.equal(r.success,true,r.error);
 const s=JSON.parse(r.data.text),expected=structuredClone(b);expected.cast.find(x=>x.id==='alex').now=now;
 assert.deepEqual(domains(s),domains(expected));assert.equal(inspect(s,b).valid,true);
 assert.equal(JSON.stringify(b),before);assert.deepEqual(s.ledger[0].not_known_by,['clara']);
 assert.deepEqual(s.plans,b.plans);assert.deepEqual(s.directives,b.directives);
});

test('a later catch-up covers both replies after rejection and commits once from the retained base',async()=>{
 const b=baseline(),c=context('I stay beside the entrance.','Bea checks the red gate. Alex waits with the sealed kit; Bea has not signaled him across.');
 const p=await prepare(b,c),t=transaction(p);t.changes=[update(p,'alex',exactLength(197))];
 assert.equal((await finish(b,c,p,t)).success,false);assert.equal(b.revision,1);
 const next={...c,recentMessages:[...c.recentMessages,{id:'a2',role:'assistant',content:c.mainResponse},{id:'u3',role:'user',content:'I stay here with the kit until Bea signals.'}],mainResponse:'Bea sees a delivery van pass. She keeps Alex waiting at the gate.'};
 const q=await prepare(b,next);assert.equal(q.blocked,undefined);assert.equal(q.recovery.mode,'catch_up');assert.equal(q.recovery.pending_replies,2);
 for(const phrase of ['red gate','delivery van'])assert(q.sources.some(s=>s.current&&s.text.includes(phrase)));
 const v=transaction(q);v.changes=[{...update(q,'alex','Waiting at the gate with the sealed kit until Bea signals; no crossing yet.'),evidence:q.sources.filter(s=>s.current&&s.kind==='assistant').map(s=>s.id)}];
 const r=await finish(b,next,q,v);assert.equal(r.success,true,r.error);
 const s=JSON.parse(r.data.text);assert.equal(s.revision,2);assert.equal(s.base_revision,1);assert.equal(r.data.keeperStatus.coveredReplies,2);
 for(const group of ['ledger','plans','directives','relations'])assert.deepEqual(s[group],b[group]);
 assert.deepEqual(s.cast.filter(x=>x.id!=='alex'),b.cast.filter(x=>x.id!=='alex'));
 assert.equal(b.revision,1);
});

test('installed prompt and per-call guidance show the same target and preserve the retention priority',async()=>{
 const prompt=readFileSync(new URL('../Keeper_Prompt_v4.1.10.txt',import.meta.url),'utf8');
 const example=prompt.match(/Short status example: cast.now="([^"]+)"/);assert(example);assert(example[1].length<=120);
 for(const text of ['HARD maximum of 180 characters','Aim <=120 characters','Text of 121–180 characters is allowed','retain it there','two overlong cast entries reject the whole update'])assert(prompt.includes(text),text);
 const p=await prepare();assert.match(p.instruction,/cast.now, aim <=120 characters with a hard maximum of 180/);
 assert.match(p.instruction,/soft target never permits dropping them or adding ledger rows/);
});
