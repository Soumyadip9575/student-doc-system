import "./globals.css";
import { auth } from "@/auth";
import { hasAdminAccess } from "@/lib/access";
import AppShell from "./AppShell";

export const metadata = { title: "Student Document Distribution System" };

export default async function Root({ children }: { children: React.ReactNode }) {
  const s = await auth();
  const admin = await hasAdminAccess(s?.user?.email);
  return (
    <html lang="en"><body>
      <AppShell signedIn={!!s?.user} admin={admin} email={s?.user?.email ?? ""} university={process.env.UNIVERSITY_NAME ?? "University"} demo={process.env.DEMO_MODE === "true"}>{children}</AppShell>
    </body></html>
  );
}
