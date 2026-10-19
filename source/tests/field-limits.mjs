// Generic fixtures only; no private chats or provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeRuntime,PACKAGE_ID,VERSION} from '../package/server.mjs';
import {commitTransaction,FOREGROUND_LIMITS} from '../package/transaction.mjs';
import {inspect} from '../package/keeper-core.mjs';
import {deriveStatus} from '../package/client.js';
import {baseline,context} from './fixtures.mjs';
const agent={id:'limits-fixture',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const runtime=makeRuntime();
const prepared=async(b=baseline(),ctx=context())=>runtime.prepareContext({agent,context:{...ctx,loadPreviousOutput:async()=>b}});
const tx=p=>({turn:p.turn,through:'No new action completed.',scene:null,changes:[],access:[],complete:true});
const evidence=p=>[p.sources.find(s=>s.current&&s.kind==='user').id];

test('both overlong foreground fields appear in the same diagnostic',async()=>{
 const p=await prepared(),t=tx(p);t.through='a'.repeat(249);t.scene='b'.repeat(279);
 assert.throws(()=>commitTransaction(t,p),e=>/through is 249 characters; maximum 240/.test(e.message)&&/scene is 279 characters; maximum 240/.test(e.message));
});
test('foreground preflight accepts exact limits without rewriting the supplied text',async()=>{
 const b=baseline(),p=await prepared(b),t=tx(p);t.through='t'.repeat(240);t.scene='s'.repeat(240);
 const s=commitTransaction(t,p);assert.equal(s.coverage.through,t.through);assert.equal(s.scene,t.scene);assert.equal(inspect(s,b).valid,true);
});
test('the original hard bounds still reject a one-character overrun',async()=>{
 const p=await prepared(),t=tx(p);t.through='x'.repeat(241);t.scene='y'.repeat(241);
 assert.throws(()=>commitTransaction(t,p),e=>e.message.includes('through is 241')&&e.message.includes('scene is 241'));
 assert.deepEqual(p.budget.foreground_text_limits,FOREGROUND_LIMITS);
});
test('empty or non-text foreground fields fail together while scene null still carries',async()=>{
 const b=baseline(),p=await prepared(b),t=tx(p);t.through=' ';t.scene=7;
 assert.throws(()=>commitTransaction(t,p),e=>e.message.includes('through: expected nonempty')&&e.message.includes('scene: expected nonempty'));
 const s=commitTransaction(tx(p),p);assert.equal(s.scene,b.scene);
});
test('foreground and nested text overruns are reported together',async()=>{
 const p=await prepared(),t=tx(p);t.through='a'.repeat(241);t.scene='b'.repeat(242);
 t.changes=[{op:'set',ref:'cast:bea',data:{now:'c'.repeat(181)},evidence:evidence(p)},{op:'set',ref:'plans:riley',data:{when:'d'.repeat(101)},evidence:evidence(p)}];
 assert.throws(()=>commitTransaction(t,p),e=>['through is 241','scene is 242','now is 181','when is 101'].every(s=>e.message.includes(s)));
});
test('mixed diagnostics remain bounded and include an additional-error count',async()=>{
 const p=await prepared(),t=tx(p);t.through='a'.repeat(241);t.scene='b'.repeat(241);
 t.changes=[{op:'set',ref:'cast:bea',data:{name:'n'.repeat(81),voice:'v'.repeat(121),now:'c'.repeat(181)},evidence:[]}];
 assert.throws(()=>commitTransaction(t,p),e=>e.message.split(' | ').length===5&&e.message.endsWith('2 more validation errors'));
});
test('rejection leaves both the supplied transaction and saved memory untouched',async()=>{
 const b=baseline(),ctx={...context(),loadPreviousOutput:async()=>b},p=await runtime.prepareContext({agent,context:ctx}),t=tx(p);
 t.changes=[{op:'set',ref:'cast:bea',data:{now:'Watching the entrance.'},evidence:evidence(p)}];t.through='x'.repeat(249);t.scene='y'.repeat(279);
 const b0=JSON.stringify(b),p0=JSON.stringify(p.baseline),t0=JSON.stringify(t);
 const result=await runtime.finalizeResult({agent,context:ctx,preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});
 assert.equal(result.success,false);assert.match(result.error,/Saved revision 1 retained/);assert.match(result.error,/through is 249/);assert.match(result.error,/scene is 279/);assert.equal(result.data.keeperStatus,undefined);
 assert.equal(JSON.stringify(b),b0);assert.equal(JSON.stringify(p.baseline),p0);assert.equal(JSON.stringify(t),t0);
});
test('unknown fields and stale turn tokens remain invalid after preflight',async()=>{
 const p=await prepared(),t=tx(p);t.changes=[{op:'set',ref:'cast:bea',data:{unexpected:'value'},evidence:evidence(p)}];
 assert.throws(()=>commitTransaction(t,p),/forbidden/);
 const wrong=tx(p);wrong.turn='stale';assert.throws(()=>commitTransaction(wrong,p),/does not match/);
});
test('a new timing target can retain its own audience without changing the shared plan',async()=>{
 const b=baseline();b.plans[0].known_by.push('drew');
 const ctx=context('I wait with Bea.','Bea tells Alex alone: "Target the bridge by six if we leave now." Drew is absent and receives no update.');
 const p=await prepared(b,ctx),t=tx(p),e=p.sources.find(s=>s.current&&s.kind==='assistant'&&s.text.includes('Target the bridge'));
 t.changes=[{op:'set',ref:'plans:bridge_target',data:{actor:'bea',action:'Reach the bridge on the next travel leg.',when:'By 18:00 if leaving now.',where:'The bridge.',status:'proposed',known_by:['bea','alex']},evidence:[e.id]}];
 const s=commitTransaction(t,p);assert.deepEqual(s.plans[0],b.plans[0]);assert.deepEqual(s.plans[1].known_by,['bea','alex']);assert(!s.plans[1].known_by.includes('drew'));
 for(const group of ['cast','relations','ledger','directives'])assert.deepEqual(s[group],b[group]);
 assert.equal(inspect(s,b).valid,true);
});
test('recorded-save status can advance without another user message',()=>{
 const messages=[{id:'a7',role:'assistant',rowid:7},{id:'u8',role:'user',rowid:8},{id:'a9',role:'assistant',rowid:9}];
 const cadence=id=>({agentType:PACKAGE_ID,lastSuccessfulRun:{messageId:id}});
 const before=deriveStatus(cadence('a7'),messages),after=deriveStatus(cadence('a9'),messages);
 assert.equal(before.kind,'behind');assert.match(before.title,/Latest reply has no recorded save/);assert.match(before.title,/#7/);assert.match(before.detail,/without sending another user message/);
 assert.equal(after.kind,'recorded');assert.match(after.title,/Save recorded for latest reply.*#9/);assert.match(after.detail,/does not verify/);assert.equal(after.revision,undefined);
});
test('multiple uncovered replies and unknown saves are not presented as saved',()=>{
 const messages=[{id:'a3',role:'assistant',rowid:3},{id:'a5',role:'assistant',rowid:5},{id:'a7',role:'assistant',rowid:7}];
 const s=deriveStatus({agentType:PACKAGE_ID,lastSuccessfulRun:{messageId:'a3'}},messages);assert.equal(s.pending,2);assert.match(s.title,/Latest 2 replies have no recorded save/);
 const unknown=deriveStatus({agentType:PACKAGE_ID,lastSuccessfulRun:{messageId:'absent'}},messages);assert.equal(unknown.kind,'unknown');
});
test('shipping prompt examples stay below the soft targets and scoped timing guidance is present',()=>{
 const prompt=readFileSync(new URL('../Keeper_Prompt_v4.1.11.txt',import.meta.url),'utf8');
 const example=prompt.match(/Short example: through="([^"]+)" scene="([^"]+)"/);assert(example);assert(example[1].length<=120);assert(example[2].length<=180);
 for(const text of ['actual plan field','only part of the existing audience','separate specific plan/target','HARD maximum of 240 characters','Do not inventory preserved facts'])assert(prompt.includes(text),text);
 assert.equal(VERSION,'4.1.11');
});
