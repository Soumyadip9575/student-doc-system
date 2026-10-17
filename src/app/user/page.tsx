import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasAdminAccess } from "@/lib/access";
import { requireSignedIn } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export default async function UserPanel() {
  const session = await requireSignedIn();
  const email = session.user?.email?.toLowerCase();
  if (!email) redirect("/login");
  if (await hasAdminAccess(email)) return <main><h1>User Panel</h1><p>Admin accounts do not fill assigned forms.</p></main>;
  const forms = await db.appForm.findMany({
    where: { isActive: true, access: { some: { email: email.toLowerCase() } } },
    orderBy: { createdAt: "desc" },
    include: { submissions: { where: { userEmail: email.toLowerCase() }, orderBy: { submittedAt: "desc" }, take: 1 } },
  });
  return <main><h1>User Panel</h1><p>Forms shared with {email}</p>
    <div className="user-form-list">{forms.map((form) => <article className="user-form-item" key={form.id}>
      <div><h2>{form.title}</h2><p>{form.description || "Complete the form below."}</p>
        <small>{form.submissions.length ? `Last submitted ${form.submissions[0].submittedAt.toLocaleString()}` : "Not submitted"}</small></div>
      <Link className="action-link" href={`/user/forms/${form.id}`}>{form.submissions.length ? "Submit another response" : "Open form"}</Link>
    </article>)}
      {!forms.length && <div className="card">No active forms have been shared with your email address yet.</div>}
    </div>
  </main>;
}