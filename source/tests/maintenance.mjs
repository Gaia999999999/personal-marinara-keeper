import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,context} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {commitTransaction} from '../package/transaction.mjs';
import {inspect,baselineHash} from '../package/keeper-core.mjs';
import {normalizedLegacyTrace,maintainLegacyProvenance,provenanceDifference} from '../package/provenance.mjs';
import {protectedPlanClauses,planClauses} from '../package/plan-guards.mjs';
import {memoryBudget} from '../package/retention.mjs';

const agent={id:'maintenance-test',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const runtime=makeRuntime(),host=(b,c=context())=>({...c,loadPreviousOutput:async()=>b});
const prep=(b,c)=>runtime.prepareContext({agent,context:host(b,c)});
const tx=p=>({turn:p.turn,through:'The next scene beat is recorded.',scene:null,changes:[],access:[],complete:true});
const change=(ref,data,evidence,op='set')=>({op,ref,data,evidence});
const ids=(p,kind,text='')=>{const e=p.sources.find(x=>x.current&&x.kind===kind&&x.text.includes(text));assert(e);return [e.id];};
const submit=(b,c,p,t)=>runtime.finalizeResult({agent,context:host(b,c),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});
const origin='a_1234567890abcdef.12345678';
const trace=`${origin}: Earlier accepted wording, not a new observation.`;
const sourceBase=()=>{const b=baseline();b.ledger[0].source=trace;b.ledger[0].holders[0].via=`self ${trace}`.slice(0,80);b.ledger[0].holders[1].via=`disclosed/alex ${trace}`.slice(0,80);b.plans[0].source=trace;b.directives[0].source=trace;b.relations[0].basis=trace;return b;};
const routeBase=()=>{const b=baseline();b.plans=[{id:'route',actor:'bea',action:'Walk the main trail to the cabin; the side cut is unsuitable for a litter or rope assist.',when:'After reaching the ridge.',where:'Main trail.',status:'agreed',known_by:['alex','bea'],source:'Earlier route briefing.'}];return b;};
const constraint='the side cut is unsuitable for a litter or rope assist';
const routeContext=()=>context('I take the kit and prepare to walk.','Bea leads the walking leg from the ridge. They will rope the crossing above knee depth and choose another way above thigh depth.');

test('recognizes only exact bounded legacy provenance, preserving route and sender literally',()=>{
 assert.equal(normalizedLegacyTrace(trace),origin);assert.equal(normalizedLegacyTrace(`disclosed/alex ${trace}`.slice(0,80),true),`disclosed/alex ${origin}`);
 for(const value of [origin,`self ${origin}`,`source ${trace}`,`x_1234567890abcdef.12345678: quote`,`${origin.toUpperCase()}: quote`,`${origin}: `,`${origin}:`,'Earlier accepted inspection.',`${origin}: ${'x'.repeat(120)}`])assert.equal(normalizedLegacyTrace(value),value);
 for(const value of [`observed/other ${trace}`,`disclosed/ ${trace}`,`self  ${trace}`,`custom ${trace}`])assert.equal(normalizedLegacyTrace(value,true),value);
});
test('normalization is pure and idempotent; modern, unknown and newly authored fields remain untouched',()=>{
 const b=sourceBase(),before=JSON.stringify(b);const {state:s,report}=maintainLegacyProvenance(b,b);
 assert.equal(JSON.stringify(b),before);assert.equal(report.fields,6);assert.equal(report.records,4);
 assert.deepEqual(maintainLegacyProvenance(s,b).state,s);assert.equal(maintainLegacyProvenance(s,b).report.fields,6);
 assert.equal(maintainLegacyProvenance(s,s).report.fields,0);
 const fresh=structuredClone(b);fresh.ledger.push({...b.ledger[0],id:'new',holders:[]});fresh.plans[0].source='u_aaaaaaaaaaaaaaaa.bbbbbbbb';
 const out=maintainLegacyProvenance(fresh,b).state;assert.equal(out.ledger.at(-1).source,trace);assert.equal(out.plans[0].source,fresh.plans[0].source);
});
test('quote suffix accounting distinguishes value characters from JSON escaping',()=>{
 const b=baseline();b.ledger[0].source=`${origin}: A quoted "line"\nnext line.`;
 const {report}=maintainLegacyProvenance(b,b);assert(report.serializedCharacters>report.valueCharacters);
});
test('normal commit adds host receipts and validates against the EXACT unnormalized predecessor',async()=>{
 const b=sourceBase(),before=JSON.stringify(b),p=await prep(b),s=commitTransaction(tx(p),p);
 assert.equal(inspect(s,b).valid,true);assert.equal(JSON.stringify(b),before);assert.equal(p.base_hash,baselineHash(b));assert.deepEqual(p.baseline,b);
 assert.equal(s.ledger[0].source,origin);assert.equal(s.ledger[0].holders[0].via,`self ${origin}`);
 assert.equal(s.changes.length,4);assert(s.changes.every(r=>r.evidence==='host:legacy-provenance-v1'));
 assert.deepEqual(s.ledger[0].not_known_by,b.ledger[0].not_known_by);assert.deepEqual(s.plans[0].known_by,b.plans[0].known_by);
 assert.equal(s.directives[0].rule,b.directives[0].rule);assert.equal(s.directives[0].status,'active');
});
test('normalization preserves facts, conditions, quiet cast, exclusions, successor links and route stances',async()=>{
 const b=sourceBase();b.ledger[2].kind='state';b.ledger.push({...b.ledger[2],id:'key_later',fact:'The key moved into the drawer.',supersedes:'key',source:trace});
 const s=commitTransaction(tx(await prep(b)),await prep(b));
 assert.deepEqual(s.cast,b.cast);assert.deepEqual(s.ledger.map(x=>[x.id,x.kind,x.fact,x.truth,x.supersedes,x.not_known_by,x.holders.map(h=>[h.who,h.stance])]),b.ledger.map(x=>[x.id,x.kind,x.fact,x.truth,x.supersedes,x.not_known_by,x.holders.map(h=>[h.who,h.stance])]));
 assert.deepEqual(s.plans.map(({source,...x})=>x),b.plans.map(({source,...x})=>x));assert.equal(inspect(s,b).valid,true);
});
test('maintenance merges with an existing legitimate receipt without changing its evidence or why',async()=>{
 const b=sourceBase(),c=context('<ooc>Keep the notepad correction active and add that its pages are private.</ooc>','Acknowledged.'),p=await prep(b,c),t=tx(p);
 t.changes=[change('directives:private_notepad',{rule:'Bea did not read the notepad contents. Its pages remain private.'},ids(p,'author'),'correct')];
 const s=commitTransaction(t,p);assert.equal(s.changes.filter(x=>x.ref==='directives:private_notepad').length,1);
 assert.match(s.changes.find(x=>x.ref==='directives:private_notepad').why,/correct from/);assert(!s.changes.find(x=>x.ref==='directives:private_notepad').evidence.startsWith('legacy-'));
});
test('failed proposals cannot perform partial format maintenance or mutate a frozen baseline',async()=>{
 const b=sourceBase(),before=JSON.stringify(b);const freeze=o=>{Object.freeze(o);Object.values(o).filter(x=>x&&typeof x==='object').forEach(freeze);};freeze(b);
 const c=context(),p=await prep(b,c),t=tx(p);t.scene='x'.repeat(241);
 const r=await submit(b,c,p,t);assert.equal(r.success,false);assert.equal(r.data.keeperStatus,undefined);assert.equal(JSON.stringify(b),before);
});
test('new metadata status reports normalization; an unchanged quiet follow-up has none',async()=>{
 const b=sourceBase(),c=context(),p=await prep(b,c),r=await submit(b,c,p,tx(p));assert.equal(r.success,true,r.error);
 assert.equal(r.data.keeperStatus.maintenance.fields,6);const s=JSON.parse(r.data.text);
 const c2={...c,recentMessages:[...c.recentMessages,{id:'a2',role:'assistant',content:c.mainResponse},{id:'u3',role:'user',content:'I keep watch.'}],mainResponse:'Bea waits.'};
 const p2=await prep(s,c2),r2=await submit(s,c2,p2,tx(p2));assert.equal(r2.success,true,r2.error);assert.equal(r2.data.keeperStatus.maintenance,undefined);
 const next=JSON.parse(r2.data.text);for(const g of ['cast','ledger','plans','relations','directives'])assert.deepEqual(next[g],s[g]);
});
test('raw-baseline race detection remains exact even when old and changed baselines would normalize identically',async()=>{
 const b=sourceBase(),c=context(),p=await prep(b,c),changed=structuredClone(b);changed.ledger[0].source=`${origin}: Different clipped wording.`;
 assert.equal(normalizedLegacyTrace(changed.ledger[0].source),origin);
 const r=await runtime.finalizeResult({agent,context:host(changed,c),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(tx(p))}}});
 assert.equal(r.success,false);assert.match(r.error,/baseline changed/);
});
test('model cannot author provenance or maintenance fields, retire rows, coalesce or use receipts as evidence',async()=>{
 const b=sourceBase(),p=await prep(b),t=tx(p),e=ids(p,'user');
 for(const field of ['source','basis','via']){t.changes=[change('ledger:door',{[field]:origin},e)];assert.throws(()=>commitTransaction(t,p),/forbidden/);}
 t.changes=[];for(const field of ['retire','coalesce','maintenance'])assert.throws(()=>commitTransaction({...t,[field]:[]},p),/unknown/);
 t.changes=[change('cast:alex',{now:'At the door.'},['legacy-provenance-v1:abcd'])];assert.throws(()=>commitTransaction(t,p),/unknown or wrong-scope/);
});
test('normalizer does not salvage malformed overlong legacy fields',async()=>{
 const b=baseline();b.ledger[0].source=`${origin}: ${'x'.repeat(130)}`;assert.equal(normalizedLegacyTrace(b.ledger[0].source),b.ledger[0].source);
 const p=await prep(b);assert(p.blocked);assert.equal(inspect(b).valid,false);
});
test('near-cap legacy checkpoint gains headroom while all domain values and hard limits stay fixed',async()=>{
 const b=sourceBase();b.ledger=[];
 for(let i=0;i<23;i++)b.ledger.push({id:`history_${i}`,kind:'reference',fact:'The old service route is usable only after inspection; do not assume it is cleared. '.repeat(4).slice(0,310),truth:'reported',source:trace.padEnd(120,'x'),holders:['alex','bea','drew'].map(who=>({who,stance:'heard',via:`claim ${trace}`.padEnd(80,'x').slice(0,80)})),not_known_by:['clara']});
 while(JSON.stringify(b).length>21800){for(const row of b.ledger)row.fact=row.fact.slice(0,-1);}
 assert(JSON.stringify(b).length>=20000);assert.equal(inspect(b).valid,true,JSON.stringify(inspect(b)));
 const before=JSON.stringify(b),p=await prep(b),s=commitTransaction(tx(p),p);assert.equal(inspect(s,b).valid,true);
 assert(JSON.stringify(s).length<before.length);assert.equal(JSON.stringify(b),before);
 assert.equal(memoryBudget(s).max,22000);assert.equal(memoryBudget(s).row_limits.ledger,36);assert.deepEqual(s.cast,b.cast);
});
test('maintenance cannot rescue an over-cap result with no recognized legacy suffixes',async()=>{
 const b=baseline(),p=await prep(b),t=tx(p),e=ids(p,'user');
 for(let i=0;i<24;i++)t.changes.push(change(`ledger:new_${i}`,{kind:'reference',fact:'x'.repeat(350),truth:'reported'},e));
 // A large base plus additions remains bounded by the ordinary canonical cap.
 for(let i=0;i<8;i++)b.ledger.push({id:`prior_${i}`,kind:'reference',fact:'y'.repeat(350),truth:'reported',source:'Earlier statement.',holders:[],not_known_by:[]});
 const p2=await prep(b);t.turn=p2.turn;for(const c of t.changes)c.evidence=ids(p2,'user');
 t.access=t.changes.slice(0,4).map(c=>({ref:c.ref,who:['alex','bea','clara','drew','erin','finn'],stance:'heard',route:'claim',from:null,evidence:ids(p2,'user')}));
 assert.throws(()=>commitTransaction(t,p2),/budget|36 rows/);
});
test('actual-pattern R2 equal-length route rewrite rejects atomically instead of passing the 40% guard',async()=>{
 const b=routeBase(),c=routeContext(),p=await prep(b,c),t=tx(p),before=JSON.stringify(b);
 t.changes=[change('plans:route',{action:'Walk from the ridge to the cabin using the streambed trail; Bea on point and Alex watching both flanks. Rope the crossing above the knee and find another way above the thigh.',status:'in_progress'},ids(p,'assistant'))];
 assert(t.changes[0].data.action.length>b.plans[0].action.length);
 assert.throws(()=>commitTransaction(t,p),/unresolved constraint would disappear/);assert.equal(JSON.stringify(b),before);
});
test('the same route progress passes while retaining the scoped constraint; foreground carries tactics',async()=>{
 const b=routeBase(),c=routeContext(),p=await prep(b,c),t=tx(p);t.scene='At the ridge trailhead; Bea on point and Alex carrying the kit.';
 t.changes=[change('plans:route',{action:`Walk from the ridge to the cabin along the streambed; ${constraint}.`,status:'in_progress'},ids(p,'assistant'))];
 const s=commitTransaction(t,p);assert.equal(s.plans[0].status,'in_progress');assert.equal(inspect(s,b).valid,true);assert.deepEqual(s.plans[0].known_by,b.plans[0].known_by);
});
test('whole condition can relocate between plan fields without losing negation or scope',async()=>{
 const b=routeBase(),c=routeContext(),p=await prep(b,c),t=tx(p);
 t.changes=[change('plans:route',{action:'Walk from the ridge along the main trail to the cabin, with Bea leading and Alex carrying the kit.',when:constraint},ids(p,'assistant'))];
 assert.equal(commitTransaction(t,p).plans[0].when,constraint);
});
test('a separately evidenced exact reference with the same audience permits tactical replacement',async()=>{
 const b=routeBase(),c=context(`I remind Bea: ${constraint}. We both hear the reminder.`, 'Bea leads the walking leg.'),p=await prep(b,c),t=tx(p),e=ids(p,'user');
 t.changes=[change('ledger:evacuation_limit',{kind:'reference',fact:constraint,truth:'reported'},e),change('plans:route',{action:'Walk from the ridge along the main trail to the cabin, with Bea leading and Alex carrying the kit.'},e)];
 t.access=[{ref:'ledger:evacuation_limit',who:['alex','bea'],stance:'heard',route:'claim',from:null,evidence:e}];
 assert.equal(commitTransaction(t,p).ledger.at(-1).fact,constraint);
});
test('wider, narrower, uncertain, wrong-kind or belief-only reference cannot substitute for a protected condition',async()=>{
 for(const variant of ['wider','narrower','uncertain','event','believes']){
  const b=routeBase(),c=context(`I repeat to Bea: ${constraint}.`,'Bea leads the walking leg.'),p=await prep(b,c),t=tx(p),e=ids(p,'user');
  t.changes=[change('ledger:evacuation_limit',{kind:variant==='event'?'event':'reference',fact:constraint,truth:variant==='uncertain'?'uncertain':'reported'},e),change('plans:route',{action:'Walk from the ridge along the main trail to the cabin, with Bea leading and Alex carrying the kit.'},e)];
  t.access=[{ref:'ledger:evacuation_limit',who:variant==='wider'?['alex','bea','clara']:variant==='narrower'?['alex']:['alex','bea'],stance:variant==='believes'?'believes':'heard',route:'claim',from:null,evidence:e}];
  assert.throws(()=>commitTransaction(t,p),/unresolved constraint/,variant);
 }
});
test('old baseline or read-only retention hints cannot authorize promoting a constraint',async()=>{
 const b=routeBase(),p=await prep(b,routeContext()),t=tx(p);
 for(const evidence of [['B1'],[p.retention_review.protected_plan_clauses[0].ref]]){
  t.changes=[change('ledger:evacuation_limit',{kind:'reference',fact:constraint,truth:'reported'},evidence)];assert.throws(()=>commitTransaction(t,p),/unknown or wrong-scope/);
 }
});
test('completed status does not authorize dropping an unresolved downstream constraint',async()=>{
 const b=routeBase(),c=routeContext(),p=await prep(b,c),t=tx(p);
 t.changes=[change('plans:route',{status:'completed',action:'The team reached the ridge and finished this immediate walking leg, then prepared for the crossing.'},ids(p,'assistant'))];
 assert.throws(()=>commitTransaction(t,p),/unresolved constraint/);
});
test('negation loss, negated enclosing text and paraphrase replacement fail closed',async()=>{
 for(const action of ['Walk the main trail to the cabin; the side cut is suitable for a litter or rope assist.',`Walk the main trail to the cabin; ignore that ${constraint}.`,'Walk the main trail to the cabin; the steep side route is inappropriate for carrying casualties.']){
  const b=routeBase(),c=routeContext(),p=await prep(b,c),t=tx(p);t.changes=[change('plans:route',{action},ids(p,'assistant'))];assert.throws(()=>commitTransaction(t,p),/unresolved constraint/);
 }
});
test('private timing conditions cannot vanish in a same-length ordinary amendment',async()=>{
 const b=baseline();b.plans[0].when='After finding Riley, only if safe, while Clara helps Riley.';
 const c=context('I discuss the schedule with Bea.','Bea keeps the arrangement open.'),p=await prep(b,c),t=tx(p);
 t.changes=[change('plans:riley',{when:'After reaching the shelter and sorting out the remaining supplies.'},ids(p,'user'))];
 assert.throws(()=>commitTransaction(t,p),/unresolved constraint/);
});
test('explicit current author correction remains available, with no automatic coercion from set',async()=>{
 const b=routeBase(),c=context('<ooc>Correct the evacuation constraint: the side cut has been explicitly cleared for the litter. Keep the same audience.</ooc>','Acknowledged.'),p=await prep(b,c),t=tx(p);
 t.changes=[change('plans:route',{action:'Walk the main trail to the cabin; the side cut has been cleared for a litter or rope assist.'},ids(p,'author'))];
 assert.throws(()=>commitTransaction(t,p),/unresolved constraint/);t.changes[0].op='correct';assert.equal(inspect(commitTransaction(t,p),b).valid,true);
 t.changes[0].evidence=ids(p,'assistant');assert.throws(()=>commitTransaction(t,p),/current explicit OOC/);
});
test('ordinary neutral tactical wording can change without retaining every old word',async()=>{
 const b=routeBase();b.plans[0].action='Walk the main trail from the ridge to the cabin.';const c=routeContext(),p=await prep(b,c),t=tx(p);
 t.changes=[change('plans:route',{action:'Approach the cabin from the ridge on foot with Bea leading.'},ids(p,'assistant'))];assert.equal(inspect(commitTransaction(t,p),b).valid,true);
 assert.deepEqual(protectedPlanClauses(b.plans[0]),[]);
});
test('routine command and fulfillment can use foreground only while retaining consequential custody and private plans',async()=>{
 const b=sourceBase();let c=context('I wait with the kit.','Bea asks Alex to tighten the pack strap.'),p=await prep(b,c),t=tx(p);
 t.changes=[change('cast:alex',{now:'Holding the kit; strap-tightening request awaits his action.'},ids(p,'assistant'))];let s=commitTransaction(t,p);
 c={...c,recentMessages:[...c.recentMessages,{id:'a2',role:'assistant',content:c.mainResponse},{id:'u3',role:'user',content:'I tighten the strap and keep hold of the kit.'}],mainResponse:'Bea nods and continues.'};
 p=await prep(s,c);t=tx(p);t.changes=[change('cast:alex',{now:'Holding the kit with the pack strap tightened.'},ids(p,'user'))];s=commitTransaction(t,p);
 assert.equal(s.ledger.length,b.ledger.length);assert.equal(s.plans[0].when,b.plans[0].when);assert.deepEqual(s.plans[0].known_by,b.plans[0].known_by);assert.deepEqual(s.cast.find(x=>x.id==='erin'),b.cast.find(x=>x.id==='erin'));
});

