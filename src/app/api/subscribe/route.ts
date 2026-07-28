import { NextResponse } from "next/server";

/**
 * Newsletter capture. A sending-only Resend key can send email but cannot store
 * a contact list (Audiences need broader access), so each signup is emailed to
 * the capture inbox (RESEND_NOTIFY_TO). From `onboarding@resend.dev` this only
 * reaches the Resend account owner, which is exactly the inbox we want; once
 * eatspanama.com is verified in Resend this can move to a real Audience +
 * subscriber welcome. Honeypot + email validation keep out obvious bots.
 */
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM = process.env.RESEND_FROM || "EatsPanama <onboarding@resend.dev>";
const NOTIFY_TO = process.env.RESEND_NOTIFY_TO || "chris@searchleads.agency";

function respond(req: Request, ok: boolean, locale: string, reason?: string) {
  const wantsHtml = (req.headers.get("accept") || "").includes("text/html");
  if (wantsHtml) {
    // No-JS fallback: bounce back to the newsletter page with a status flag.
    const base = locale === "es" ? "/es/newsletter/" : "/newsletter/";
    const url = new URL(`${base}?${ok ? "ok=1" : "err=" + (reason || "1")}`, req.url);
    return NextResponse.redirect(url, 303);
  }
  return NextResponse.json(ok ? { ok: true } : { ok: false, error: reason || "error" }, { status: ok ? 200 : 400 });
}

export async function POST(req: Request) {
  let email = "";
  let locale = "en";
  let honeypot = "";
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const b = await req.json();
      email = String(b.email ?? "").trim();
      locale = String(b.locale ?? "en");
      honeypot = String(b.company ?? "");
    } else {
      const f = await req.formData();
      email = String(f.get("email") ?? "").trim();
      locale = String(f.get("locale") ?? "en");
      honeypot = String(f.get("company") ?? "");
    }
  } catch {
    /* fall through to validation */
  }

  // Bot filled the hidden field: accept silently, do nothing.
  if (honeypot) return respond(req, true, locale);
  if (!EMAIL_RE.test(email) || email.length > 254) return respond(req, false, locale, "invalid");

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("subscribe: RESEND_API_KEY not set");
    return respond(req, false, locale, "config");
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY_TO],
        reply_to: email,
        subject: `New EatsPanama subscriber: ${email}`,
        text: `New newsletter signup on eatspanama.com\n\nEmail: ${email}\nLanguage: ${locale}\n\nReply to this message to reach them.`,
      }),
    });
    if (!r.ok) {
      console.error("subscribe: resend send failed", r.status, await r.text().catch(() => ""));
      return respond(req, false, locale, "send");
    }
  } catch (e) {
    console.error("subscribe: send error", e);
    return respond(req, false, locale, "send");
  }

  return respond(req, true, locale);
}
