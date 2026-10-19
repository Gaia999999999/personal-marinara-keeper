// Bounded lexical backstops, NOT semantic extraction or a source of authority.
// They only reject incomplete proposals; they create no facts or recipients.
import {planClauses} from './plan-guards.mjs';
const ASSET=/\b(?:battery|module|case|kit|key|keys|box|bag|phone|radio|weapon|document|letter|package)\b/i;
const POSITION=/\b(?:rests?|remains?|is|are|was|were|stowed|strapped|secured|stored|placed|held|carried|locked)\b/i;
const STOP=new Set('a an the is are was were be been being rests rest remains remain currently now on onto in at to of with by and'.split(' '));
const words=s=>String(s??'').toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
const anchors=s=>[...new Set(words(s).filter(w=>!STOP.has(w)))];
const scope=s=>[...words(s).filter(w=>['if','unless','until','while','not','never','no','cannot','without','only'].includes(w)),...(/n['’]t\b/i.test(s)?['not']:[])].sort().join('|');
const covers=(text,keys)=>keys.every(k=>words(text).includes(k));
const speculative=text=>/\b(?:will|would|could|might|shall|plans?|going to|intends? to|hopes? to|wants? to)\b/i.test(text);
const negative=text=>/\b(?:not|never|no|cannot|without|refuses?|refused|avoids?|avoided|instead of)\b|n['’]t\b/i.test(text);
const conditional=text=>/\b(?:if|unless|until|provided|suppose|supposing|assuming|whether)\b/i.test(text);
const intactPolarity=text=>/\b(?:not|never|no longer)\s+(?:still\s+)?intact\b|n['’]t\s+(?:still\s+)?intact\b/i.test(text)?'negative':'positive';
const conditions=text=>[...text.matchAll(/\b(if|unless|until)\b[^.!?;]{0,100}?\b(rouse|rouses|ambulatory)\b/gi)].map(m=>({operator:m[1].toLowerCase(),term:m[2].toLowerCase().replace(/^rouses$/,'rouse'),negative:negative(m[0])}));
const custodyClauses=text=>planClauses(text).filter(clause=>{
  const asset=clause.match(ASSET);if(!asset)return false;
  return words(clause.slice(0,asset.index)).length<=3&&POSITION.test(clause.slice(asset.index+asset[0].length));
});
const heads=s=>s.ledger.filter(r=>!s.ledger.some(n=>n.supersedes===r.id));
const survivingHeads=(base,state)=>heads(base).filter(old=>heads(state).some(row=>row.id===old.id&&row.fact===old.fact&&row.truth===old.truth));
const currentScene=s=>s.current&&['user','assistant'].includes(s.kind);
const familyFields={placement:['ledger'],seal:['ledger'],inspection:['ledger'],evacuation:['plans']};
const ABBREVIATION=/\b(?:(?:dr|mr|mrs|ms|prof|rev|fr|sr|jr|st|mt|capt|cmdr|col|gen|lt|sgt|maj|vs|etc)\.|(?:[a-z]\.)+)$/iu;
// A semicolon can precede the final '?' without making an auxiliary/wh-led
// question an assertion. Keep local clauses separate: a later question must
// not suppress a completed statement before the semicolon.
const QUESTION_LEAD=/(?:^|[:,"“'‘])\s*(?:(?:where|when|why|how|who|what|which)\s+)?(?:did|do|does|is|are|was|were|has|have|had|can|could|will|would|shall|should|may|might)\s+/i;

// Rejoin only contiguous catalog spans of the SAME current origin/kind. Sentence
// boundaries are examined before applying the 380-character recognition bound:
// a fragment never becomes an assertion just because its question/if was cut off.
// At most three 190-character source chunks can intersect a recognized sentence.
function views(sources,allowAuthor=false){
  const runs=[];
  for(const s of sources){
    if(!currentScene(s)&&!(allowAuthor&&s.current&&s.kind==='author')){runs.push(null);continue;}
    let run=runs.at(-1);
    if(!run||run.origin!==s.origin||run.kind!==s.kind){run={origin:s.origin,kind:s.kind,text:'',spans:[]};runs.push(run);}
    if(run.text)run.text+=' ';
    const start=run.text.length;run.text+=s.text;run.spans.push({id:s.id,start,end:run.text.length});
  }
  const out=[];
  for(const run of runs.filter(Boolean)){
    const ranges=[];let start=0;
    for(const m of run.text.matchAll(/[.!?;]["”’']*(?=\s|$)|\n+/g)){
      const end=m.index+m[0].length;
      if(m[0]==='.'&&ABBREVIATION.test(run.text.slice(0,end)))continue;
      ranges.push({start,end});start=end;
    }
    if(start<run.text.length)ranges.push({start,end:run.text.length});
    let previous=null;
    for(const range of ranges){
      const text=run.text.slice(range.start,range.end).trim();if(!text)continue;
      const source_ids=run.spans.filter(s=>s.end>range.start&&s.start<range.end&&run.text.slice(Math.max(s.start,range.start),Math.min(s.end,range.end)).trim()).map(s=>s.id);
      const view={text,kind:run.kind,origin:run.origin,source_ids,question:text.includes('?')||QUESTION_LEAD.test(text),bounded:text.length<=380&&source_ids.length<=3,previous};
      out.push(view);previous={...view,previous:null};
    }
  }
  return out;
}

// Closed, local boundary list. Do not strip arbitrary commas, 'and', 'until',
// 'unless' or positional qualifiers: those may be part of the destination/scope.
function destination(text){
  return text.split(/,\s*(?:and\s+)?then\b|\s+and\s+then\b|\s+(?:while|as)\s+(?:I|you|we|he|she|they|[A-Z][a-z]+)\s+(?:watch(?:es)?|waits?|looks?|checks?|turns?|speaks?|stands?|listens?)\b/)[0].trim();
}
function placement(view,firstPerson=true){
  if(!view.bounded||view.question||speculative(view.text))return null;
  const match=view.text.match(firstPerson?/\bI\b[^.!?;"“”]{0,85}?\b(?:set|put|place|placed|stow|stowed)\b([^.!?;]{0,250})/i:/\b(?:set|put|place|placed|stow|stowed|move|moved|carry|carried)\b([^.!?;]{0,250})/i);
  if(!match)return null;
  // Scope before the action, including a preceding If, and conditional tails.
  const prefix=view.text.slice(0,match.index+match[0].length-match[1].length);
  if(negative(prefix)||conditional(view.text))return null;
  const asset=match[1].match(ASSET);if(!asset)return null;
  const after=match[1].slice(asset.index+asset[0].length),location=after.match(/\b(?:on|onto|inside|into|in|under|to|at)\b([\s\S]*)/i);
  if(!location)return null;
  // Include the entire complement before the location: determiner negation
  // before the asset is as binding as a denial immediately before 'on'.
  // 'Neither' is placement-local; do not change condition/seal polarity rules.
  const beforeLocation=match[1].slice(0,asset.index+asset[0].length+location.index);
  const dest=destination(location[1]);if(!anchors(dest).length||negative(beforeLocation)||/\bneither\b/i.test(beforeLocation)||negative(dest))return null;
  return {asset:asset[0].toLowerCase(),anchors:[asset[0].toLowerCase(),...anchors(dest)],destination:dest};
}
function stateLocation(view){
  if(!view.bounded||view.question||speculative(view.text)||conditional(view.text)||negative(view.text))return [];
  return custodyClauses(view.text).flatMap(clause=>{
    const asset=clause.match(ASSET),after=clause.slice(asset.index+asset[0].length),pos=after.match(POSITION);
    const loc=after.slice(pos.index+pos[0].length).match(/\b(?:on|onto|inside|into|in|under|at)\b([\s\S]*)/i);
    return loc&&anchors(destination(loc[1])).length?[{asset:asset[0].toLowerCase(),anchors:[asset[0].toLowerCase(),...anchors(destination(loc[1]))]}]:[];
  });
}
function cueMatches(cue,group,row){
  const text=group==='plans'?[row.action,row.when,row.where].filter(Boolean).join(' '):row.fact;
  if(!covers(text,cue.anchors))return false;
  if(cue.condition&&!conditions(text).some(x=>JSON.stringify(x)===JSON.stringify(cue.condition)))return false;
  if(cue.family==='seal'&&(!/\b(?:seal|custody sticker)\b/i.test(text)||intactPolarity(text)!==cue.polarity))return false;
  if(cue.family==='placement'&&(speculative(text)||negative(text)||conditional(text)))return false;
  return true;
}
export function admissionReview(sources){
  const cues=[];
  const add=(family,v,keys,extra={})=>cues.push({family,source_ids:v.source_ids,anchors:keys,required_groups:familyFields[family],...extra});
  for(const v of views(sources)){
    if(!v.bounded||v.question)continue;
    const text=v.text;
    if(v.kind==='user'){
      const p=placement(v);if(!p)continue;
      const object=p.asset==='battery'?'module':p.asset;
      for(let i=cues.length-1;i>=0;i--)if(cues[i].family==='placement'&&cues[i].object===object)cues.splice(i,1);
      add('placement',v,p.anchors,{object});continue;
    }
    // Limited immediate anaphora: 'Bea checks the seal. It isn't intact.'
    // The intact assertion owns polarity/speculation; a future in the NEXT
    // sentence must not erase an already completed observation.
    const prev=v.previous;
    const seal=/\b(?:seal|custody sticker)\b/i.test(text);
    const anaphora=!seal&&/^\s*["“]?It\b/i.test(text)&&prev?.bounded&&!prev.question&&!speculative(prev.text)&&/\b(?:seal|custody sticker)\b/i.test(prev.text);
    if((seal||anaphora)&&/\bintact\b/i.test(text)&&!speculative(text)&&!conditional(text)){
      const ids=anaphora?[...new Set([...prev.source_ids,...v.source_ids])]:v.source_ids;
      if(ids.length<=3)add('seal',{...v,source_ids:ids},['intact'],{polarity:intactPolarity(text)});
    }
    if(!speculative(text)&&!conditional(text)){
      const object=text.match(/\b(?:gasket|coupling)\b/i),feature=text.match(/\b(?:misaligned|pinched|scarring|scars|scored|cross-threaded)\b/i);
      if(object&&feature)add('inspection',v,[object[0].toLowerCase(),...words(feature[0])]);
      const label=text.match(/\b(?:asset sticker|serial number)\b/i),identifier=text.match(/\b[A-Z]{1,8}[-–][A-Z0-9]{1,12}\b/);
      if(label&&identifier&&/\b(?:read|reads|bears|shows|marked|printed|stamped)\b/i.test(text))add('inspection',v,[...words(label[0]),...words(identifier[0])]);
    }
    for(const condition of conditions(text))add('evacuation',v,[],{condition});
  }
  return {cues,instruction:'Each cue is a conservative review obligation, not evidence or a generated fact. Preserve the supported placement/finding/condition in a durable ledger/plan change citing every listed current span, or retain an already-supported durable record that survives this transaction. Scene/through/cast.now do not satisfy new durable admission. Keep exact location, uncertainty, NPC intention versus user agreement, and actual audience. Unlisted access stays unknown; no holder is invented to satisfy a cue. Unsupported or over-cap proposals reject.'};
}
export function assertAdmission(tx,prep,base,state){
  const cues=admissionReview(prep.sources).cues;
  for(const cue of cues){
    const previous=base&&cue.required_groups.some(g=>(g==='ledger'?survivingHeads(base,state):base[g].filter(old=>state[g].some(row=>row.id===old.id&&cueMatches(cue,g,row)))).some(row=>cueMatches(cue,g,row)));
    const changed=tx.changes.some(c=>{
      const [g,id]=c.ref.split(':');if(!cue.required_groups.includes(g)||c.op==='compact'||!cue.source_ids.every(x=>c.evidence.includes(x)))return false;
      const row=c.op==='advance'?state.ledger.find(r=>r.supersedes===id):state[g].find(r=>r.id===id);
      return row&&cueMatches(cue,g,row);
    });
    if(!previous&&!changed)throw Error(`admission:${cue.family}: consequential current evidence ${cue.source_ids.join(', ')} has no matching durable ${cue.required_groups.join('/')} record with all supporting spans. Preserve the supported fact/condition while evidence is current; temporary status or a smaller transaction is insufficient. No fact or audience is inferred automatically.`);
  }
  if(!base)return;
  const current=views(prep.sources,true);
  for(const change of tx.changes.filter(c=>c.ref.startsWith('cast:')&&Object.hasOwn(c.data,'now'))){
    if(change.op==='correct')continue; // existing current explicit author authority required
    const id=change.ref.slice(5),old=base.cast.find(c=>c.id===id),next=state.cast.find(c=>c.id===id);
    for(const clause of custodyClauses(old?.now)){
      const key=anchors(clause),sig=scope(clause),asset=clause.match(ASSET)[0].toLowerCase();
      const retained=[next.now,...survivingHeads(base,state).map(x=>x.fact)].some(text=>planClauses(text).some(part=>scope(part)===sig&&covers(part,key)));
      // A new row can carry a legitimate move, but mere current mention of the
      // asset is insufficient. Match a current, cited placement/location and
      // its destination to a current resulting state. Never credit a post-state
      // row just because it repeats an old temporary clause using stale spans.
      const advanced=tx.changes.some(c=>{
        if(!['set','advance','correct'].includes(c.op)||!c.ref.startsWith('ledger:'))return false;
        const id=c.ref.slice(7),row=c.op==='advance'?state.ledger.find(r=>r.supersedes===id):heads(state).find(r=>r.id===id);
        if(!row||row.kind!=='state'||row.truth!=='established')return false;
        return current.some(v=>v.source_ids.every(e=>c.evidence.includes(e))&&[placement(v,false),...stateLocation(v)].filter(Boolean).some(p=>p.asset===asset&&stateLocation({text:row.fact,bounded:row.fact.length<=380,question:row.fact.includes('?')}).some(q=>q.asset===asset&&covers(row.fact,p.anchors))));
      });
      if(!retained&&!advanced)throw Error(`${change.ref}: still-current custody would disappear: ${JSON.stringify(clause)}. Retain it in now or a surviving already-supported ledger head; set/advance/correct needs its own cited current placement/location and matching destination. Stale text or a current asset mention alone is not promotion authority.`);
    }
  }
}
