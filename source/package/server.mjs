import {hash} from './sources.mjs';
import {requireValid,baselineHash} from './keeper-core.mjs';
import {prepareEvidence} from './evidence.mjs';
import {commitTransaction} from './transaction.mjs';

export const PACKAGE_ID='personal-character-memory-v4-1';
export const VERSION='4.1.2';
const PROTOCOL='keeper-v412-runtime-1';
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
  if(Number(agent.settings?.contextSize)!==24)throw Error('Apply v4.1.2 settings in the Keeper panel, then refresh Marinara. The recovery input pool must be 24 messages.');
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
          turn:hash([base_hash,evidence.anchor.turn_key,evidence.fingerprint]).slice(0,16),
          // Canonical ledger retains earlier observations; these are current heads.
          current_states:loaded.baseline?.ledger.filter(r=>['state','belief'].includes(r.kind)&&!loaded.baseline.ledger.some(n=>n.supersedes===r.id)).map(r=>r.id)??[],
          budget:{used:loaded.baseline?JSON.stringify(loaded.baseline).length:0,target:16000,max:22000},
          instruction:'Use evidence IDs only. Emit the small transaction; code carries untouched memory. No quotes, baseline, reasoning or fiction in output.'};
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
        return {...result,data:{text:JSON.stringify(state),keeperStatus:{version:VERSION,revision:state.revision,
          coveredReplies:prep.recovery.pending_replies,mode:prep.recovery.mode,replyRef:state.anchor.reply_ref}}};
      }catch(e){return reject(result,prep,e.message);}
    }
  };
}
export async function activate({api}){return api.registerService(`agent-runtime:${PACKAGE_ID}`,makeRuntime());}
