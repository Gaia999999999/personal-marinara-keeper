import {hash} from './sources.mjs';
import {requireValid,baselineHash} from './keeper-core.mjs';
import {prepareEvidence} from './evidence.mjs';
import {commitTransaction,MAX_EVIDENCE_IDS,FOREGROUND_LIMITS} from './transaction.mjs';
import {sceneBoundary} from './scene-boundary.mjs';
import {memoryBudget,retentionReview} from './retention.mjs';
import {provenanceDifference} from './provenance.mjs';

export const PACKAGE_ID='personal-character-memory-v4-1';
export const VERSION='4.1.9';
const PROTOCOL='keeper-v419-runtime-1';
export function readSeed(notes){
  const seeds=[...String(notes??'').matchAll(/\[KEEPER_V41_SEED\]([\s\S]*?)\[\/KEEPER_V41_SEED\]/g)];
  if(seeds.length>1)throw Error('Select one audited seed.');
  return seeds.length?requireValid(seeds[0][1].trim()):null;
}
async function loadBase(agent,context){
  if(typeof context.loadPreviousOutput!=='function')throw Error('The host selected-history API is unavailable.');
  const previous=await context.loadPreviousOutput(agent.id);
  if(previous!=null)return {baseline:requireValid(previous),origin:'previous'};
  const seed=readSeed(context.authorNotes);
  return {baseline:seed,origin:seed?'seed':'fresh'};
}
function identity(agent){
  if(agent.type!==PACKAGE_ID||agent.phase!=='post_processing')throw Error('Wrong native agent identity or phase.');
  if(agent.settings?.jsonContextOutput!==false)throw Error('Native keeper requires JSON Context Output OFF.');
  if(Number(agent.settings?.contextSize)!==24)throw Error('Apply v4.1.9 settings in the Keeper panel, then refresh Marinara. The recovery input pool must be 24 messages.');
  const settings=agent.settings??{};
  if(Object.values(settings.contextSources??{}).some(value=>value===true)||
      ['includePreGenInjections','includeParallelResults','triggerLorebooksForAgentCalls'].some(key=>settings[key]===true)||
      (Array.isArray(settings.enabledTools)&&settings.enabledTools.length)||
      Object.values(settings.customCapabilities??{}).some(value=>value===true)){
    throw Error('Apply v4.1.9 settings: extra context, abilities and tools must be off for the bounded Keeper input.');
  }
}
function retained(prep){
  if(!prep||!Object.hasOwn(prep,'baseline'))return 'Saved checkpoint status was not loaded; no checkpoint was written.';
  return prep.baseline?`Saved revision ${prep.baseline.revision} retained.`:'No checkpoint saved yet.';
}
function reject(result,prep,message){return {...result,success:false,error:`Keeper ${VERSION} NOT SAVED. ${retained(prep)} ${message}`};}

export function makeRuntime(){
  return {
    async prepareContext({agent,context}){
      let loaded;
      try{
        identity(agent);loaded=await loadBase(agent,context);
        const evidence=prepareEvidence(context,loaded.baseline);
        const base_hash=baselineHash(loaded.baseline);
        return {protocol:PROTOCOL,agent_id:agent.id,chat_id:context.chatId,...loaded,base_hash,...evidence,
          scene_boundary:sceneBoundary(context,evidence),
          authority_reminder:'For access, use the authority of current cited evidence: an explicit OOC restoration uses author_correction even for the character\'s own earlier experience; self needs current in-world experience. Read the whole character/audience clause across adjacent spans and cite each needed ID within the six-ID bound. Scene-boundary current-author IDs locate those clauses; these hints do not supply evidence. A prose acknowledgment is not a new observation. Do not invent access or relabel evidence; incompatible routes reject without conversion.',
          retention_review:retentionReview(loaded.baseline),
          turn:hash([base_hash,evidence.anchor.turn_key,evidence.fingerprint]).slice(0,16),
          // Canonical ledger retains earlier observations; these are current heads.
          current_states:loaded.baseline?.ledger.filter(r=>['state','belief'].includes(r.kind)&&!loaded.baseline.ledger.some(n=>n.supersedes===r.id)).map(r=>r.id)??[],
          budget:{...memoryBudget(loaded.baseline),evidence_ids_per_item:MAX_EVIDENCE_IDS,foreground_text_limits:FOREGROUND_LIMITS},
          instruction:'Use indexed sources, scene_boundary and retention_review. Keep through to one short sentence (aim <=120 characters), scene to the foreground (aim <=180); each has a hard 240-character cap. Preserve still-current custody before replacing cast.now; store conditional intentions in actual plans with supported audience. Banter is not a ledger transcript. Leave unanswered choices open; ignore unindexed host/GM text. Emit only the small transaction; code carries untouched memory.'};
      }catch(e){
        // The host otherwise skips a failed prepare hook and still calls the model.
        // A blocked context gives it an explicit, tiny refusal protocol instead.
        return {protocol:PROTOCOL,agent_id:agent.id,chat_id:context.chatId,...loaded,blocked:e.message,instruction:'Output only {"blocked":true}. Do not reconstruct memory.'};
      }
    },
    async finalizeResult({agent,context,preparedContext:prep,result}){
      if(!result.success)return reject(result,prep,result.error||'Provider returned no usable completion.');
      try{
        identity(agent);
        if(!prep||prep.protocol!==PROTOCOL||prep.agent_id!==agent.id||prep.chat_id!==context.chatId)throw Error('Prepared context is missing or mismatched.');
        if(prep.blocked)throw Error(prep.blocked);
        if(result.agentId!==agent.id||result.type!=='context_injection')throw Error('Wrong result identity or type.');
        const current=await loadBase(agent,context),evidence=prepareEvidence(context,current.baseline);
        if(baselineHash(current.baseline)!==prep.base_hash||current.origin!==prep.origin||evidence.fingerprint!==prep.fingerprint||evidence.anchor.turn_key!==prep.anchor.turn_key)throw Error('Selected story or baseline changed during generation. Retry this selected reply.');
        const state=commitTransaction(result.data,prep);
        const maintenance=provenanceDifference(prep.baseline,state);
        return {...result,data:{text:JSON.stringify(state),keeperStatus:{version:VERSION,revision:state.revision,
          coveredReplies:prep.recovery.pending_replies,mode:prep.recovery.mode,replyRef:state.anchor.reply_ref,
          ...(maintenance.fields?{maintenance}:{} )}}};
      }catch(e){return reject(result,prep,e.message);}
    }
  };
}
export async function activate({api}){return api.registerService(`agent-runtime:${PACKAGE_ID}`,makeRuntime());}
