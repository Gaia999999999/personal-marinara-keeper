import {SCHEMA,COMPLETE,DELTA,DELTA_COMPLETE,baselineHash} from '../package/keeper-core.mjs';
import {buildSources} from '../package/sources.mjs';
export const oldContext={chatId:'fixture',recentMessages:[{id:'u1',role:'user',content:'I wait at the workshop while Bea checks the key.'}],mainResponse:'Bea reads the key tag. Clara stays upstairs; Drew has left.',characters:[],persona:null,activatedLorebookEntries:[],authorNotes:null,chatSummary:null};
export function baseline() {
  const c=(id,name,role='npc',now='Last seen at the workshop.')=>({id,name,role,identity:role==='user'?'Supplied player character.':'Recurring adult cast.',voice:role==='user'?null:'Distinct speech retained.',core:null,now,growth:null});
  return {schema:SCHEMA,revision:1,base_revision:null,coverage:{mode:'initialized',through:'Key inspected; Drew remains away.',gaps:[]},scene:'Sample workshop.',
    cast:[c('alex','Alex','user'),c('bea','Bea'),c('clara','Clara'),c('drew','Drew','npc','Left the workshop; no observed return.'),c('erin','Erin','npc','Offscreen; present whereabouts unknown.'),c('finn','Finn','npc','Offscreen; present whereabouts unknown.')],
    relations:[{from:'clara',to:'alex',stance:'Cautious professional trust.',basis:'Established partnership.'}],
    ledger:[
      {id:'door',kind:'secret',fact:'The rear deadbolt was left retracted.',truth:'established',source:'Accepted departure.',holders:[{who:'alex',stance:'knows',via:'Performed the action.'},{who:'bea',stance:'knows',via:'Witnessed departure.'}],not_known_by:['clara']},
      {id:'notepad',kind:'secret',fact:'The private notepad clue contains Cedar.',truth:'established',source:'Alex read it alone.',holders:[{who:'alex',stance:'knows',via:'Private inspection.'}],not_known_by:['bea','clara']},
      {id:'key',kind:'reference',fact:'The key tag reads HQ 24-A.',truth:'established',source:'Key inspection.',holders:[{who:'alex',stance:'knows',via:'Saw the tag.'},{who:'bea',stance:'knows',via:'Saw the tag.'}],not_known_by:[]}
    ],
    plans:[{id:'riley',actor:'alex',action:'Meet Riley if access can be arranged; no cancellation established.',when:'18:30',where:'Agreed meeting point',status:'intended',known_by:['alex','bea'],source:'Accepted future arrangement.'}],
    directives:[{id:'private_notepad',rule:'Bea did not read the notepad contents.',source:'Explicit author correction.',status:'active'}],changes:[],anchor:buildSources(oldContext).anchor,complete:COMPLETE};
}
export function context(user='I ask Bea to keep watching the entrance.',reply='Bea stays by the entrance. Clara continues her work upstairs.') {
  return {...oldContext,recentMessages:[...oldContext.recentMessages,{id:'a1',role:'assistant',content:oldContext.mainResponse},{id:'u2',role:'user',content:user}],mainResponse:reply};
}
export function prepare(base=baseline(),ctx=context()) {
  return {baseline:base,base_hash:baselineHash(base),...buildSources(ctx),gap:null};
}
export function delta(prep) {
  return {schema:DELTA,base_revision:prep.baseline?.revision??0,base_hash:prep.base_hash,turn_key:prep.anchor.turn_key,through:'Latest accepted reply recorded.',scene:null,updates:[],access:[],retire:[],complete:DELTA_COMPLETE};
}
export function evidence(prep,kind,quote) {
  const s=prep.sources.find(s=>s.kind===kind && (!quote || s.text.includes(quote)));
  if(!s) throw new Error(`Fixture source absent: ${kind}`);
  return {source:s.id,quote:quote??s.text.slice(0,100)};
}
