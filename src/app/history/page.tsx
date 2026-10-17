import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
export const dynamic = "force-dynamic";
const ist = (d: Date | null) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "-");

export default async function History() {
  await requireAdmin();
  const batches = await db.processingBatch.findMany({ orderBy: { startedAt: "desc" }, take: 100 });
  return (
    <main style={{ maxWidth: 1000 }}><h1>Processing History</h1>
      {!batches.length ? <div className="card">No batches yet. Connect a Google Sheet and start your first document batch.</div> :
        <div className="card" style={{ overflowX: "auto" }}><table>
          <thead><tr>{["Batch", "Recipient", "Total", "Already Sent", "Sent", "Failed", "Date", "Status"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{batches.map((b) => <tr key={b.id}><td>{b.id.slice(-8)}</td><td>{b.recipient}</td><td>{b.total}</td><td>{b.skipped}</td><td>{b.sent}</td><td>{b.failed}</td><td>{ist(b.startedAt)}</td><td>{b.status}</td></tr>)}</tbody>
        </table></div>}
      <style>{`table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px;border-bottom:1px solid #E5E7EB}`}</style>
    </main>
  );
}
