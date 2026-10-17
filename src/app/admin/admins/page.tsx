import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import AdminManager from "./AdminManager";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  await requireAdmin();
  const admins = await db.adminAccount.findMany({ orderBy: { createdAt: "desc" }, select: { email: true, adminId: true, assignedBy: true, createdAt: true } });
  const bootstrapAdmins = (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return <main>
    <h1>Manage Admins</h1>
    <p>Only an existing admin can assign or remove Admin Panel access.</p>
    <AdminManager admins={admins} bootstrapAdmins={bootstrapAdmins} />
  </main>;
}