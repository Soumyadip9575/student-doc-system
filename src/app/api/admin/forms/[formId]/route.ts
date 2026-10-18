import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAdminAccess } from "@/lib/access";

export async function PATCH(req: Request, { params }: { params: { formId: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = z.object({ isActive: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid form status." }, { status: 400 });
  const result = await db.appForm.updateMany({ where: { id: params.formId }, data: parsed.data });
  if (!result.count) return NextResponse.json({ error: "Form not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { formId: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const result = await db.appForm.deleteMany({ where: { id: params.formId } });
  if (!result.count) return NextResponse.json({ error: "Form not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}