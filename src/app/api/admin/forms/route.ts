import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAdminAccess, normalizeEmail } from "@/lib/access";

const fieldSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().trim().min(1).max(100),
  type: z.enum(["text", "email", "number", "date", "textarea"]),
  required: z.boolean(),
});

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  fields: z.array(fieldSchema).min(1).max(30),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add a title and at least one valid field." }, { status: 400 });

  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const field of parsed.data.fields) {
    const label = field.label.toLowerCase();
    if (ids.has(field.id) || labels.has(label)) return NextResponse.json({ error: "Field IDs and labels must be unique." }, { status: 400 });
    ids.add(field.id);
    labels.add(label);
  }

  const form = await db.appForm.create({ data: { ...parsed.data, createdBy: normalizeEmail(session.user.email) } });
  return NextResponse.json({ id: form.id, title: form.title }, { status: 201 });
}