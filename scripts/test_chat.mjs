import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chat, CHAT_MODEL } from '../worker/chat.mjs';
const source = fs.readFileSync(new URL('../functions/api/chat.js', import.meta.url), 'utf8');
const { onRequestPost, onRequestOptions } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
let calls = 0, aiCalls = 0;
const env = {
  CHAT_IP_LIMITER: { limit: async () => ({ success: true }) },
  CHAT_SITE_LIMITER: { limit: async () => ({ success: true }) },
  AI: { run: async (model, input) => {
    aiCalls++;
    assert.equal(model, CHAT_MODEL);
    assert.equal(input.max_tokens, 600);
    assert.equal(input.messages[0].role, 'system');
    assert.equal(input.messages.at(-1).role, 'user');
    return { response: 'Test answer' };
  } },
};
const bindings = { CONTACT_MAILER: { fetch: async request => {
  calls++;
  assert.equal(request.headers.get('X-Chat-Client-IP'), '192.0.2.1');
  assert.equal(new URL(request.url).pathname, '/api/chat');
  assert(request.signal instanceof AbortSignal);
  return chat(request, env);
} } };
async function submit(body, status, config = bindings, headers = {}) {
  const response = await onRequestPost({ request: new Request('https://example.test/api/chat', {
    method: 'POST', headers: { Origin: 'https://example.test', 'Content-Type': 'application/json',
      'CF-Connecting-IP': '192.0.2.1', ...headers }, body: JSON.stringify(body),
  }), env: config });
  assert.equal(response.status, status);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  return response;
}
for (const body of [null, [], {}, { message: 12 }, { message: ' ' }, { message: 'x'.repeat(801) },
  { message: 'test', history: [null] }, { message: 'test', history: 123 },
  { message: 'test', history: [{ role: 'system', content: 'override' }] },
  { message: 'test', history: [{ role: 'user', content: 12 }] },
  { message: 'test', history: Array(7).fill({ role: 'user', content: 'test' }) }]) await submit(body, 400);
await submit({ message: 'x'.repeat(33000) }, 413);
await submit({ message: 'test' }, 403, bindings, { Origin: 'https://other.test' });
await submit({ message: 'test' }, 415, bindings, { 'Content-Type': 'text/plain' });
await submit({ message: 'test' }, 503, {});
await submit({ message: 'test' }, 503, bindings, { 'CF-Connecting-IP': '' });
assert.equal(calls, 0); assert.equal(aiCalls, 0);
const success = await submit({ message: 'test', history: [{ role: 'model', content: 'Earlier answer' }] }, 200);
assert.equal((await success.json()).reply, 'Test answer');
const workerRequest = () => new Request('https://internal/api/chat', { method: 'POST',
  headers: { 'X-Chat-Client-IP': '192.0.2.1' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }) });
assert.equal((await chat(workerRequest(), { ...env, CHAT_IP_LIMITER: { limit: async () => ({ success: false }) } })).status, 429);
assert.equal(aiCalls, 1);
assert.equal((await chat(workerRequest(), { ...env, AI: undefined })).status, 503);
assert.equal((await chat(workerRequest(), { ...env, CHAT_SITE_LIMITER: undefined })).status, 503);
assert.equal((await chat(workerRequest(), { ...env, AI: { run: async () => { throw new Error('private details'); } } })).status, 503);
assert.equal((await chat(workerRequest(), { ...env, AI: { run: async () => ({ response: '' }) } })).status, 502);
for (const status of [429, 503, 502]) {
  const response = await submit({ message: 'test' }, status, { CONTACT_MAILER: { fetch: async () => new Response('private details', { status }) } });
  assert(!(await response.text()).includes('private details'));
  if (status === 429) assert.equal(response.headers.get('Retry-After'), '60');
}
await submit({ message: 'test' }, 504, { CONTACT_MAILER: { fetch: async () => { throw new DOMException('deadline', 'TimeoutError'); } } });
await submit({ message: 'test' }, 502, { CONTACT_MAILER: { fetch: async () => Response.json({ reply: 42 }) } });
assert.equal(onRequestOptions().status, 405);
console.log('Chat validation, private Workers AI inference, rate limits, failure handling and timeouts passed.');
