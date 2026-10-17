import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAdminAccess, isAdminEmail, normalizeEmail } from "@/lib/access";
import { sendAdminAssignment } from "@/lib/email";

export const runtime = "nodejs";

function generateAdminId() {
  const range = 90000;
  const limit = Math.floor(0x100000000 / range) * range;
  let value: number;
  do {
    value = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= limit);
  return String(10000 + value % range);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  if (isAdminEmail(email) || await db.adminAccount.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "This email already has administrator access." }, { status: 409 });
  }

  let account: { email: string; adminId: string } | undefined;
  for (let attempt = 0; attempt < 20 && !account; attempt++) {
    try {
      account = await db.adminAccount.create({ data: { email, adminId: generateAdminId(), assignedBy: normalizeEmail(session.user.email) }, select: { email: true, adminId: true } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      if (await db.adminAccount.findUnique({ where: { email }, select: { email: true } })) {
        return NextResponse.json({ error: "This email already has administrator access." }, { status: 409 });
      }
    }
  }
  if (!account) return NextResponse.json({ error: "Could not generate a unique Admin ID. Try again." }, { status: 500 });

  const origin = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const delivery = await sendAdminAssignment(account.email, account.adminId, `${origin}/login`);
  await db.auditLog.create({ data: { userEmail: normalizeEmail(session.user.email), action: "ADMIN_ASSIGNED", metadata: { email: account.email, adminId: account.adminId } } });
  return NextResponse.json({ ...account, ...delivery }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = normalizeEmail(parsed.data.email);
  if (email === normalizeEmail(session.user.email)) return NextResponse.json({ error: "You cannot remove your own admin assignment." }, { status: 400 });
  if (isAdminEmail(email)) return NextResponse.json({ error: "Bootstrap admins cannot be removed here." }, { status: 400 });
  const removed = await db.adminAccount.deleteMany({ where: { email } });
  if (!removed.count) return NextResponse.json({ error: "Assigned admin not found." }, { status: 404 });
  await db.auditLog.create({ data: { userEmail: normalizeEmail(session.user.email), action: "ADMIN_REMOVED", metadata: { email } } });
  return NextResponse.json({ ok: true });
}