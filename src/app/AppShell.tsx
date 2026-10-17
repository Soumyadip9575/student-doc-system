"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { FilePlus2, FileText, History, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";

type AppShellProps = {
  children: React.ReactNode;
  signedIn: boolean;
  admin: boolean;
  email: string;
  university: string;
  demo: boolean;
};

export default function AppShell({ children, signedIn, admin, email, university, demo }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!signedIn || isAuthPage) return <>{children}</>;

  const links = [
    ...(admin ? [
      { href: "/dashboard", label: "Admin Panel", icon: LayoutDashboard },
      { href: "/admin/forms", label: "Form Builder", icon: FilePlus2 },
      { href: "/admin/admins", label: "Manage Admins", icon: ShieldCheck },
      { href: "/process", label: "Generate Documents", icon: FileText },
      { href: "/documents", label: "Documents", icon: FileText },
      { href: "/history", label: "History", icon: History },
    ] : []),
    { href: "/user", label: "User Panel", icon: UserRound },
  ];

  return <div className={`app-shell${collapsed ? " is-collapsed" : ""}`}>
    <aside className="sidebar">
      <div className="sidebar-topline">
        <Link className="sidebar-brand" href={admin ? "/dashboard" : "/user"} title={university}>
          <span className="sidebar-mark"><ShieldCheck size={22} /></span>
          <span className="sidebar-brand-copy">{university}<small>Document Portal</small></span>
        </Link>
        <button type="button" className="sidebar-toggle" onClick={() => setCollapsed((value) => !value)} title={collapsed ? "Expand navigation" : "Collapse navigation"} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed}>
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
      </div>
      <nav className="side-links" aria-label="Main navigation">
        {!collapsed && <span className="nav-heading">Workspace</span>}
        {links.map(({ href, label, icon: Icon }) => <Link className={pathname === href ? "active" : ""} href={href} key={href} title={label} aria-label={label}>
          <Icon size={19} aria-hidden="true" /><span className="nav-label">{label}</span>
        </Link>)}
      </nav>
      <div className="sidebar-account">
        <span className="account-email">{email}</span>
        <button type="button" className="logout-button" title="Logout" aria-label="Logout" onClick={() => signOut({ redirectTo: "/login" })}>
          <LogOut size={18} /><span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
    <div className="app-content">
      {demo && <div className="demo-banner">DEMO MODE - no real emails are sent</div>}
      {children}
    </div>
  </div>;
}