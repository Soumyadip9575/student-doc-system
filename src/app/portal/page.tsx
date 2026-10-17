import { auth } from "@/auth";
import { hasAdminAccess } from "@/lib/access";
import { redirect } from "next/navigation";

export default async function PortalRedirect() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  redirect(await hasAdminAccess(session.user.email) ? "/dashboard" : "/user");
}