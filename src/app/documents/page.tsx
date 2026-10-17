import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
export const dynamic = "force-dynamic";
const ist = (d: Date | null) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "-");

export default async function Documents() {
  await requireAdmin();
  const rows = await db.delivery.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { record: { select: { name: true, studentId: true } } } });
  return (
    <main style={{ maxWidth: 1000 }}><h1>Documents</h1>
      {!rows.length ? <div className="card">No documents generated yet.</div> :
        <div className="card" style={{ overflowX: "auto" }}><table>
          <thead><tr>{["Student", "Student ID", "Document ID", "Recipient", "Sent", "Status", "Error"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((d) => <tr key={d.id}><td>{d.record.name ?? "-"}</td><td>{d.record.studentId ?? "-"}</td><td>{d.docRef ?? "-"}</td><td>{d.recipient}</td><td>{ist(d.sentAt)}</td><td>{d.status}</td><td>{d.error ?? ""}</td></tr>)}</tbody>
        </table></div>}
      <style>{`table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px;border-bottom:1px solid #E5E7EB}`}</style>
    </main>
  );
}
