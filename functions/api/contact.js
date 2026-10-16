// Cloudflare Pages Function: POST /api/contact (the form on /contact/).
// Sends the message by email through Resend (free tier). Set these in Cloudflare (Pages > Settings > Variables, as secrets):
//   RESEND_API_KEY  - from resend.com (verify midnight-lite.com there first)
//   CONTACT_TO      - where messages go, e.g. enquiry@midnight-lite.com
//   CONTACT_FROM    - optional sender, default "Midnight Lite website <website@midnight-lite.com>"
export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const field = (k, max) => String(form.get(k) ?? "").trim().slice(0, max);
  if (field("website", 200)) return json({ ok: true });                    // honeypot: bots fill it, people don't see it
  const name = field("name", 120), email = field("email", 200), topic = field("topic", 60) || "General", message = field("message", 5000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 2) return json({ ok: false, error: "missing fields" }, 400);
  if (!env.RESEND_API_KEY || !env.CONTACT_TO) return json({ ok: false, error: "contact form not configured" }, 503);

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.CONTACT_FROM || "Midnight Lite website <website@midnight-lite.com>",
      to: [env.CONTACT_TO], reply_to: email,
      subject: `[midnight-lite.com] ${topic} from ${name}`,
      text: `${message}\n\n-- \n${name} <${email}>\nTopic: ${topic}\nSent from the contact form on midnight-lite.com`,
    }),
  });
  return r.ok ? json({ ok: true }) : json({ ok: false, error: "send failed" }, 502);
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
