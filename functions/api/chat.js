/**
 * Cloudflare Pages Function: /api/chat
 * Serverless proxy for Google Gemini API to power the Belcarra technical chatbot.
 * Uses env.GEMINI_API_KEY configured in Cloudflare Pages secrets.
 */

const SYSTEM_INSTRUCTION = `You are the Belcarra Technical Assistant for Belcarra Technologies (2005) Corp.
Your purpose is to assist engineers, OEMs, and developers with technical questions about Belcarra USB networking solutions.

Core Knowledge Base:
- Primary Product: Belcarra USBLAN driver for Windows. It provides high-performance, stable USB device networking.
- Supported Host Operating Systems:
  * Windows 11: Fully supported on both AMD64 (x64) and ARM64.
  * Windows 10: Supported on AMD64 (x64) only. IMPORTANT: ARM64 is NOT supported on Windows 10.
- Supported USB Protocols:
  * CDC-NCM (Network Control Model): Modern standard, high throughput, packet aggregation (16-bit/32-bit NTBs). Recommended for new designs.
  * CDC-EEM (Ethernet Emulation Model): Low CPU overhead, minimal packet framing, ideal for microcontrollers.
  * CDC-ECM (Ethernet Control Model): Standard IEEE 802.3 over USB, cross-platform compatibility.
  * RNDIS (Remote NDIS): Legacy Microsoft protocol. Belcarra provides a modern, high-performance implementation.
- USB Gadget & Embedded Linux:
  * Linux ConfigFS libcomposite framework.
  * Microsoft OS Descriptors (os_desc, MS OS 1.0 & 2.0 descriptors) for automatic driver matching without INF prompts.
  * Belcarra open-source tool: 'gadgetconfig' for automated Linux USB gadget setup.
- Common Windows Troubleshooting:
  * Code 10: Device cannot start. Often caused by USB descriptor mismatches, incorrect endpoint configuration, or incomplete USB gadget enumeration.
  * Code 28: Drivers for this device are not installed. Verify Hardware ID (VID/PID) and Compatible IDs in the INF file.
  * Code 43: Device reported a problem. Check USB signal integrity, power faults, or firmware crashes.
- Clean Uninstallation:
  * Remove the adapter in Device Manager (checking "Attempt to remove the driver for this device").
- USB Vendor ID (VID) and Product ID (PID):
  * Vendor ID (VID): 16-bit number assigned exclusively by the USB Implementers Forum (USB-IF at USB.org). OEMs must obtain an official VID from USB.org (via USB-IF membership or non-member purchase) to prevent hardware ID collisions.
  * Product ID (PID): 16-bit number assigned by the OEM (up to 65,536 PIDs per VID) to identify specific models or firmware revisions.
  * Windows PnP matching uses USB\\VID_xxxx&PID_xxxx. Belcarra builds custom, WHQL-compatible OEM driver packages bound to the OEM's licensed VID/PID.
- OEM Inquiries & Licensing:
  * Direct visitors to the Contact Us page or info@belcarra.com for evaluation kits, custom driver licensing, and commercial pricing.
  * Direct security concerns to security@belcarra.com.

Style Guidelines:
- Be concise, accurate, technical, and professional. Keep responses typically under 2-3 short paragraphs or clean bullet points.
- Never hallucinate support for platforms Belcarra does not support (e.g. do NOT claim Windows 10 ARM64 is supported).
- For commercial pricing or proprietary quotes, politely advise contacting the sales team via the Contact Us form.`;

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ success: false, error: "Unauthorized origin" }, { status: 403 });
  }

  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return Response.json({ success: false, error: "Content-Type must be application/json" }, { status: 415 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON request" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!message) {
    return Response.json({ success: false, error: "Message cannot be empty." }, { status: 400 });
  }

  if (message.length > 800) {
    return Response.json({ success: false, error: "Message exceeds maximum length (800 characters)." }, { status: 400 });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({
      success: true,
      reply: "The Belcarra Technical Assistant is currently in setup mode. Please ensure GEMINI_API_KEY is configured in your Cloudflare Pages environment variables.",
      is_fallback: true,
    });
  }

  // Construct Gemini generateContent payload
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const contents = [];

  for (const item of history) {
    if (item.role === "user" || item.role === "assistant" || item.role === "model") {
      contents.push({
        role: item.role === "assistant" ? "model" : item.role,
        parts: [{ text: String(item.content || "").slice(0, 1000) }],
      });
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  const payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 600,
    },
  };

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return Response.json({
        success: false,
        error: "Unable to process your question at this moment. Please try again shortly.",
      }, { status: 502 });
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text;

    if (!replyText) {
      return Response.json({
        success: false,
        error: "Received an empty response from the AI assistant.",
      }, { status: 502 });
    }

    return Response.json({
      success: true,
      reply: replyText.trim(),
    });

  } catch (err) {
    console.error("Chat error:", err);
    return Response.json({
      success: false,
      error: "A network error occurred while communicating with the assistant.",
    }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
