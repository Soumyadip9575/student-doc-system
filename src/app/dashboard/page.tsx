import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  await requireAdmin();
  const [students, sent, failed, pending, last] = await Promise.all([
    db.studentRecord.count(), db.delivery.count({ where: { status: "SENT" } }),
    db.delivery.count({ where: { status: "FAILED" } }), db.delivery.count({ where: { status: "PROCESSING" } }),
    db.processingBatch.findFirst({ where: { completedAt: { not: null } }, orderBy: { completedAt: "desc" } }),
  ]);
  const cards = [["Total Students", students], ["Documents Sent", sent], ["Pending", pending], ["Failed", failed]];
  return (
    <main><h1>Dashboard</h1>
      <div className="grid">{cards.map(([l, v]) => <div className="card" key={l as string}><b>{v}</b><span>{l}</span></div>)}</div>
      <p style={{ color: "#6b7280" }}>Last processing: {last?.completedAt ? last.completedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "none yet"}</p>
    </main>
  );
}
