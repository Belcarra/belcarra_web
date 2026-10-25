import { checkChatLimit } from "./chat-rate-limit.mjs";

export const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

export async function chat(request, env) {
  const headers = { "Cache-Control": "no-store" };
  if (!env.AI) return new Response(null, { status: 503, headers });
  const limit = await checkChatLimit(request, env);
  if (limit.status !== 204) return new Response(null, { status: limit.status, headers });
  try {
    const { messages } = await request.json();
    if (!Array.isArray(messages) || messages.length > 8 || messages.some(item =>
      !item || !["system", "user", "assistant"].includes(item.role) ||
      typeof item.content !== "string" || item.content.length > 16000)) {
      return new Response(null, { status: 400, headers });
    }
    const result = await env.AI.run(CHAT_MODEL, {
      messages, max_tokens: 600, temperature: 0.3,
    });
    if (typeof result.response !== "string" || !result.response.trim()) {
      return new Response(null, { status: 502, headers });
    }
    return Response.json({ reply: result.response.trim().slice(0, 8000) }, { headers });
  } catch {
    // Do not log provider errors: they can include prompts or account details.
    return new Response(null, { status: 503, headers });
  }
}
