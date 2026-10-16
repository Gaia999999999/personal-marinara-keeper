import {anchorMatches, buildSources, hash, narrative, normalize} from './sources.mjs';

export const NORMAL_WINDOW=8;
export const RECOVERY_WINDOW=24;
const MAX_EVIDENCE_CHARS=80000;
const MAX_SPANS=800;
const messageRef=m=>`${m.role[0]}_${hash([m.role,m.role==='assistant'?narrative(m.content):normalize(m.content)]).slice(0,16)}`;

// Scope is derived by code from explicit author markup, never by the model.
// Ordinary parenthetical roleplay is not author authority.
export function scopes(text,kind){
  if(kind!=='user')return [{kind,text}];
  const pattern=/<ooc\b[^>]*>[\s\S]*?(?:<\/ooc\s*>|(?![\s\S]))|\[OOC\s*:[\s\S]*?\]|\(OOC\s*:[\s\S]*?\)|^[\t ]*OOC[\t ]*:[^\n]*/gim;
  const result=[];let end=0;
  for(const m of text.matchAll(pattern)){
    if(m.index>end)result.push({kind:'user',text:text.slice(end,m.index)});
    result.push({kind:'author',text:m[0]});end=m.index+m[0].length;
  }
  if(end<text.length)result.push({kind:'user',text:text.slice(end)});
  return result;
}

function chunks(text){
  const parts=[];let remaining=text.trim();
  while(remaining.length>190){
    const space=remaining.lastIndexOf(' ',190),stop=space>=100?space:190;
    parts.push(remaining.slice(0,stop));remaining=remaining.slice(stop).trimStart();
  }
  if(remaining)parts.push(remaining);
  return parts;
}

export function prepareEvidence(context,baseline){
  let history=(context.recentMessages??[]).filter(m=>['user','assistant'].includes(m.role));
  const reply=narrative(context.mainResponse);
  if(!reply)throw Error('No completed assistant reply is available.');
  if(history.at(-1)?.role==='assistant'&&narrative(history.at(-1).content)===reply)history=history.slice(0,-1);
  const supplied=history.length;
  history=history.slice(-RECOVERY_WINDOW);
  const latestUser=history.findLast(m=>m.role==='user');
  if(baseline && anchorMatches(latestUser,{role:'assistant',content:context.mainResponse},baseline.anchor))throw Error('This exact user/reply pair is already committed. No catch-up or seed is needed; retry against the host-selected prior message.');
  let anchorIndex=-1;
  if(baseline){
    anchorIndex=history.findLastIndex((m,index)=>{
      if(m.role!=='assistant')return false;
      const user=history.slice(0,index).findLast(row=>row.role==='user');
      return anchorMatches(user,m,baseline.anchor);
    });
    if(anchorIndex<0){
      const bounded=supplied>RECOVERY_WINDOW?` Only the last ${RECOVERY_WINDOW} of ${supplied} supplied history entries were examined.`:'';
      throw Error(`Saved anchor not found: revision ${baseline.revision} could not be matched to a complete user/reply pair in ${history.length} supplied history entries (maximum ${RECOVERY_WINDOW}).${bounded} The pair may be missing, changed or outside this input; the count alone does not identify the cause. Keep this chat paused for review. No memory was replaced.`);
    }
  }else if(String(context.chatSummary??'').trim()||history.filter(m=>m.role==='user').length>1){
    throw Error('This is an existing story without an accepted keeper checkpoint. Start the fresh Pinewatch test or use an audited seed.');
  }
  const first=baseline?Math.min(Math.max(0,history.length-NORMAL_WINDOW),anchorIndex):Math.max(0,history.length-NORMAL_WINDOW);
  const selected=history.slice(first);
  const built=buildSources({...context,recentMessages:selected},RECOVERY_WINDOW);
  const freshRefs=new Set(history.slice(anchorIndex+1).map(messageRef));freshRefs.add(built.anchor.reply_ref);
  const catalog=[];const sources=[];
  for(const source of built.sources){
    // GM annotations are deliberately omitted from actionable evidence.
    if(source.kind==='gm')continue;
    for(const scoped of scopes(source.text,source.kind))for(const text of chunks(scoped.text)){
      const id=`E${catalog.length+1}`;
      const current=!['user','assistant'].includes(source.kind)||freshRefs.has(source.id);
      catalog.push({id,kind:scoped.kind,current,origin:source.id,text});
      sources.push({id,kind:scoped.kind,current,origin:source.id,text});
    }
  }
  const compact=[];
  if(baseline)for(const group of ['cast','relations','ledger','plans','directives'])for(const row of baseline[group]){
    const id=group==='relations'?`${row.from}>${row.to}`:row.id;
    const ref=`${group}:${id}`;
    compact.push({id:`B${compact.length+1}`,ref});
  }
  const size=catalog.reduce((n,s)=>n+s.text.length,0);
  if(size>MAX_EVIDENCE_CHARS||catalog.length>MAX_SPANS)throw Error('The bounded evidence catalog is full. No sources were silently truncated; reduce the active card/lore scope or request an audited repair.');
  const pending=history.slice(anchorIndex+1).filter(m=>m.role==='assistant').length+1;
  return {anchor:built.anchor,sources,compact,
    fingerprint:hash(built.sources),
    recovery:{mode:baseline&&pending>1?'catch_up':'normal',prior_messages:selected.length,pending_replies:pending}};
}
