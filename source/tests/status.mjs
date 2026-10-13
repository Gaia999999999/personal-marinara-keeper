import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveStatus,upgradePatch} from '../package/client.js';
const id='personal-character-memory-v4-1';
const messages=[{id:'u1',role:'user',rowid:2},{id:'a1',role:'assistant',rowid:3},{id:'u2',role:'user',rowid:4},{id:'a2',role:'assistant',rowid:5}];
const cadence=messageId=>({agentType:id,lastSuccessfulRun:messageId?{messageId,createdAt:'2026-10-13T00:00:00Z'}:null});
test('save indicator shows newer replies, not a successful-generation assumption',()=>{
  const s=deriveStatus(cadence('a1'),messages);assert.equal(s.kind,'behind');assert.equal(s.pending,1);assert.match(s.title,/#3/);
});
test('latest recorded save explicitly does not certify a selected swipe',()=>{
  const s=deriveStatus(cadence('a2'),messages);assert.equal(s.kind,'recorded');assert.match(s.detail,/does not verify/);assert.equal(s.revision,undefined);
});
test('no save, out-of-view save and malformed API response remain distinct',()=>{
  assert.equal(deriveStatus(cadence(null),messages).kind,'empty');
  assert.equal(deriveStatus(cadence('outside'),messages).kind,'unknown');
  assert.throws(()=>deriveStatus({},messages),/Unexpected/);
});
test('a newly submitted user message does not count as a failed keeper reply',()=>{
  const s=deriveStatus(cadence('a2'),[...messages,{id:'u3',role:'user'}]);assert.equal(s.pending,0);
});
test('one-click settings update removes stale protocol overrides without touching model or memory',()=>{
  const config={connectionId:'chosen-model',settings:JSON.stringify({contextSize:8,temperature:0.3,jsonContextOutput:true,customPreference:'keep'}),promptTemplate:'old prompt'};
  const p=upgradePatch(config);assert.equal(p.promptTemplate,'');assert.equal(p.settings.contextSize,24);assert.equal(p.settings.maxTokens,8888);
  assert.equal(p.settings.temperature,0.3);assert.equal(p.settings.customPreference,'keep');assert.equal(p.connectionId,undefined);
  assert.ok(Object.values(p.settings.contextSources).every(x=>x===false));assert.equal(config.promptTemplate,'old prompt');
  assert.equal(p.memory,undefined);assert.equal(p.chatId,undefined);assert.throws(()=>upgradePatch({settings:'invalid'}));
});
