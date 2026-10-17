import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelOtp, issueOtp } from "@/lib/otp";
import { hasAdminAccess, hasFormAccess, isRegisteredUser, normalizeEmail } from "@/lib/access";
import { sendEmail } from "@/lib/mailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const p = z.object({ email: z.string().email(), intent: z.enum(["login", "register"]).default("login") }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  const email = normalizeEmail(p.data.email);
  if (p.data.intent === "register") {
    if (await hasAdminAccess(email)) {
      return NextResponse.json({ error: "Admin accounts should sign in from the login page." }, { status: 400 });
    }
    if (await isRegisteredUser(email)) {
      return NextResponse.json({ error: "This email is already registered. Please log in." }, { status: 409 });
    }
    if (!(await hasFormAccess(email))) {
      return NextResponse.json({ error: "No active form invitation was found for this email. Ask the administrator to invite you first." }, { status: 403 });
    }
  } else {
    const allowed = !(await hasAdminAccess(email)) &&
      await isRegisteredUser(email) &&
      await hasFormAccess(email);
    if (!allowed) return NextResponse.json({ ok: true });
  }

  let code: string | undefined;
  try {
    code = await issueOtp(email);
    if (process.env.DEMO_MODE === "true") {
      console.log(`[DEMO ONLY] Login code for ${email}: ${code}`); // shown in your terminal, never in production
    } else {
      await sendEmail({ to: email, subject: "Your verification code", text: `Your 6-digit code is ${code}. It expires in 5 minutes.` });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (code) {
      try {
        await cancelOtp(email, code);
      } catch (cancelError) {
        console.error("Could not invalidate an OTP after email delivery failed.", cancelError);
      }
    }
    if (error instanceof Error && error.message.startsWith("Please wait")) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("Could not send a verification email.", error);
    return NextResponse.json({ error: "We couldn't deliver the verification code. Please try again shortly." }, { status: 503 });
  }
}
