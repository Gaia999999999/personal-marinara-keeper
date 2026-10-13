// Host-reported save status. Settings change only after an explicit button click.
const PACKAGE_ID='personal-character-memory-v4-1';
export function deriveStatus(cadence,messages){
  if(cadence?.agentType!==PACKAGE_ID||!Array.isArray(messages))throw Error('Unexpected status response.');
  const ordered=messages.filter(m=>['user','assistant'].includes(m.role));
  const saved=cadence.lastSuccessfulRun;
  if(!saved)return {kind:'empty',title:'No successful save recorded',detail:'Wait for the keeper. If it has finished, check its error in Agents.'};
  const index=ordered.findIndex(m=>m.id===saved.messageId&&m.role==='assistant');
  if(index<0)return {kind:'unknown',title:'Save outside this view',detail:'The host reports an earlier save, but it is not in the last 100 messages. Check the injected checkpoint.'};
  const pending=ordered.slice(index+1).filter(m=>m.role==='assistant').length;
  const message=ordered[index];
  const number=Number.isInteger(message.rowid)?message.rowid:null;
  return {kind:pending?'behind':'recorded',pending,messageId:message.id,
    title:`Last recorded save: ${number?'#'+number:'matched message'}${pending?' · '+pending+' newer '+(pending===1?'reply':'replies'):''}`,
    detail:pending?'Check Agents for a running or rejected update. Confirm the checkpoint revision before continuing.':'The host reports a save on the latest reply. This indicator does not verify the selected swipe or revision; check the injected checkpoint after rerolls.'};
}
const sourceKeys=['chatHistory','characters','persona','activatedLorebookEntries','chatSummary','authorNotes','trackerData','recalledMemories','previousOutput'];
export function upgradePatch(config={}){
  let settings=config.settings??{};if(typeof settings==='string')settings=JSON.parse(settings);
  if(!settings||typeof settings!=='object'||Array.isArray(settings))throw Error('Cannot read keeper settings.');
  return {name:'Character Memory Keeper v4.1.1 — Native',phase:'post_processing',promptTemplate:'',settings:{...settings,
    resultType:'context_injection',jsonContextOutput:false,hideOutput:true,injectAsSection:true,contextSize:24,maxTokens:8888,runInterval:1,
    contextSources:Object.fromEntries(sourceKeys.map(k=>[k,false]))}};
}
async function request(path,options={}){
  const headers={'x-marinara-csrf':'1',...(options.body?{'Content-Type':'application/json'}:{})};
  // Same authenticated, same-origin API convention as the host's API client.
  try{const secret=localStorage.getItem('marinara_admin_secret')?.trim();if(secret)headers['X-Admin-Secret']=secret;}catch{}
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers});
  if(!response.ok)throw Error(`Request failed (HTTP ${response.status}).`);
  return response.json();
}

