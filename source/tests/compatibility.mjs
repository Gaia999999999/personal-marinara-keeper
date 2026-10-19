import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,context,oldContext} from './fixtures.mjs';
import {makeRuntime,PACKAGE_ID} from '../package/server.mjs';
import {anchorMatches,buildSources,hash,narrative} from '../package/sources.mjs';
import {prepareEvidence,RECOVERY_WINDOW} from '../package/evidence.mjs';
import {inspect} from '../package/keeper-core.mjs';
import {packCheckpoint,unpackCheckpoint} from '../package/storage.mjs';
import {formatGenerationParameterError} from './host-error-formatter.mjs';

const prose='Bea checks the gate.\n\n"Hold the latch."';
const note='Clara did not hear the private exchange.';
const wrapped=(body=note,name='GM_UPDATE_V1')=>`${prose}\n\n<gm_update>\n[${name}]\n${body}\n[/${name}]\n</gm_update>`;
// Exact pinned host algorithm; this is a representation fixture, not an assertion
// about the unexported live prepareContext call site.
function hostStrip(text){let value=text;for(let old='';old!==value;){old=value;value=value.replace(/<\/?[a-zA-Z][^>]*>/g,'');}return value.replace(/\n{3,}/g,'\n\n').trim();}
const pairUser={id:'u-old',role:'user',content:'I watch the gate.'};
const oldAnchor=(u,text)=>({turn_key:hash([u.id??null,u.content,text]),user_ref:`u_${hash(['user',u.content]).slice(0,16)}`,reply_ref:`a_${hash(['assistant',text]).slice(0,16)}`,last_user_tail:u.content.slice(-320),last_reply_tail:text.slice(-480)});
const legacy=(text=hostStrip(wrapped()),u=pairUser)=>({...baseline(),anchor:oldAnchor(u,text)});
const next=(historyReply=wrapped(),user=pairUser,mainResponse='Bea keeps the gate steady.')=>({...oldContext,recentMessages:[user,{id:'a-old',role:'assistant',content:historyReply},{id:'u-next',role:'user',content:'I check the latch.'}],mainResponse});
const agent={id:'compat-agent',type:PACKAGE_ID,phase:'post_processing',settings:{jsonContextOutput:false,contextSize:24}};
const runtime=makeRuntime();
const host=(ctx,b)=>({...ctx,loadPreviousOutput:async()=>b});
const prep=(ctx,b)=>runtime.prepareContext({agent,context:host(ctx,b)});
const tx=p=>({turn:p.turn,through:'Accepted gate check recorded.',scene:null,changes:[],access:[],complete:true});
const finish=(ctx,b,p,t=tx(p))=>runtime.finalizeResult({agent,context:host(ctx,b),preparedContext:p,result:{agentId:agent.id,type:'context_injection',success:true,data:{text:JSON.stringify(t)}}});
const domains=s=>Object.fromEntries(['cast','relations','ledger','plans','directives'].map(k=>[k,s[k]]));

test('XML and tag-stripped sentinel forms have equal anchors, catalogs and fingerprints',()=>{
  const a=prepareEvidence(context('I brace.',wrapped()),baseline());
  const b=prepareEvidence(context('I brace.',hostStrip(wrapped())),baseline());
  assert.deepEqual(a,b);
  assert.equal(narrative(wrapped()),prose);
  assert(a.sources.every(s=>s.kind!=='gm'&&!s.text.includes(note)&&!s.text.includes('GM_UPDATE')));
  const refs=buildSources(context('I brace.',wrapped())).sources.filter(s=>s.kind==='gm');
  assert.equal(refs.length,1);assert.equal(refs[0].text,note);
});

test('known bare note variants, mixed case and unclosed/mismatched blocks stay non-actionable',()=>{
  for(const name of ['GM_UPDATE','GM_UPDATE_V1','gm_update_v12','GM_NOTES','gM_nOtEs_V2']){
    for(const ending of [`[/${name}]`,'','[/GM_UPDATE_V999]']){
      const input=`${prose}\n\n[${name}]\n${note}${ending}`;
      assert.equal(narrative(input),prose);
      assert(prepareEvidence(context('I wait.',input),baseline()).sources.every(s=>!s.text.includes(note)));
    }
  }
});

