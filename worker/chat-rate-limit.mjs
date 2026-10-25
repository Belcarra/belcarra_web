export async function checkChatLimit(request, env) {
  const ip = request.headers.get("X-Chat-Client-IP");
  if (!ip || !env.CHAT_IP_LIMITER || !env.CHAT_SITE_LIMITER) {
    return new Response(null, { status: 503 });
  }
  try {
    if (!(await env.CHAT_IP_LIMITER.limit({ key: ip })).success ||
        !(await env.CHAT_SITE_LIMITER.limit({ key: "belcarra-chat" })).success) {
      return new Response(null, { status: 429 });
    }
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