test('conditional antecedent and consequence stay bound; restrictive adjuncts remain independently protected',()=>{
 const bound='If Riley is injured, use the main trail for evacuation';
 assert.deepEqual(planClauses(bound+'.'),[bound]);
 assert.deepEqual(protectedPlanClauses({action:bound,when:'After the search, only if safe, while Bea helps Riley.',where:null}),[bound,'only if safe','while Bea helps Riley']);
});
test('failed route rewrite cannot publish even a valid legacy format migration',async()=>{
 const b=sourceBase();b.plans=routeBase().plans;const original=JSON.stringify(b),c=routeContext(),p=await prep(b,c),t=tx(p);
 t.changes=[change('plans:route',{action:'Walk from the ridge along the main trail to the cabin, with Bea leading and Alex carrying the kit.'},ids(p,'assistant'))];
 const r=await submit(b,c,p,t);assert.equal(r.success,false);assert.match(r.error,/unresolved constraint/);
 assert.equal(r.data.keeperStatus,undefined);assert.equal(JSON.stringify(b),original);assert.equal(b.ledger[0].source,trace);
});
test('49 maintenance receipts hit the unchanged 48 receipt cap atomically; no selective migration',async()=>{
 const b=baseline(),short=`${origin}: Earlier source.`;
 b.ledger=Array.from({length:24},(_,i)=>({id:`l_${i}`,kind:'reference',fact:'Durable fact retained.',truth:'established',source:short,holders:[],not_known_by:[]}));
 b.plans=Array.from({length:20},(_,i)=>({id:`p_${i}`,actor:'alex',action:'Wait for access.',when:null,where:null,status:'intended',known_by:['alex'],source:short}));
 b.relations=['bea','clara','drew','erin'].map(to=>({from:'alex',to,stance:'Established trust.',basis:short}));b.directives[0].source=short;
 assert.equal(inspect(b).valid,true);const original=JSON.stringify(b),c=context(),p=await prep(b,c),r=await submit(b,c,p,tx(p));
 assert.equal(r.success,false);assert.match(r.error,/changes.*48/);assert.equal(r.data.keeperStatus,undefined);assert.equal(JSON.stringify(b),original);
});
