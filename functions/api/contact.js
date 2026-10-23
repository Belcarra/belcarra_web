/**
 * Cloudflare Pages Function: /api/contact
 * Handles contact form submissions using Cloudflare Email Sending Service (Beta).
 * Uses the 'send_email' binding (env.EMAIL) configured in Cloudflare Pages.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    let payload = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const data = await request.formData();
      payload = Object.fromEntries(data.entries());
    } else {
      payload = await request.json().catch(() => ({}));
    }

    const name = (payload.name || "").trim();
    const email = (payload.email || "").trim();
    const company = (payload.company || "").trim();
    const inquiryType = (payload.inquiry_type || "licensing").trim();
    const subject = (payload.subject || "Website Contact Form").trim();
    const message = (payload.message || "").trim();

    if (!email || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email and message are required fields.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Determine recipient based on department inquiry
    const isSecurity = inquiryType === "security";
    const recipientEmail = isSecurity ? "security@belcarra.com" : "info@belcarra.com";
    const departmentLabel = {
      licensing: "OEM Commercial Licensing / Evaluation Kit",
      technical: "Technical Support & Driver Integration",
      protocol: "Protocol Consultation (CDC-NCM / EEM / ECM / RNDIS)",
      security: "Security & Vulnerability Disclosure",
    }[inquiryType] || inquiryType;

    const emailSubject = `[Belcarra Contact] ${departmentLabel}: ${subject}`;
    const textBody = `New inquiry received from belcarra.com contact form:

Department: ${departmentLabel}
From: ${name || "Not provided"}
Company: ${company || "Not provided"}
Email: ${email}
Subject: ${subject}

Message:
${message}

--------------------------------------------------
Sent via Cloudflare Email Sending Service
Timestamp: ${new Date().toISOString()}
`;

    // Check availability of Cloudflare Email Sending Service binding (in beta)
    // In Cloudflare Pages, the binding is configured under Pages > Settings > Functions > Email Sending bindings
    const emailService = env.EMAIL || env.send_email;

    if (!emailService || typeof emailService.send !== "function") {
      return new Response(
        JSON.stringify({
          success: false,
          beta_available: false,
          error:
            "Cloudflare Email Sending Service is currently in Beta and not yet bound for this Cloudflare Pages project. Please enable the send_email binding in Cloudflare Dashboard under Pages > Settings > Functions > Email Sending.",
          fallback: {
            recipient: recipientEmail,
            subject: emailSubject,
            body: textBody,
          },
        }),
        { status: 503, headers: corsHeaders }
      );
    }

    // Send email using Cloudflare's Email Service API
    await emailService.send({
      to: [{ email: recipientEmail, name: "Belcarra Technologies" }],
      from: {
        email: env.SENDING_EMAIL_ADDRESS || "contact@belcarra-web.pages.dev",
        name: "Belcarra Web Inquiry",
      },
      replyTo: { email: email, name: name || email },
      subject: emailSubject,
      text: textBody,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Your message has been sent successfully. A Belcarra engineer or representative will review your request.",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "An unexpected error occurred while sending your message.",
      }),
      { status: 500, headers: corsHeaders }
    );
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
