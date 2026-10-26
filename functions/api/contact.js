const RECIPIENTS = Object.freeze({
  info: "info@belcarra.com",
  security: "security@belcarra.com",
  evaluation: "info@belcarra.com",
});
const LIMIT = 24000;

function reply(status, data) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function readBody(request) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > LIMIT) {
      await reader.cancel();
      throw new RangeError("Request too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function onRequestPost({ request, env }) {
  if (env.CONTACT_MAILER) {
    return env.CONTACT_MAILER.fetch(request);
  }
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return reply(403, { success: false, error: "Please submit the form from this website." });
  }
  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return reply(415, { success: false, error: "Please use the website contact form." });
  }
  let payload;
  try {
    payload = JSON.parse(await readBody(request));
  } catch (error) {
    return reply(error instanceof RangeError ? 413 : 400, {
      success: false, error: "Invalid or oversized form submission.",
    });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reply(400, { success: false, error: "Invalid form submission." });
  }
  const limits = {
    name: 120, email: 254, company: 200, inquiry_type: 20, subject: 200, message: 10000, website: 200,
    target_os: 200, protocols: 200, vid_choice: 50, vid: 20, pid: 20, dhcp_choice: 50, dhcp_subnet: 50,
  };
  const data = {};
  for (const [field, max] of Object.entries(limits)) {
    const value = payload[field] ?? "";
    if (typeof value !== "string" || value.length > max) {
      return reply(400, { success: false, error: `Invalid ${field.replaceAll("_", " ")} field.` });
    }
    data[field] = value.trim();
  }
  if (data.website) {
    return reply(400, { success: false, error: "Unable to accept this submission." });
  }
  const recipient = Object.hasOwn(RECIPIENTS, data.inquiry_type) ? RECIPIENTS[data.inquiry_type] : null;
  if (!recipient || !data.name || !data.subject || !data.message ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email) ||
      /[\r\n\x00]/.test(data.name + data.email + data.subject)) {
    return reply(400, { success: false, error: "Enter your name, a valid email, a destination, subject, and message." });
  }
  const unavailable = () => reply(503, {
    success: false,
    error: `Your message was not sent. Please email ${recipient} directly or try again later. Your text remains in the form.`,
  });
  if (!env.SENDING_EMAIL_ADDRESS || !env.EMAIL) {
    return unavailable();
  }

  let emailSubject;
  let emailText;
  if (data.inquiry_type === "evaluation") {
    emailSubject = `[Belcarra Evaluation Request] ${data.company ? data.company + " — " : ""}${data.subject}`;
    emailText = [
      "BELCARRA USBLAN OEM EVALUATION DRIVER REQUEST",
      "=============================================",
      `Contact Name:   ${data.name}`,
      `Business Email: ${data.email}`,
      `Company / OEM:  ${data.company || "Not provided"}`,
      "",
      "TARGET PLATFORM & PROTOCOLS:",
      `- Target OS:     ${data.target_os || "Not specified"}`,
      `- Protocols:     ${data.protocols || "Not specified"}`,
      "",
      "USB HARDWARE IDENTIFIERS (VID / PID):",
      `- VID/PID Mode:  ${data.vid_choice || "Not specified"}`,
      `- Vendor ID:     ${data.vid || "N/A"}`,
      `- Product ID:    ${data.pid || "N/A"}`,
      "",
      "DHCP CONFIGURATION:",
      `- DHCP Service:  ${data.dhcp_choice || "Not specified"}`,
      `- Subnetwork:    ${data.dhcp_subnet || "169.254.1.1 (default)"}`,
      "",
      "PROJECT & HARDWARE DETAILS:",
      data.message,
    ].join("\n");
  } else if (data.inquiry_type === "security") {
    emailSubject = `[Belcarra Security] ${data.subject}`;
    emailText = `Name: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company || "Not provided"}\n\n${data.message}`;
  } else {
    emailSubject = `[Belcarra Info] ${data.subject}`;
    emailText = `Name: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company || "Not provided"}\n\n${data.message}`;
  }

  const email = {
    from: { email: env.SENDING_EMAIL_ADDRESS, name: "Belcarra Website" },
    to: [{ email: recipient }],
    replyTo: { email: data.email, name: data.name },
    subject: emailSubject,
    text: emailText,
  };
  try {
    await env.EMAIL.send(email);
    return reply(200, { success: true, message: `Thank you. Your request has been accepted for delivery to ${recipient}.` });
  } catch {
    console.error("Contact email delivery failed", { department: data.inquiry_type });
    return unavailable();
  }
}
