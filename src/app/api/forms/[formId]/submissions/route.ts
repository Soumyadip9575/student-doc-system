import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAdminAccess, hasFormAccess, normalizeEmail } from "@/lib/access";

type FormField = { id: string; label: string; type: string; required: boolean };

export async function POST(req: Request, { params }: { params: { formId: string } }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (await hasAdminAccess(email) || !(await hasFormAccess(email, params.formId))) return NextResponse.json({ error: "You do not have access to this form." }, { status: 403 });

  const form = await db.appForm.findFirst({ where: { id: params.formId, isActive: true } });
  if (!form) return NextResponse.json({ error: "This form is no longer available." }, { status: 404 });
  const body = await req.json().catch(() => null) as { data?: unknown } | null;
  if (!body?.data || typeof body.data !== "object" || Array.isArray(body.data)) return NextResponse.json({ error: "Submit a valid form response." }, { status: 400 });

  const fields = form.fields as FormField[];
  const submitted = body.data as Record<string, unknown>;
  const data: Record<string, string> = {};
  for (const field of fields) {
    const rawValue = submitted[field.id];
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    if (field.required && !value) return NextResponse.json({ error: `${field.label} is required.` }, { status: 400 });
    if (value.length > 2000) return NextResponse.json({ error: `${field.label} is too long.` }, { status: 400 });
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return NextResponse.json({ error: `Enter a valid email for ${field.label}.` }, { status: 400 });
    }
    data[field.label] = value;
  }

  const submission = await db.formSubmission.create({ data: { formId: form.id, userEmail: normalizeEmail(email), data } });
  return NextResponse.json({ id: submission.id }, { status: 201 });
}