test('interior GM blocks, repeated notes and host blank-line collapse keep narrative identical',()=>{
  const raw='Bea waits.\n\n<gm_notes>[GM_NOTES]Private one.[/GM_NOTES]</gm_notes>\n\nAlex checks.\n\n<gm_update>[GM_UPDATE_V1]Private two.[/GM_UPDATE_V1]</gm_update>\n\nThe gate holds.';
  assert.equal(narrative(raw),narrative(hostStrip(raw)));
  for(const form of [raw,hostStrip(raw)]){
    const p=prepareEvidence(context('I wait.',form),baseline());
    assert(p.sources.every(s=>!s.text.includes('Private')));
    assert.equal(p.anchor.reply_ref,buildSources(context('I wait.',raw)).anchor.reply_ref);
  }
});

test('other hidden XML blocks remain hidden and ordinary brackets/markup remain story text',()=>{
  for(const tag of ['think','thinking','agent-context','agent_context'])assert.equal(narrative(`${prose}<${tag}>Secret analysis.</${tag}>`),prose);
  const ordinary='Bea reads [NOTE: safe] and [GM_UPDATE_EXTRA] on a <b>red</b> sign.';
  assert.equal(narrative(ordinary),ordinary);
  assert.equal(narrative('Bea waits. <gm_update>unclosed private tail'), 'Bea waits.');
  assert.throws(()=>prepareEvidence(context('I wait.','[GM_UPDATE_V1]Only metadata'),baseline()),/No completed assistant reply/);
});

test('legacy tagged-note checkpoint locates from raw or stripped history without migrating state',async()=>{
  const b=legacy(),before=JSON.stringify(b);assert.equal(inspect(b).valid,true);
  for(const text of [wrapped(),hostStrip(wrapped())]){
    const p=await prep(next(text),b);assert.equal(p.blocked,undefined);
    assert.deepEqual(p.recovery,{mode:'normal',prior_messages:3,pending_replies:1});
    assert.equal(JSON.stringify(b),before);assert(p.sources.every(s=>!s.text.includes(note)));
    assert(p.sources.filter(s=>s.kind==='assistant'&&s.text.includes('checks the gate')).every(s=>!s.current));
    const r=await finish(next(text),b,p);assert.equal(r.success,true,r.error);
    const state=JSON.parse(r.data.text);assert.equal(state.revision,2);assert.deepEqual(domains(state),domains(b));
    assert.deepEqual(state.anchor,buildSources(next(text),24).anchor);
  }
});

test('all legacy pair metadata and full content are verified, including text before retained tails',()=>{
  const u={id:'long-user',role:'user',content:'Original beginning. '+'u'.repeat(400)};
  const body='Original beginning. '+'a'.repeat(600)+'\n\n[GM_UPDATE_V1]Private.[/GM_UPDATE_V1]';
  const a={role:'assistant',content:body},anchor=oldAnchor(u,body);
  assert.equal(anchorMatches(u,a,anchor),true);
  for(const changed of [{...u,id:'different-id'},{...u,content:u.content.replace('Original','Altered')},{...u,role:'assistant'}])assert.equal(anchorMatches(changed,a,anchor),false);
  assert.equal(anchorMatches(u,{...a,content:body.replace('Original','Altered')},anchor),false);
  assert.equal(anchorMatches(u,{...a,role:'user'},anchor),false);
  for(const field of ['turn_key','user_ref','reply_ref','last_user_tail','last_reply_tail'])assert.equal(anchorMatches(u,a,{...anchor,[field]:'bad'}),false,field);
});

test('legacy compatibility rejects changed narrative, changed note and arbitrary HTML stripping',async()=>{
  const b=legacy();
  for(const text of [wrapped().replace('checks the gate','opens the gate'),wrapped('An edited GM note.'),wrapped().replace('Bea','<b>Bea</b>')]){
    assert.match((await prep(next(text),b)).blocked,/Saved anchor not found/);
  }
  assert.match((await prep(next(wrapped(),{...pairUser,id:'different'}),b)).blocked,/Saved anchor not found/);
  assert.match((await prep(next(wrapped(),{...pairUser,content:'I leave the gate.'}),b)).blocked,/Saved anchor not found/);
});

