import { auth } from "@/auth";
import { hasAdminAccess } from "@/lib/access";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await hasAdminAccess(session.user.email))) redirect("/user");
  return session;
}

export async function requireSignedIn() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  return session;
}