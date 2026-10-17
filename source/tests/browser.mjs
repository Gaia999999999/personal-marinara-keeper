import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright/index.mjs`));
const id='personal-character-memory-v4-1',tag=`marinara-capability-${id}`;
let saved=null,unavailable=false,patch=null;
const server=createServer(async(req,res)=>{
  const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(req.url==='/client.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(readFileSync(new URL('../package/client.js',import.meta.url)));return;}
  if(req.url.startsWith('/api/agents/cadence/')){send({agentType:id,lastSuccessfulRun:saved?{messageId:saved,createdAt:'2026-10-13T00:00:00Z'}:null},unavailable?503:200);return;}
  if(req.url.startsWith('/api/chats/')){send([{id:'u1',role:'user',rowid:2},{id:'a1',role:'assistant',rowid:3},{id:'u2',role:'user',rowid:4},{id:'a2',role:'assistant',rowid:5}]);return;}
  if(req.url==='/api/agents'){send([{type:id,connectionId:'keep-this-model',settings:'{"contextSize":8,"temperature":0.2}'}]);return;}
  if(req.method==='PATCH'&&req.url===`/api/agents/type/${id}`){let body='';for await(const c of req)body+=c;patch=JSON.parse(body);assert.equal(req.headers['x-marinara-csrf'],'1');send({ok:true});return;}
  res.writeHead(200,{'Content-Type':'text/html'});res.end(`<!doctype html><meta charset="utf-8"><title>Keeper panel test</title><style>body{background:#17191f;color:#dce3ee;padding:40px;font-family:system-ui}main{max-width:540px;margin:auto}</style><main><h2>Pinewatch · Keeper status</h2><${tag} view="tracker"></${tag}></main><script type="module">import '/client.js';const el=document.querySelector('${tag}');el.capabilityProps={chatId:'fixture'};el.dispatchEvent(new CustomEvent('marinara-capability-props'));</script>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:800,height:620}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByText('No successful save recorded',{exact:true}).waitFor();assert.equal(patch,null);
  saved='a1';await page.getByRole('button',{name:'Refresh status'}).click();await page.getByText('Last recorded save: #3 · 1 newer reply',{exact:true}).waitFor();
  await page.getByText('Update setup',{exact:true}).click();await page.getByRole('button',{name:'Apply v4.1.1 settings'}).click();
  await page.getByText('v4.1.1 settings applied. Refresh Marinara before the test.',{exact:true}).waitFor();assert.equal(patch.settings.contextSize,24);assert.equal(patch.connectionId,undefined);assert.equal(patch.settings.temperature,0.2);
  await page.screenshot({path:new URL('../../../research/keeper-repair-411/panel-check.png',import.meta.url).pathname});
  saved='a2';await page.getByRole('button',{name:'Refresh status'}).click();await page.getByText('Last recorded save: #5',{exact:true}).waitFor();
  unavailable=true;await page.getByRole('button',{name:'Refresh status'}).click();await page.getByText('Saved status unavailable',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  const report={passed:true,checks:['empty status','recorded save with newer reply','no automatic writes','explicit settings patch preserves model/other preferences','latest save is not called verified current','HTTP failure is unavailable, not empty','no browser runtime errors'],environment:'Local Chromium with mocked pinned-host API shapes, not a live Marinara installation'};
  writeFileSync(new URL('../../../research/keeper-repair-411/browser-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