test('already-committed guard catches the legacy reply in raw, stripped and included-current history',async()=>{
  const b=legacy();
  for(const text of [wrapped(),hostStrip(wrapped())])for(const include of [false,true]){
    const ctx={...oldContext,recentMessages:[pairUser,...(include?[{id:'a-old',role:'assistant',content:wrapped()}]:[])],mainResponse:text};
    assert.match((await prep(ctx,b)).blocked,/exact user\/reply pair is already committed/);
  }
});

test('older raw-XML and blank-line-preserving anchors remain accepted',async()=>{
  const oldProse='Bea waits.\n\n\n\nAlex watches.',b=legacy(oldProse);
  const p=await prep(next(oldProse+'\n<gm_notes>Hidden.</gm_notes>'),b);
  assert.equal(p.blocked,undefined);
  const rawBase=legacy(prose),raw=await prep(next(wrapped()),rawBase);
  assert.equal(raw.blocked,undefined);
});

test('canonical saved update continues across a second raw/stripped boundary and preserves all memory',async()=>{
  const b=legacy(),ctx=next(wrapped(),pairUser,wrapped('New private note.'));
  const p=await prep(ctx,b),r=await finish(ctx,b,p);assert.equal(r.success,true,r.error);
  const s=JSON.parse(r.data.text);
  const ctx2={...ctx,recentMessages:[...ctx.recentMessages,{id:'a-next',role:'assistant',content:hostStrip(ctx.mainResponse)},{id:'u-third',role:'user',content:'I keep waiting.'}],mainResponse:'Bea waits quietly.'};
  const p2=await prep(ctx2,s);assert.equal(p2.blocked,undefined);
  const r2=await finish(ctx2,s,p2);assert.equal(r2.success,true,r2.error);
  assert.deepEqual(domains(JSON.parse(r2.data.text)),domains(b));
});

test('manual retry with raw current reply and stripped main response has one pending reply',async()=>{
  const b=legacy(),ctx=next(),a=await prep(ctx,b);
  const manual={...ctx,recentMessages:[...ctx.recentMessages,{id:'a-next',role:'assistant',content:ctx.mainResponse}]};
  const bPrep=await prep(manual,b);assert.equal(a.turn,bPrep.turn);assert.deepEqual(a.sources,bPrep.sources);
});

test('short, full and truncated inputs report unlocated anchor without claiming an overflow cause',async()=>{
  for(const n of [3,24,26]){
    const history=Array.from({length:n},(_,i)=>({id:`x${i}`,role:i%2?'assistant':'user',content:`Unrelated ${i}.`}));
    const p=await prep({...context(),recentMessages:history},baseline());
    assert.match(p.blocked,new RegExp(`Saved anchor not found: revision 1.*in ${Math.min(n,24)} supplied history entries`));
    assert.doesNotMatch(p.blocked,/Recovery window exceeded|is required|restore.*swipe|use an audited catch-up seed/);
    assert.equal(/Only the last 24 of 26/.test(p.blocked),n===26);
    assert.equal(formatGenerationParameterError(p.blocked),p.blocked);
  }
});

test('an actually out-of-window pair cannot be recovered by scanning discarded history',async()=>{
  const b=legacy(),ctx=next();
  for(let n=0;n<13;n++)ctx.recentMessages.push({id:`late${n}`,role:'assistant',content:`Later ${n}.`},{id:`user${n}`,role:'user',content:`Later user ${n}.`});
  assert(ctx.recentMessages.length>24);
  assert.match((await prep(ctx,b)).blocked,/Saved anchor not found/);
});

test('bounded tail starting at assistant cannot borrow its user from outside the window',async()=>{
  const b=legacy(),ctx=next();
  for(let n=0;n<11;n++)ctx.recentMessages.push({id:`a${n}`,role:'assistant',content:`Wait ${n}.`},{id:`u${n}`,role:'user',content:`Wait user ${n}.`});
  assert.equal(ctx.recentMessages.length,25);assert.equal(ctx.recentMessages.slice(-24)[0].role,'assistant');
  assert.match((await prep(ctx,b)).blocked,/Saved anchor not found/);assert.equal(RECOVERY_WINDOW,24);
});

test('blocked and malformed updates leave the legacy checkpoint untouched',async()=>{
  const b=legacy(),before=JSON.stringify(b),ctx=next(),p=await prep(ctx,b);
  const malformed=await finish(ctx,b,p,{...tx(p),complete:false});assert.equal(malformed.success,false);
  const changed=next(wrapped().replace('Bea checks','Bea abandons')),blocked=await prep(changed,b);
  assert.match(blocked.blocked,/Saved anchor not found/);
  const r=await finish(changed,b,blocked,{blocked:true});assert.equal(r.success,false);assert.equal(JSON.stringify(b),before);
  assert.equal(formatGenerationParameterError(r.error),r.error);
});

