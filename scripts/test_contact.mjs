import fs from "node:fs";
import assert from "node:assert/strict";
import { composeEmail } from "../worker/mime.mjs";

const source = fs.readFileSync(new URL("../functions/api/contact.js", import.meta.url), "utf8");
const { onRequestPost } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const payload = { name: "Engineer", email: "test@example.invalid", subject: "Subject é".repeat(15), message: "Local mock test", inquiry_type: "info" };
const sent = [];
const env = { SENDING_EMAIL_ADDRESS: "website@forms.belcarra.com", EMAIL: { send: async email => sent.push(email) } };

async function submit(data, expected, headers = {}, bindings = env) {
  const request = new Request("https://belcarra-web.pages.dev/api/contact", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(data),
  });
  const response = await onRequestPost({ request, env: bindings });
  assert.equal(response.status, expected);
  return response;
}

await submit(payload, 200);
assert.equal(sent.at(-1).to[0].email, "info@belcarra.com");
await submit({ ...payload, inquiry_type: "security" }, 200);
assert.equal(sent.at(-1).to[0].email, "security@belcarra.com");
await submit({
  ...payload,
  inquiry_type: "evaluation",
  company: "ACME Hardware",
  target_os: "Windows 11 AMD64, ARM64",
  protocols: "CDC-NCM",
  vid_choice: "custom",
  vid: "15A2",
  pid: "0054",
  dhcp_choice: "enabled",
  dhcp_subnet: "169.254.1.1",
}, 200);
assert.equal(sent.at(-1).to[0].email, "info@belcarra.com");
assert(sent.at(-1).subject.includes("Belcarra Evaluation Request"));
assert(sent.at(-1).text.includes("Vendor ID:     15A2"));
assert(sent.at(-1).text.includes("Subnetwork:    169.254.1.1"));
for (const fields of [{ email: 42 }, { email: "invalid" }, { name: "" }, { inquiry_type: "bad" }, { inquiry_type: "__proto__" }, { website: "bot" }, { message: "x".repeat(10001) }, { subject: "a\r\nb" }]) {
  await submit({ ...payload, ...fields }, 400);
}
await submit(payload, 403, { Origin: "https://other.invalid" });
await submit({ ...payload, message: "x".repeat(25000) }, 413);
await submit(payload, 503, {}, {});
assert.equal(sent.length, 3);
await submit(payload, 202, {}, { CONTACT_MAILER: { fetch: async () => new Response("forwarded", { status: 202 }) } });
const raw = composeEmail(sent[0]);
assert(raw.includes("Reply-To: test@example.invalid\r\n"));
assert(raw.includes("From: Belcarra Website <website@forms.belcarra.com>"));
assert.equal(Buffer.from(raw.split("\r\n\r\n")[1].replace(/\s/g, ""), "base64").toString(), sent[0].text);
const words = [...raw.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)];
assert.equal(words.map(word => Buffer.from(word[1], "base64").toString()).join(""), sent[0].subject);
assert(words.every(word => word[0].length <= 75));
console.log("Contact routing, validation, service forwarding, failure handling, and MIME encoding passed.");
