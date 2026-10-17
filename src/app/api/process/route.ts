import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { hasAdminAccess } from "@/lib/access";
import { processFormSubmissions } from "@/lib/process";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({ formId: z.string().min(1), recipient: z.string().email() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  if (!(await hasAdminAccess(session.user.email))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a form and enter a valid recipient email." }, { status: 400 });
  try {
    return NextResponse.json(await processFormSubmissions(parsed.data.formId, parsed.data.recipient, session.user.email));
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    const safe = m === "Form not found." || m.startsWith("There are no new responses") ? m : "We couldn't complete processing. Please try again.";
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