if(typeof HTMLElement!=='undefined'&&!customElements.get(`marinara-capability-${PACKAGE_ID}`)){
  class KeeperStatus extends HTMLElement{
    static get observedAttributes(){return ['view'];}
    constructor(){
      super();this.attachShadow({mode:'open'});this.status={kind:'loading',title:'Keeper v4.1.1',detail:'Checking saved memory…'};
      this.onProps=()=>{const next=this.capabilityProps?.chatId;if(next!==this.chatId){this.chatId=next;this.status={kind:'loading',title:'Keeper v4.1.1',detail:'Checking saved memory…'};this.render();this.refresh();}else this.render();};
      this.addEventListener('marinara-capability-props',this.onProps);
    }
    connectedCallback(){this.onProps();this.render();this.timer=setInterval(()=>{if(!document.hidden&&!this.busy)this.refresh();},5000);}
    disconnectedCallback(){clearInterval(this.timer);this.controller?.abort();}
    attributeChangedCallback(){if(this.shadowRoot)this.render();}
    async upgrade(){
      if(this.upgrading)return;this.upgrading=true;this.setupMessage='Applying keeper settings…';this.render();
      try{
        const configs=await request('/api/agents'),config=configs.find(r=>r.type===PACKAGE_ID);
        await request(`/api/agents/type/${PACKAGE_ID}`,{method:'PATCH',body:JSON.stringify(upgradePatch(config))});
        this.setupMessage='v4.1.1 settings applied. Refresh Marinara before the test.';
      }catch(e){this.setupMessage=`Settings were not confirmed: ${e.message}`;}
      finally{this.upgrading=false;this.render();}
    }
    async refresh(){
      this.controller?.abort();const controller=new AbortController();this.controller=controller;
      const chatId=this.chatId;
      if(!chatId){this.status={kind:'empty',title:'Keeper v4.1.1',detail:'Open a chat to check saved memory.'};this.render();return;}
      this.busy=true;
      const timeout=setTimeout(()=>controller.abort(),10000);
      try{
        const id=encodeURIComponent(chatId);
        const [cadence,messages]=await Promise.all([request(`/api/agents/cadence/${PACKAGE_ID}/${id}`,{signal:controller.signal}),request(`/api/chats/${id}/messages?limit=100`,{signal:controller.signal})]);
        const status=deriveStatus(cadence,messages);
        if(this.controller===controller&&!controller.signal.aborted)this.status=status;
      }catch(e){
        if(this.controller!==controller||!this.isConnected)return;
        this.status={kind:'unknown',title:'Saved status unavailable',detail:e.name==='AbortError'?'The status check timed out. Try Refresh.':e.message};
      }finally{clearTimeout(timeout);if(this.controller===controller){this.busy=false;this.render();}}
    }
    render(){
      const key=JSON.stringify([this.status,this.setupMessage,this.upgrading,this.getAttribute('view')]);if(key===this.renderKey)return;this.renderKey=key;
      const root=this.shadowRoot,expanded=!!root.querySelector('details')?.open;root.replaceChildren();
      const style=document.createElement('style');style.textContent=`:host{display:block;font:12px/1.5 system-ui,sans-serif;color:var(--foreground,#ddd)}.box{padding:12px;border:1px solid var(--border,#555);border-radius:10px;background:var(--background,#202228)}.title{font-weight:650}.detail{margin:6px 0;color:var(--muted-foreground,#aaa);max-width:65ch}.badge{display:inline-block;border-radius:20px;padding:2px 8px;background:var(--muted,#333);margin-bottom:7px;font-size:10px}.current .badge{color:#5bd2ae}.behind .badge{color:#f5c068}button{font:inherit;color:inherit;background:var(--secondary,#333);border:1px solid var(--border,#666);border-radius:6px;padding:6px 10px;cursor:pointer}button:focus-visible{outline:2px solid #7caeff;outline-offset:2px}:host([view=toolbar]) .box{padding:5px 9px}:host([view=toolbar]) .detail,:host([view=toolbar]) button,:host([view=toolbar]) .badge{display:none}`;
      const box=document.createElement('div');box.className=`box ${this.status.kind}`;box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.title=this.status.detail;
      const badge=document.createElement('div');badge.className='badge';badge.textContent='KEEPER 4.1.1 · SAVED MEMORY';
      const title=document.createElement('div');title.className='title';title.textContent=this.status.title;
      const detail=document.createElement('p');detail.className='detail';detail.textContent=this.status.detail;
      const button=document.createElement('button');button.type='button';button.textContent='Refresh status';button.addEventListener('click',()=>this.refresh());
      const setup=document.createElement('details');setup.style.marginTop='10px';setup.className='detail';setup.open=expanded;
      const summary=document.createElement('summary');summary.textContent='Update setup';
      const note=document.createElement('p');note.textContent=this.setupMessage||'Once after updating: apply the packaged prompt and 24-message recovery pool. Your model connection and saved chat memory stay in place. Do this while agents are idle, then refresh Marinara.';
      const apply=document.createElement('button');apply.type='button';apply.disabled=!!this.upgrading;apply.textContent='Apply v4.1.1 settings';apply.addEventListener('click',()=>this.upgrade());
      setup.append(summary,note,apply);box.append(badge,title,detail,button,setup);root.append(style,box);
    }
  }
  customElements.define(`marinara-capability-${PACKAGE_ID}`,KeeperStatus);
}
