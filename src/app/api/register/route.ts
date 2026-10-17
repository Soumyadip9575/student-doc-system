import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasAdminAccess, hasFormAccess, isRegisteredUser, normalizeEmail } from "@/lib/access";
import { verifyOtp } from "@/lib/otp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and six-digit code." }, { status: 400 });
  const email = normalizeEmail(parsed.data.email);
  if (await hasAdminAccess(email)) return NextResponse.json({ error: "Admin accounts should sign in from the login page." }, { status: 400 });
  if (await isRegisteredUser(email)) return NextResponse.json({ error: "This email is already registered. Please log in." }, { status: 409 });
  if (!(await hasFormAccess(email))) return NextResponse.json({ error: "No active form invitation was found for this email." }, { status: 403 });
  if (!(await verifyOtp(email, parsed.data.code))) return NextResponse.json({ error: "Invalid or expired code. Request a new one and try again." }, { status: 400 });

  await db.portalUser.create({ data: { email } });
  return NextResponse.json({ ok: true }, { status: 201 });
}