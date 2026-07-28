import { NextResponse } from "next/server";

/**
 * Newsletter capture.
 *
 * Preferred: if RESEND_AUDIENCE_ID is set (and the key can reach Audiences), each
 * signup is stored as a contact in that Resend Audience - a real, exportable list.
 * Fallback: with only a sending-only key, we can't manage a list, so each signup
 * is emailed to the capture inbox (RESEND_NOTIFY_TO) instead. Honeypot + email
 * validation keep out obvious bots.
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

/** Store in the Resend Audience (the list). Returns true on success. */
async function storeContact(key: string, audienceId: string, email: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, unsubscribed: false }),
    });
    // 201 created, or 200/422 when the contact already exists - all "captured".
    if (r.ok || r.status === 422) return true;
    console.error("subscribe: audience store failed", r.status, await r.text().catch(() => ""));
    return false;
  } catch (e) {
    console.error("subscribe: audience store error", e);
    return false;
  }
}

/** Fallback: email the signup to the capture inbox. */
async function notifyEmail(key: string, email: string, locale: string): Promise<boolean> {
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
      console.error("subscribe: notify send failed", r.status, await r.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("subscribe: notify send error", e);
    return false;
  }
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

  if (honeypot) return respond(req, true, locale); // bot: accept silently, do nothing
  if (!EMAIL_RE.test(email) || email.length > 254) return respond(req, false, locale, "invalid");

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("subscribe: RESEND_API_KEY not set");
    return respond(req, false, locale, "config");
  }

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const ok = audienceId
    ? await storeContact(key, audienceId, email)
    : await notifyEmail(key, email, locale);

  return respond(req, ok, locale, ok ? undefined : "send");
}
