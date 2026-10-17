// Synthetic integration checks. No provider calls or private chat fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeRuntime,PACKAGE_ID,VERSION} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {inspect} from '../package/keeper-core.mjs';
import {sceneBoundary,ENDING_CHARS} from '../package/scene-boundary.mjs';
import {upgradePatch} from '../package/client.js';
import {baseline,context,oldContext} from './fixtures.mjs';

const agent={id:'scene-fixture',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const runtime=makeRuntime();
const host=(ctx,b)=>({...ctx,loadPreviousOutput:async()=>b});
const prepare=(ctx,b=baseline(),a=agent)=>runtime.prepareContext({agent:a,context:host(ctx,b)});
const proposal=p=>({turn:p.turn,through:'Engine running; the seating choice remains open.',scene:null,changes:[],access:[],complete:true});
const change=(ref,data,evidence,op='set')=>({op,ref,data,evidence});
const ev=(p,kind,text='')=>{const e=p.sources.find(s=>s.current&&s.kind===kind&&s.text.includes(text));assert(e,`source ${kind}: ${text}`);return [e.id];};
const finale=(p,t,ctx,b)=>runtime.finalizeResult({agent,context:host(ctx,b),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});
const accepted='Alex waits beside the open car door holding the bag. Bea starts the engine. "Front or back?" she asks. "The bridge by six if we leave now."';

test('cleaned ending excludes conflicting GM/thought blocks while preserving the unresolved choice',async()=>{
  const ctx=context('I reach for my coat. Let us go.',accepted+'\n<gm_update>[GM_UPDATE_V1]Everyone is aboard and driving.[/GM_UPDATE_V1]</gm_update><think>Guess the next action.</think>');
  const before=JSON.stringify(ctx),p=await prepare(ctx);
  assert.equal(p.scene_boundary.accepted_narration_ending,accepted);
  assert.equal(p.scene_boundary.reply_ref,p.anchor.reply_ref);
  assert.equal(p.scene_boundary.omitted_prefix_characters,0);
  assert(p.sources.every(s=>!s.text.includes('Everyone is aboard')&&!s.text.includes('Guess the next')));
  assert.equal(JSON.stringify(ctx),before,'The shared host input is not mutated for other agents.');
});

test('unclosed hidden blocks do not expose their remainder as a current action',async()=>{
  const p=await prepare(context('I wait.',accepted+'<gm_notes>Everyone left. Unclosed annotation.'));
  assert.equal(p.scene_boundary.accepted_narration_ending,accepted);
  assert(p.sources.every(s=>!s.text.includes('Everyone left')));
});

test('the bounded ending keeps the actual final choice and explicitly reports omitted prefix',async()=>{
  const text='Old setup detail. '.repeat(170)+accepted,p=await prepare(context('I wait.',text));
  assert.equal(p.scene_boundary.accepted_narration_ending.length,ENDING_CHARS);
  assert(text.endsWith(p.scene_boundary.accepted_narration_ending));
  assert.equal(p.scene_boundary.omitted_prefix_characters,text.length-ENDING_CHARS);
  assert(p.sources.some(s=>s.text.includes('Old setup detail.')),'The full bounded catalog still supplies the prefix.');
  assert(p.scene_boundary.accepted_narration_ending.endsWith('if we leave now."'));
});

test('a clipped ending never starts inside a supplementary Unicode character',()=>{
  const text='x😀'+'a'.repeat(ENDING_CHARS-1),b=sceneBoundary({mainResponse:text},{anchor:{reply_ref:'a_test'},sources:[]});
  assert.equal(b.accepted_narration_ending,'a'.repeat(ENDING_CHARS-1));
  assert.equal(b.omitted_prefix_characters,3);
});

test('current author sources remain distinct from ordinary user actions and older corrections',async()=>{
  const first={...oldContext,recentMessages:[{id:'u1',role:'user',content:'<ooc>Old instruction.</ooc> I wait.'}]};
  const b=baseline();b.anchor=(await prepare(first,null)).anchor;
  const ctx={...first,recentMessages:[...first.recentMessages,{id:'a1',role:'assistant',content:first.mainResponse},{id:'u2',role:'user',content:'I hold the bag. <ooc>Correction: I remain beside the door.</ooc>'}],mainResponse:accepted};
  const p=await prepare(ctx,b),ids=p.scene_boundary.current_author_source_ids;
  assert(ids.length>0);
  assert.deepEqual(ids,p.sources.filter(s=>s.current&&s.kind==='author').map(s=>s.id));
  assert(p.sources.filter(s=>ids.includes(s.id)).every(s=>s.text.includes('Correction:')));
});

test('field correction from a saved erroneous foreground preserves every unrelated record and audience',async()=>{
  const b=baseline();b.scene='The car is already driving.';b.cast.find(c=>c.id==='alex').now='Aboard the departing car.';b.cast.find(c=>c.id==='bea').now='Driving away.';
  const ctx=context('<ooc>Correction: The car remains stationary. Alex is beside the open door holding the bag. Bea waits at the wheel with the engine running. No boarding or departure occurred. This is a one-time current-state correction; preserve other memory.</ooc>','OOC: Correction noted; scene remains paused.');
  const p=await prepare(ctx,b),t=proposal(p);t.through='Current foreground corrected; no fictional time or action advances.';t.scene='Stationary car at the workshop; seating and departure remain unresolved.';
  const ids=ev(p,'author','Correction:');t.changes=[change('cast:alex',{now:'Beside the open car door holding the bag; seating is undecided.'},ids,'correct'),change('cast:bea',{now:'At the wheel of the stationary car, engine running.'},ids,'correct')];
  const result=await finale(p,t,ctx,b);assert.equal(result.success,true,result.error);
  const s=JSON.parse(result.data.text);assert.equal(s.revision,2);assert.equal(s.base_revision,1);assert.equal(inspect(s,b).valid,true);
  for(const group of ['relations','ledger','plans','directives'])assert.deepEqual(s[group],b[group]);
  for(const id of ['clara','drew','erin','finn'])assert.deepEqual(s.cast.find(c=>c.id===id),b.cast.find(c=>c.id===id));
  assert.equal(b.scene,'The car is already driving.');assert.equal(result.data.keeperStatus.version,VERSION);
});

test('an ordinary suggestion cannot acquire author-correction authority',async()=>{
  const p=await prepare(context('I suggest waiting beside the door.',accepted)),t=proposal(p);
  t.changes=[change('cast:alex',{now:'Beside the door.'},ev(p,'user'),'correct')];
  assert.throws(()=>commitTransaction(t,p),/current explicit OOC/);
});

test('omitted timing remains byte-identical and does not require an enlarged limit',async()=>{
  const b=baseline(),p=await prepare(context('I check the route.',accepted),b),t=proposal(p);
  t.changes=[change('plans:riley',{status:'in_progress'},ev(p,'user'))];
  const s=commitTransaction(t,p);assert.equal(s.plans[0].when,b.plans[0].when);assert.equal(s.plans[0].action,b.plans[0].action);
  t.changes[0].data.when='x'.repeat(101);assert.throws(()=>commitTransaction(t,p),/maximum 100/);
});

test('extra context and abilities block with retained state instead of silently widening the input',async()=>{
  for(const extra of [{contextSources:{chatHistory:true}},{includePreGenInjections:true},{includeParallelResults:true},{triggerLorebooksForAgentCalls:true},{enabledTools:['web']},{customCapabilities:{edit_messages:true}}]){
    const b=baseline(),a={...agent,settings:{...agent.settings,...extra}},ctx=host(context(),b),p=await runtime.prepareContext({agent:a,context:ctx});
    assert.match(p.blocked,/extra context/);assert.equal(p.baseline,undefined);
    const result=await runtime.finalizeResult({agent:a,context:ctx,preparedContext:p,result:{agentId:a.id,type:'context_injection',success:true,data:{text:'{"blocked":true}'}}});
    assert.equal(result.success,false);assert.match(result.error,/checkpoint status was not loaded/);assert.equal(result.data.keeperStatus,undefined);
  }
});

test('Apply Settings clears the unwanted channels and preserves the selected connection/preferences',()=>{
  const input={connectionId:'selected',settings:{temperature:0.35,customCapabilities:{edit_messages:true},includeParallelResults:true,contextSources:{chatHistory:true}}};
  const patch=upgradePatch(input);assert(patch.name.includes(VERSION));assert.deepEqual(patch.settings.customCapabilities,{});assert.equal(patch.settings.includeParallelResults,false);assert(Object.values(patch.settings.contextSources).every(x=>!x));assert.equal(patch.settings.temperature,0.35);assert.equal(patch.connectionId,undefined);assert.equal(input.connectionId,'selected');
});

test('a concurrent edit still rejects even with an unchanged ending',async()=>{
  const b=baseline(),ctx=context('I wait.','First detail. '+accepted),p=await prepare(ctx,b),t=proposal(p);
  const edited={...ctx,mainResponse:'Changed earlier detail. '+accepted},r=await finale(p,t,edited,b);
  assert.equal(r.success,false);assert.match(r.error,/changed during generation/);
});

test('the shipped contract scopes the host copy and all foreground fields without changing checkpoint schema',()=>{
  const prompt=readFileSync(new URL('../Keeper_Prompt_v4.1.9.txt',import.meta.url),'utf8'),agentFile=JSON.parse(readFileSync(new URL('../package/agents.json',import.meta.url),'utf8'))[0];
  assert.equal(agentFile.defaultPromptTemplate,prompt.trim());
  for(const text of ['NOT additional evidence','through, scene, cast.now, plans and ledger','not a permanent ban on movement','one-time OOC correction','when <=100','all pending user choices'])assert(prompt.includes(text),text);
  assert.equal(baseline().schema,'character_memory.v4.1');
});
