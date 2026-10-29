import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAdminAccess } from "@/lib/access";

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  fields: z.array(z.object({
    id: z.string().min(1).max(60),
    label: z.string().trim().min(1).max(100),
    type: z.enum(["text", "email", "number", "date", "textarea"]),
    required: z.boolean(),
  })).min(1).max(30),
});

function hasUniqueFields(fields: z.infer<typeof schema>["fields"]) {
  const ids = new Set(fields.map((field) => field.id));
  const labels = new Set(fields.map((field) => field.label.toLowerCase()));
  return ids.size === fields.length && labels.size === fields.length;
}

export async function PATCH(req: Request, { params }: { params: { templateId: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add a title and at least one valid field." }, { status: 400 });
  if (!hasUniqueFields(parsed.data.fields)) return NextResponse.json({ error: "Field IDs and labels must be unique." }, { status: 400 });

  const result = await db.formTemplate.updateMany({ where: { id: params.templateId }, data: parsed.data });
  if (!result.count) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  const template = await db.formTemplate.findUniqueOrThrow({ where: { id: params.templateId }, select: { updatedAt: true } });
  return NextResponse.json({ updatedAt: template.updatedAt });
}

export async function DELETE(_req: Request, { params }: { params: { templateId: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const result = await db.formTemplate.deleteMany({ where: { id: params.templateId } });
  if (!result.count) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
