import {hash} from './sources.mjs';
import {requireValid,baselineHash} from './keeper-core.mjs';
import {prepareEvidence} from './evidence.mjs';
import {commitTransaction,MAX_EVIDENCE_IDS,FOREGROUND_LIMITS} from './transaction.mjs';
import {sceneBoundary} from './scene-boundary.mjs';
import {memoryBudget,retentionReview} from './retention.mjs';
import {provenanceDifference} from './provenance.mjs';
import {storageForm,storedValue,storedCharacters,unpackCheckpoint,ENCODING} from './storage.mjs';
import {admissionReview} from './admission.mjs';

export const PACKAGE_ID='personal-character-memory-v4-1';
export const VERSION='4.1.11';
const PROTOCOL='keeper-v4111-runtime-1';
export function readSeed(notes){
  const seeds=[...String(notes??'').matchAll(/\[KEEPER_V41_SEED\]([\s\S]*?)\[\/KEEPER_V41_SEED\]/g)];
  if(seeds.length>1)throw Error('Select one audited seed.');
  return seeds.length?requireValid(seeds[0][1].trim()):null;
}
async function loadBase(agent,context){
  if(typeof context.loadPreviousOutput!=='function')throw Error('The host selected-history API is unavailable.');
  const previous=await context.loadPreviousOutput(agent.id);
  if(previous!=null)return {baseline:requireValid(previous),raw:storedValue(previous),origin:'previous'};
  const seed=readSeed(context.authorNotes);
  return {baseline:seed,raw:seed,origin:seed?'seed':'fresh'};
}
function identity(agent){
  if(agent.type!==PACKAGE_ID||agent.phase!=='post_processing')throw Error('Wrong native agent identity or phase.');
  if(agent.settings?.jsonContextOutput!==false)throw Error('Native keeper requires JSON Context Output OFF.');
  if(Number(agent.settings?.contextSize)!==24)throw Error('Apply v4.1.11 settings in the Keeper panel, then refresh Marinara. The recovery input pool must be 24 messages.');
  const settings=agent.settings??{};
  if(Object.values(settings.contextSources??{}).some(value=>value===true)||
      ['includePreGenInjections','includeParallelResults','triggerLorebooksForAgentCalls'].some(key=>settings[key]===true)||
      (Array.isArray(settings.enabledTools)&&settings.enabledTools.length)||
      Object.values(settings.customCapabilities??{}).some(value=>value===true)){
    throw Error('Apply v4.1.11 settings: extra context, abilities and tools must be off for the bounded Keeper input.');
  }
}
function retained(prep){
  if(!prep||!Object.hasOwn(prep,'baseline'))return 'Saved checkpoint status was not loaded; no checkpoint was written.';
  return prep.baseline?`Saved revision ${unpackCheckpoint(prep.baseline).revision} retained.`:'No checkpoint saved yet.';
}
function reject(result,prep,message){return {...result,success:false,error:`Keeper ${VERSION} NOT SAVED. ${retained(prep)} ${message}`};}

export function makeRuntime(){
  return {
    async prepareContext({agent,context}){
      let loaded;
      try{
        identity(agent);loaded=await loadBase(agent,context);
        const evidence=prepareEvidence(context,loaded.baseline);
        const base_hash=baselineHash(loaded.raw);
        return {protocol:PROTOCOL,agent_id:agent.id,chat_id:context.chatId,baseline:loaded.baseline?storageForm(loaded.baseline):null,origin:loaded.origin,base_hash,...evidence,
          storage_contract:'keeper.provenance.v1 is a lossless stored checkpoint: state is the same full memory, source/basis integers index provenance, and holders are [who,stance,viaIndex]. Every fact, audience, exclusion and row survives. These are historical provenance references, never current evidence IDs. Emit only the normal transaction. The complete encoded checkpoint, including its dictionary, must fit 22000 characters; original row/field limits still apply.',
          scene_boundary:sceneBoundary(context,evidence),
          authority_reminder:'For access, use the authority of current cited evidence: an explicit OOC restoration uses author_correction even for the character\'s own earlier experience; self needs current in-world experience. Read the whole character/audience clause across adjacent spans and cite each needed ID within the six-ID bound. Scene-boundary current-author IDs locate those clauses; these hints do not supply evidence. A prose acknowledgment is not a new observation. Do not invent access or relabel evidence; incompatible routes reject without conversion.',
          retention_review:retentionReview(loaded.baseline),
          admission_review:admissionReview(evidence.sources),
          source_policy:'Host contextSources switches suppress raw host prompt sections. The native runtime independently indexes its bounded selected messages, curated character/persona fields, activated lore and author notes as labeled sources. Card/persona/lore are canon/reference authority, not current in-world transmissions. Disabled host sections do not silently remove this indexed canon. Unindexed host content remains unusable.',
          turn:`t_${hash([base_hash,evidence.anchor.turn_key,evidence.fingerprint]).slice(0,16)}`,
          // Canonical ledger retains earlier observations; these are current heads.
          current_states:loaded.baseline?.ledger.filter(r=>['state','belief'].includes(r.kind)&&!loaded.baseline.ledger.some(n=>n.supersedes===r.id)).map(r=>r.id)??[],
          budget:{...memoryBudget(loaded.baseline),evidence_ids_per_item:MAX_EVIDENCE_IDS,foreground_text_limits:FOREGROUND_LIMITS},
          instruction:'Use indexed sources, scene_boundary and retention_review. Keep through to one short sentence (aim <=120 characters), scene to the foreground (aim <=180); each has a hard 240-character cap. For each changed cast.now, aim <=120 characters with a hard maximum of 180; keep one compact current status, not action chronology or repeated banter. Preserve still-current custody, conditions and unanswered choices before replacing it; the soft target never permits dropping them or adding ledger rows just to move overflow. Store conditional intentions in actual plans with supported audience. Banter is not a ledger transcript. Leave unanswered choices open; ignore unindexed host/GM text. Emit only the small transaction; code carries untouched memory.'};
      }catch(e){
        // The host otherwise skips a failed prepare hook and still calls the model.
        // A blocked context gives it an explicit, tiny refusal protocol instead.
        return {protocol:PROTOCOL,agent_id:agent.id,chat_id:context.chatId,...(loaded?{baseline:loaded.baseline?storageForm(loaded.baseline):null,origin:loaded.origin}:{}),blocked:e.message,instruction:'Output only {"blocked":true}. Do not reconstruct memory.'};
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
        if(baselineHash(current.raw)!==prep.base_hash||current.origin!==prep.origin||evidence.fingerprint!==prep.fingerprint||evidence.anchor.turn_key!==prep.anchor.turn_key)throw Error('Selected story or baseline changed during generation. Retry this selected reply.');
        const state=commitTransaction(result.data,prep);
        const maintenance=provenanceDifference(unpackCheckpoint(prep.baseline),state);
        return {...result,data:{text:JSON.stringify(storageForm(state)),keeperStatus:{version:VERSION,revision:state.revision,
          coveredReplies:prep.recovery.pending_replies,mode:prep.recovery.mode,replyRef:state.anchor.reply_ref,
          storage:{encoding:storageForm(state).encoding??'legacy-json',characters:storedCharacters(storageForm(state))},
          ...(maintenance.fields?{maintenance}:{} )}}};
      }catch(e){return reject(result,prep,e.message);}
    }
  };
}
export async function activate({api}){return api.registerService(`agent-runtime:${PACKAGE_ID}`,makeRuntime());}
