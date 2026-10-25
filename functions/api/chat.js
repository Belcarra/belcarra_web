/**
 * Cloudflare Pages Function: /api/chat
 * Validates chat requests and forwards inference to the private Workers AI binding.
 */

const MAX_BODY_BYTES = 32768;
const UNAVAILABLE = "The technical assistant is temporarily unavailable. Please use our documentation or Contact Us page.";

function reply(status, data, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing body");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("Request too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return reply(403, { success: false, error: "Please use the assistant on this website." });
  }
  if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
    return reply(415, { success: false, error: "Expected a JSON request." });
  }
  if (Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES) {
    return reply(413, { success: false, error: "Request is too large." });
  }
  let body;
  try { body = await readJson(request); }
  catch (error) {
    return reply(error instanceof RangeError ? 413 : 400, { success: false, error: "Invalid or oversized request." });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.message !== "string" || !body.message.trim() || body.message.length > 800) {
    return reply(400, { success: false, error: "Enter a question of up to 800 characters." });
  }
  const history = body.history ?? [];
  if (!Array.isArray(history) || history.length > 6 || history.some(item =>
    !item || typeof item !== "object" || !["user", "assistant", "model"].includes(item.role) ||
    typeof item.content !== "string" || !item.content.trim() || item.content.length > 1000)) {
    return reply(400, { success: false, error: "Invalid conversation history. Please reload the assistant." });
  }
  if (!env.CONTACT_MAILER || !request.headers.get("CF-Connecting-IP")) {
    return reply(503, { success: false, error: UNAVAILABLE });
  }
  try {
    const response = await env.CONTACT_MAILER.fetch(new Request("https://internal/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Chat-Client-IP": request.headers.get("CF-Connecting-IP") },
      body: JSON.stringify({ messages: [
        ...history.map(item => ({ role: item.role === "model" ? "assistant" : item.role, content: item.content })),
        { role: "user", content: body.message.trim() },
      ] }),
      signal: AbortSignal.timeout(25000),
    }));
    if (response.status === 429) return reply(429, {
      success: false, error: "The assistant has reached its usage limit. Please try later or use Contact Us.",
    }, { "Retry-After": "60" });
    if (response.status === 503) return reply(503, { success: false, error: UNAVAILABLE });
    if (!response.ok) return reply(502, { success: false, error: UNAVAILABLE });
    const result = await response.json();
    if (typeof result.reply !== "string" || !result.reply.trim()) {
      return reply(502, { success: false, error: "No answer was available. Please rephrase your question or contact us." });
    }
    return reply(200, { success: true, reply: result.reply.trim().slice(0, 8000),
      sources: Array.isArray(result.sources) ? result.sources : [],
    });
  } catch (error) {
    return reply(error?.name === "TimeoutError" || error?.name === "AbortError" ? 504 : 502, {
      success: false, error: "The assistant did not respond in time. Please try again or contact us.",
    });
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
}
