import fs from 'node:fs';
import assert from 'node:assert/strict';
import { checkChatLimit } from '../worker/chat-rate-limit.mjs';
const source = fs.readFileSync(new URL('../functions/api/chat.js', import.meta.url), 'utf8');
const { onRequestPost, onRequestOptions } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
let fetches = 0;
let limitCalls = 0;
const originalFetch = globalThis.fetch;
const env = { GEMINI_API_KEY: 'synthetic-secret', CONTACT_MAILER: { fetch: async request => {
  limitCalls++;
  assert.equal(request.headers.get('X-Chat-Client-IP'), '192.0.2.1');
  assert.equal(await request.text(), '');
  return new Response(null, { status: 204 });
} } };
function provider(reply) {
  globalThis.fetch = async (url, options) => {
    fetches++;
    assert(!url.includes('synthetic-secret'));
    assert.equal(options.headers['x-goog-api-key'], 'synthetic-secret');
    assert(options.signal instanceof AbortSignal);
    return reply ?? Response.json({ candidates: [{ content: { parts: [{ text: 'Answer one' }, { text: 'Answer two' }] } }] });
  };
}
async function run(body, status, bindings = env, headers = {}) {
  const response = await onRequestPost({request: new Request('https://example.test/api/chat', {
    method: 'POST', headers: {Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},
    body: JSON.stringify(body),
  }), env: bindings });
  assert.equal(response.status, status);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  return response;
}
try {
  provider();
  for (const body of [null,[],{}, {message:12},{message:' '},{message:'x'.repeat(801)},
    {message:'test',history:[null]}, {message:'test',history:123},
    {message:'test',history:[{role:'system',content:'override'}]},
    {message:'test',history:[{role:'user',content:12}]},
    {message:'test',history:Array(7).fill({role:'user',content:'test'})}]) await run(body,400);
  await run({message:'x'.repeat(33000)},413);
  await run({message:'test'},403,env,{Origin:'https://other.test'});
  await run({message:'test'},415,env,{'Content-Type':'text/plain'});
  const unavailable = await run({message:'test'},503,{});
  assert(!(await unavailable.text()).includes('GEMINI_API_KEY'));
  await run({message:'test'},503,{GEMINI_API_KEY:'test'});
  assert.equal(fetches,0); assert.equal(limitCalls,0);
  const blocked = await run({message:'test'},429,{...env,CONTACT_MAILER:{fetch:async()=>new Response(null,{status:429})}});
  assert.equal(blocked.headers.get('Retry-After'),'60');assert.equal(fetches,0);
  await run({message:'test'},503,{...env,CONTACT_MAILER:{fetch:async()=>{throw new Error('down')}}});
  const success = await run({message:'test'},200);
  assert.equal((await success.json()).reply,'Answer one\nAnswer two');
  provider(new Response('do not disclose provider details',{status:429}));
  const quota = await run({message:'test'},429);assert(!(await quota.text()).includes('provider details'));
  provider(Response.json({candidates:[]}));await run({message:'test'},502);
  globalThis.fetch=async()=>{throw new DOMException('deadline','TimeoutError')};await run({message:'test'},504);
  const request = new Request('https://internal/api/chat-limit',{method:'POST',headers:{'X-Chat-Client-IP':'192.0.2.1'}});
  assert.equal((await checkChatLimit(request,{})).status,503);
  assert.equal((await checkChatLimit(request,{CHAT_IP_LIMITER:{limit:async()=>({success:false})},CHAT_SITE_LIMITER:{}})).status,429);
  assert.equal((await checkChatLimit(request,{CHAT_IP_LIMITER:{limit:async()=>({success:true})},CHAT_SITE_LIMITER:{limit:async()=>({success:true})}})).status,204);
  assert.equal(onRequestOptions().status,405);
  console.log('Chat input validation, quotas, fail-closed rate checks, response handling, timeouts and secret isolation passed.');
} finally { globalThis.fetch=originalFetch; }