test('finalizer rechecks the selected historical pair after preparation',async()=>{
  const b=legacy(),ctx=next(),p=await prep(ctx,b);
  const changed=next(wrapped().replace('Hold the latch','Open the latch'));
  assert.equal((await finish(changed,b,p)).success,false);
  const altered=structuredClone(b);altered.scene='Changed concurrently.';
  assert.equal((await finish(ctx,altered,p)).success,false);
});

test('packed checkpoints retain #23 complete-anchor/GM-wrapper compatibility and reject edits',async()=>{
 const logical=legacy(),b=packCheckpoint(logical),before=JSON.stringify(b);
 for(const text of [wrapped(),hostStrip(wrapped())]){
  const ctx=next(text),p=await prep(ctx,b);assert.equal(p.blocked,undefined);
  const r=await finish(ctx,b,p);assert.equal(r.success,true,r.error);
  const state=unpackCheckpoint(r.data);assert.deepEqual(domains(state),domains(logical));assert.equal(state.revision,2);
  assert.match((await prep({...ctx,mainResponse:text,recentMessages:[pairUser]},b)).blocked,/already committed/);
 }
 for(const changed of [wrapped().replace('checks the gate','opens the gate'),wrapped('Changed GM note.')])assert.match((await prep(next(changed),b)).blocked,/Saved anchor not found/);
 assert.equal(JSON.stringify(b),before);
});

test('GM note text cannot authorize a new ledger fact or access under either representation',async()=>{
  for(const text of [wrapped(),hostStrip(wrapped())]){
    const p=await prep(context('I wait.',text),baseline());
    assert(!p.blocked);assert(p.sources.every(s=>!s.text.includes(note)));
    const gm=buildSources(context('I wait.',text)).sources.find(s=>s.kind==='gm');assert(gm);
    const t=tx(p);t.access=[{ref:'ledger:notepad',who:['bea'],stance:'knows',route:'observed',from:null,evidence:[gm.id]}];
    const r=await finish(context('I wait.',text),baseline(),p,t);assert.equal(r.success,false);assert.match(r.error,/unknown or wrong-scope/);
  }
});

test('actual host formatter reproduces old false toast while new diagnostic stays verbatim',()=>{
  const old='Keeper 4.1.7 NOT SAVED. Saved revision 10 retained. Recovery window exceeded: saved revision 10 is outside the last 24 supplied messages. Stop here; an audited catch-up is required. No memory was replaced.';
  assert.equal(formatGenerationParameterError(old),'The model says the messages parameter is required. Go to Chat Settings > Advanced Parameters and turn on Send for messages.');
  assert.equal(formatGenerationParameterError('Missing required parameter: messages'),'The model says the messages parameter is required. Go to Chat Settings > Advanced Parameters and turn on Send for messages.');
});

test('ten consecutive updates cross alternating wrapper forms without losing quiet cast or plans',async()=>{
  let b=legacy(),ctx=next();const protectedRows=domains(b);
  for(let i=1;i<=10;i++){
    const raw=`Bea waits at the gate, beat ${i}.\n\n<gm_update>\n[GM_UPDATE_V1]\nPrivate reference ${i}.\n[/GM_UPDATE_V1]\n</gm_update>`;
    ctx={...ctx,mainResponse:i%2?hostStrip(raw):raw};
    const p=await prep(ctx,b);assert.equal(p.blocked,undefined);assert.equal(p.recovery.pending_replies,1);
    assert(p.sources.every(s=>!s.text.includes('Private reference')));
    const r=await finish(ctx,b,p);assert.equal(r.success,true,r.error);b=JSON.parse(r.data.text);
    assert.equal(b.revision,i+1);assert.deepEqual(domains(b),protectedRows);
    ctx={...ctx,recentMessages:[...ctx.recentMessages,{id:`alternate-a${i}`,role:'assistant',content:i%2?raw:hostStrip(raw)},{id:`alternate-u${i}`,role:'user',content:`I wait another beat ${i}.`}]};
  }
});
