import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAdminAccess } from "@/lib/access";
import type { FormField } from "@/lib/forms";
import SubmissionForm from "./SubmissionForm";

export const dynamic = "force-dynamic";

export default async function UserForm({ params }: { params: { formId: string } }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect(`/register?callbackUrl=${encodeURIComponent(`/user/forms/${params.formId}`)}`);
  if (await hasAdminAccess(email)) redirect("/dashboard");
  const form = await db.appForm.findFirst({
    where: { id: params.formId, isActive: true, access: { some: { email } } },
  });
  if (!form) notFound();
  return <main><p><a href="/user">← User Panel</a></p><h1>{form.title}</h1>
    {form.description && <p>{form.description}</p>}
    <SubmissionForm formId={form.id} fields={form.fields as FormField[]} />
  </main>;
}