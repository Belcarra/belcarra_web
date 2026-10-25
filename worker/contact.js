import { EmailMessage } from "cloudflare:email";
import { onRequestPost } from "../functions/api/contact.js";
import { composeEmail } from "./mime.mjs";
import { checkChatLimit } from "./chat-rate-limit.mjs";
import { chat } from "./chat.mjs";

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === "/api/chat" && request.method === "POST") {
      return chat(request, env);
    }
    if (new URL(request.url).pathname === "/api/chat-limit" && request.method === "POST") {
      return checkChatLimit(request, env);
    }
    if (new URL(request.url).pathname !== "/api/contact" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }
    return onRequestPost({ request, env: {
      SENDING_EMAIL_ADDRESS: "website@forms.belcarra.com",
      EMAIL: {
        async send(email) {
          await env.EMAIL.send(new EmailMessage(
            email.from.email, email.to[0].email, composeEmail(email),
          ));
        },
      },
    } });
  },
};
