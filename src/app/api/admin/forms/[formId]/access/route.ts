import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAdminAccess, normalizeEmail } from "@/lib/access";
import { sendFormInvites } from "@/lib/email";

export async function POST(req: Request, { params }: { params: { formId: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = z.object({ emails: z.string().trim().min(1).max(10000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter at least one email address." }, { status: 400 });

  const emails = [...new Set(parsed.data.emails.split(/[\s,;]+/).map(normalizeEmail).filter(Boolean))];
  if (!emails.length || emails.length > 50 || emails.some((email) => !z.string().email().safeParse(email).success)) {
    return NextResponse.json({ error: "Check the email addresses and try again." }, { status: 400 });
  }
  const form = await db.appForm.findFirst({ where: { id: params.formId, isActive: true }, select: { id: true, title: true } });
  if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });

  await db.formAccess.createMany({ data: emails.map((email) => ({ formId: form.id, email })), skipDuplicates: true });
  const origin = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const delivery = await sendFormInvites(emails, form.title, `${origin}/user/forms/${form.id}`);
  return NextResponse.json({ ok: true, count: emails.length, ...delivery });
}

export async function DELETE(req: Request, { params }: { params: { formId: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const removed = await db.formAccess.deleteMany({ where: { formId: params.formId, email: normalizeEmail(parsed.data.email) } });
  if (!removed.count) return NextResponse.json({ error: "Access entry not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}