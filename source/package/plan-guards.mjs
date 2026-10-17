// A conservative lexical backstop, not a natural-language entailment engine.
// It protects whole scoped clauses rather than counting words or retaining an
// arbitrary old action string. Recognized clauses can move to a separately
// evidenced durable reference; the baseline itself is never new evidence.
const MARKERS=/\b(?:if|unless|until|while|only|without|not|never|no|cannot|must|needs?|requires?|required|unsuitable|unsafe|unresolved|provided|prohibited|forbidden)\b|\b(?:can|won|don|doesn|isn|aren|shouldn|mustn|wouldn|couldn)['’]t\b/i;
const fields=['action','when','where'];
const clean=text=>text.trim().replace(/\s+/gu,' ').replace(/[.;!?]+$/,'').trim();
// Closed list of titles/forms plus dotted initials, not sentence inference. Keep an
// ambiguous abbreviation boundary joined: over-preservation is safer than
// detaching a destination/time from an already recognized condition.
const ABBREVIATION=/\b(?:(?:dr|mr|mrs|ms|prof|rev|fr|sr|jr|st|mt|capt|cmdr|col|gen|lt|sgt|maj|vs|etc)\.|(?:[a-z]\.)+)$/iu;
export function planClauses(value){
  if(typeof value!=='string')return [];
  // Restrictive comma adjuncts have their own scope. Do NOT split an ordinary
  // antecedent/complement comma ("If Riley is injured, use the main trail").
  const clauses=[];let start=0;
  for(const boundary of value.matchAll(/(?<=[.;!?])\s+|,\s+(?=(?:only\s+if|while|unless|provided)\b)/giu)){
    if(value[boundary.index-1]==='.'&&ABBREVIATION.test(value.slice(0,boundary.index)))continue;
    clauses.push(value.slice(start,boundary.index));start=boundary.index+boundary[0].length;
  }
  clauses.push(value.slice(start));return clauses.map(clean).filter(Boolean);
}
export function protectedPlanClauses(plan){
  return [...new Set(fields.flatMap(f=>planClauses(plan[f]).filter(x=>MARKERS.test(x))))];
}
const sameAudience=(reference,plan)=>{
  if(reference.holders.some(h=>!['knows','heard'].includes(h.stance)))return false;
  return JSON.stringify(reference.holders.map(h=>h.who).sort())===JSON.stringify([...plan.known_by].sort());
};
export function assertPlanPreservation(transaction,base,state){
  if(!base)return;
  for(const change of transaction.changes){
    if(change.op!=='set'||!change.ref.startsWith('plans:')||!fields.some(f=>Object.hasOwn(change.data,f)))continue;
    const id=change.ref.slice(6),old=base.plans.find(p=>p.id===id);if(!old)continue;
    const next=state.plans.find(p=>p.id===id),kept=new Set(fields.flatMap(f=>planClauses(next[f])));
    const missing=protectedPlanClauses(old).filter(clause=>!kept.has(clause)&&!state.ledger.some(row=>
      row.kind==='reference'&&row.truth!=='uncertain'&&clean(row.fact)===clause&&sameAudience(row,old)));
    if(missing.length)throw Error(`${change.ref}: unresolved constraint would disappear. Preserve these exact scoped clauses in action/when/where, or in an independently supported reference with the same established audience: ${JSON.stringify(missing)}. A changed tactical leg or completed status does not resolve them. Baseline text is not current evidence; a genuine author correction still requires current explicit OOC authority.`);
  }
}
