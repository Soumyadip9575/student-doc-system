import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import ProcessForm from "./ProcessForm";

export const dynamic = "force-dynamic";

export default async function Process() {
  await requireAdmin();
  const forms = await db.appForm.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, include: { _count: { select: { submissions: true } } } });
  return <main><h1>Generate Documents</h1><p>Choose a form and send generated PDFs from its submitted responses.</p><ProcessForm forms={forms.map((form) => ({ id: form.id, title: form.title, submissions: form._count.submissions }))} /></main>;
}
