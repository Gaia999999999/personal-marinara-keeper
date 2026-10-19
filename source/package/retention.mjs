// Read-only guidance. Classification and faithful extraction remain model work;
// none of these hints authorize evidence, rewrite a checkpoint or evict a row.
import {protectedPlanClauses} from './plan-guards.mjs';
import {storageForm,unpackCheckpoint} from './storage.mjs';
export const MEMORY_TARGET=16000;
export const MEMORY_MAX=22000;
export const ROW_LIMITS=Object.freeze({cast:12,relations:30,ledger:36,plans:20,directives:24});
const OPEN=new Set(['proposed','intended','agreed','in_progress','blocked']);

export function memoryBudget(baseline){
  baseline=baseline?unpackCheckpoint(baseline):null;
  const logical=baseline?JSON.stringify(baseline).length:0;
  const used=baseline?JSON.stringify(storageForm(baseline)).length:0;
  return {used,expanded_characters:logical,lossless_savings:logical-used,target:MEMORY_TARGET,max:MEMORY_MAX,remaining:MEMORY_MAX-used,
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
    protected_plan_clauses:(baseline?.plans??[]).map(plan=>({ref:`plans:${plan.id}`,clauses:protectedPlanClauses(plan)})).filter(x=>x.clauses.length),
    ledger_admission:{questions:['Will this matter after this immediate scene step?','Is its useful continuity absent from existing scene/cast/plan/relation memory?','Is current eligible evidence sufficient for the fact and its actual audience?'],
      examples:'A new consequential injury, custody transfer, irreversible loss, durable hazard or unresolved obligation can deserve durable memory. Routine buckle/unbuckle, testing depth before the next call, and repeated quips usually belong in current scene/cast/plan state. Do not log both an instruction and its routine fulfillment as permanent events by default. Preserve pending obligations until actually fulfilled; tight budget is not authority to omit consequences.'},
    instruction:'Before replacing a transient field or a plan action/when/where, preserve still-current custody, obligations and downstream conditions. Durable physical route hazards and return/evacuation limitations belong in a separately evidenced ledger reference with actual recipients; they are not just the current tactical leg. Retain exact protected plan clauses in action/when/where until they have a supported reference home with the same audience. A baseline clause or this list is not current evidence. Keep the old action if no supported safe rewrite fits; use scene/cast for the current step. Only genuine current author correction can bypass the conservative clause guard. These are review aids, not evidence IDs. Select consequential memory; do not archive every procedural beat.'
  };
}
