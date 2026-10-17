import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAdminAccess, hasValidAdminId, normalizeEmail } from "@/lib/access";
import { issueAdminCode } from "@/lib/otp";
import { sendEmail } from "@/lib/mailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().email(), adminId: z.string().regex(/^\d{5}$/).or(z.literal("")).default("") }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid admin email and five-digit Admin ID." }, { status: 400 });
  const email = normalizeEmail(parsed.data.email);
  if (!(await hasAdminAccess(email)) || !(await hasValidAdminId(email, parsed.data.adminId))) return NextResponse.json({ ok: true });

  try {
    const code = await issueAdminCode(email);
    if (process.env.DEMO_MODE === "true") {
      console.log(`[DEMO ONLY] Five-digit admin code for ${email}: ${code}`);
    } else {
      await sendEmail({
        to: email,
        subject: "Your five-digit Admin Panel access code",
        text: `Your Admin Panel access code is ${code}. It expires in 5 minutes and can only be used once.`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith("Please wait") ? error.message : "We could not send the admin code. Please try again.";
    return NextResponse.json({ error: message }, { status: 429 });
  }
}