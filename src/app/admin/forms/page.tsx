import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import type { FormField } from "@/lib/forms";
import FormsManager from "./FormsManager";

export const dynamic = "force-dynamic";

export default async function AdminForms() {
  await requireAdmin();
  const forms = await db.appForm.findMany({
    orderBy: { createdAt: "desc" },
    include: { access: { select: { email: true } }, _count: { select: { submissions: true } } },
  });
  return <main><h1>Form Builder</h1><p>Create forms and control which email addresses can submit them.</p><FormsManager forms={forms.map((form) => ({ ...form, fields: form.fields as FormField[] }))} /></main>;
}