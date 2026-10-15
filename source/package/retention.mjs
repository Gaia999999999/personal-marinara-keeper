// Read-only guidance. Classification and faithful extraction remain model work;
// none of these hints authorize evidence, rewrite a checkpoint or evict a row.
export const MEMORY_TARGET=16000;
export const MEMORY_MAX=22000;
export const ROW_LIMITS=Object.freeze({cast:12,relations:30,ledger:36,plans:20,directives:24});
const OPEN=new Set(['proposed','intended','agreed','in_progress','blocked']);

export function memoryBudget(baseline){
  const used=baseline?JSON.stringify(baseline).length:0;
  return {used,target:MEMORY_TARGET,max:MEMORY_MAX,remaining:MEMORY_MAX-used,
    pressure:used>=MEMORY_TARGET?'tight':'normal',
    counts:Object.fromEntries(Object.keys(ROW_LIMITS).map(group=>[group,baseline?.[group]?.length??0])),
    row_limits:{...ROW_LIMITS},
    policy:'Keep necessary facts and conditions. Avoid duplicate or low-value additions; no deletion, paraphrase-compaction or cap bypass. Pressure is guidance, not permission to omit continuity.'};
}

export function retentionReview(baseline){
  return {
    transient_fields:['coverage.through','scene','cast.now','relations.stance','anchor'],
    prior_now_refs:(baseline?.cast??[]).filter(row=>row.now!==null).map(row=>`cast:${row.id}`),
    unresolved_plan_refs:(baseline?.plans??[]).filter(row=>OPEN.has(row.status)).map(row=>`plans:${row.id}`),
    instruction:'Before replacing a transient field, check its old text for still-current custody, obligations or conditions. Give them a supported ledger/plan home first, or retain the detail in that field. Do not invent current evidence to promote an older detail. New conditional intentions belong in plans; repeated banter usually needs no new ledger row. These references are review aids, not evidence IDs.'
  };
}
