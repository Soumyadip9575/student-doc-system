import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export default async function FormResponses({ params }: { params: { formId: string } }) {
  await requireAdmin();
  const form = await db.appForm.findUnique({
    where: { id: params.formId },
    include: { submissions: { orderBy: { submittedAt: "desc" } } },
  });
  if (!form) notFound();
  const columns = (form.fields as { label: string }[]).map((field) => field.label);
  return <main style={{ maxWidth: 1100 }}><p><Link href="/admin/forms">← Form Builder</Link></p>
    <h1>{form.title}</h1><p>{form.submissions.length} responses</p>
    {!form.submissions.length ? <div className="card">No responses yet.</div> :
      <div className="card" style={{ overflowX: "auto" }}><table>
        <thead><tr><th>Submitted by</th><th>Submitted at</th>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{form.submissions.map((submission) => {
          const data = submission.data as Record<string, string>;
          return <tr key={submission.id}><td>{submission.userEmail}</td><td>{submission.submittedAt.toLocaleString()}</td>{columns.map((column) => <td key={column}>{data[column] || "-"}</td>)}</tr>;
        })}</tbody>
      </table></div>}
    <p><Link href="/process">Generate and send documents →</Link></p>
  </main>;
}