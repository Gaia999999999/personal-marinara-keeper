import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,context} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {inspect} from '../package/keeper-core.mjs';
import {planClauses,protectedPlanClauses,assertPlanPreservation} from '../package/plan-guards.mjs';

const condition='If injured, evacuate to Dr. Vale at the station';
const base=()=>{const b=baseline();b.plans[0].action=condition+'.';b.plans[0].when=null;b.plans[0].where=null;
 b.ledger[0].source='a_1234567890abcdef.12345678: Earlier legacy source.';return b;};
const agent={id:'abbreviation-test',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const runtime=makeRuntime(),host=(b,c)=>({...c,loadPreviousOutput:async()=>b});
const prep=(b,c)=>runtime.prepareContext({agent,context:host(b,c)});
const tx=p=>({turn:p.turn,through:'Continuity check for the accepted reply.',scene:null,changes:[],access:[],complete:true});
const evidence=(p,kind)=>[p.sources.find(e=>e.current&&e.kind===kind).id];
const change=(data,e,op='set')=>({op,ref:'plans:riley',data,evidence:e});
const finish=(b,c,p,t)=>runtime.finalizeResult({agent,context:host(b,c),preparedContext:p,result:{success:true,agentId:agent.id,type:'context_injection',data:{text:JSON.stringify(t)}}});

test('O3 exact abbreviation case retains the entire if/consequence and still separates an ordinary later sentence',()=>{
 assert.deepEqual(planClauses(condition+'. Walk north.'),[condition,'Walk north']);
 assert.deepEqual(protectedPlanClauses({action:condition+'. Walk north.',when:null,where:null}),[condition]);
});
test('closed abbreviation forms preserve destination/time; ambiguous sentence endings join conservatively',()=>{
 for(const abbrev of ['Dr.','Mr.','Mrs.','Ms.','Prof.','Rev.','Fr.','Sr.','Jr.','St.','Mt.','Capt.','Cmdr.','Col.','Gen.','Lt.','Sgt.','Maj.','vs.','etc.','e.g.','i.e.','a.m.','p.m.','A.','A.J.','U.S.','DR.']){
  const line=`If delayed, wait near ${abbrev} Vale until the next check.`;
  assert.deepEqual(planClauses(line),[line.slice(0,-1)],abbrev);
 }
 const line='Only leave after 4:30 p.m. Bring a radio.';
 assert.deepEqual(planClauses(line),[line.slice(0,-1)]); // No guessed sentence boundary.
 assert.deepEqual(protectedPlanClauses({action:'If injured, evacuate to Dr. A. Vale at Mt. Spur.',when:null,where:null}),['If injured, evacuate to Dr. A. Vale at Mt. Spur']);
 assert.deepEqual(planClauses('If wet, stop. Then wait; only if safe, while Bea checks.'),['If wet, stop','Then wait','only if safe','while Bea checks']);
 // Unknown forms keep the documented old lexical behavior; no broad NLP claim.
 assert.deepEqual(planClauses('If delayed, call Unlistedabbr. Vale.'),['If delayed, call Unlistedabbr','Vale']);
});
test('O3 name/place/tail mutations reject atomically in every plan field, including prospective legacy migration',async()=>{
 for(const field of ['action','when','where'])for(const replacement of [condition.replace('Vale','Cross'),condition.replace('station','hangar'),'If injured, evacuate to Dr. Wait by the eastern gate']){
  const b=base();b.plans[0].action='Follow the current route.';b.plans[0][field]=condition+'.';
  const before=JSON.stringify(b),c=context('I propose an amended evacuation arrangement.','Bea listens without settling the change.'),p=await prep(b,c),t=tx(p);
  t.changes=[change({[field]:replacement+'.'},evidence(p,'user'))];
  const result=await finish(b,c,p,t);assert.equal(result.success,false);assert.match(result.error,/unresolved constraint/);
  assert.equal(result.data.keeperStatus,undefined);assert.equal(JSON.stringify(b),before);assert.deepEqual(p.baseline,b);
 }
});
test('retained full condition permits neutral tactical progress without locking every later sentence',async()=>{
 const b=base();b.plans[0].action=condition+'. Walk north.';
 const c=context('I propose walking east while keeping the existing evacuation condition.','Bea agrees to the walking direction.'),p=await prep(b,c),t=tx(p);
 t.changes=[change({action:condition+'. Walk east.',status:'in_progress'},evidence(p,'user'))];
 const s=commitTransaction(t,p);assert.equal(inspect(s,b).valid,true);assert.equal(s.plans[0].action,condition+'. Walk east.');
 assert.deepEqual(s.cast,b.cast);assert.deepEqual(s.plans[0].known_by,b.plans[0].known_by);assert.deepEqual(s.ledger[0].not_known_by,b.ledger[0].not_known_by);
});
test('reference relocation needs the full abbreviation-containing condition and the existing exact audience',async()=>{
 for(const variant of ['whole','fragment','wider']){
  const b=base(),c=context(`I remind Bea: ${condition}. Bea and I both hear this reminder.`,'Bea acknowledges the evacuation reminder.'),p=await prep(b,c),t=tx(p),e=evidence(p,'user');
  t.changes=[{op:'set',ref:'ledger:evacuation',data:{kind:'reference',truth:'reported',fact:variant==='fragment'?'If injured, evacuate to Dr':condition},evidence:e},change({action:'Continue to the next trail junction with Bea carrying the radio.'},e)];
  t.access=[{ref:'ledger:evacuation',who:variant==='wider'?['alex','bea','clara']:['alex','bea'],stance:'heard',route:'claim',from:null,evidence:e}];
  if(variant==='whole')assert.equal(inspect(commitTransaction(t,p),b).valid,true);
  else assert.throws(()=>commitTransaction(t,p),/unresolved constraint/);
 }
});
test('a genuine current author correction can change the destination; ordinary set is never auto-converted',async()=>{
 const b=base(),c=context('<ooc>Correct the evacuation destination to Dr. Cross at the station. Preserve the same plan audience.</ooc>','Acknowledged.'),p=await prep(b,c),t=tx(p);
 t.changes=[change({action:condition.replace('Vale','Cross')+'.'},evidence(p,'author'))];assert.throws(()=>commitTransaction(t,p),/unresolved constraint/);
 t.changes[0].op='correct';const s=commitTransaction(t,p);assert.equal(inspect(s,b).valid,true);assert.deepEqual(s.plans[0].known_by,b.plans[0].known_by);
 t.changes[0].evidence=evidence(p,'assistant');assert.throws(()=>commitTransaction(t,p),/current explicit OOC/);
});
test('O1 capitalization and O2 unpunctuated conditional tails remain fail-closed, not silently relaxed',()=>{
 for(const [oldText,newText]of [
  ['Walk the path; the cut is unsuitable for a litter.','Walk the path. The cut is unsuitable for a litter.'],
  ['Take the switchbacks unless something forces a split; the cut is unsuitable for a litter.','Walk the streambed unless something forces a split; the cut is unsuitable for a litter.']]){
  const old={id:'route',action:oldText,when:null,where:null,known_by:['alex','bea']},next={...old,action:newText};
  assert.throws(()=>assertPlanPreservation({changes:[{op:'set',ref:'plans:route',data:{action:newText}}]},{plans:[old]},{plans:[next],ledger:[]}),/unresolved constraint/);
 }
});
