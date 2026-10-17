"use client";
import { useState } from "react";

type AssignedAdmin = { email: string; adminId: string; assignedBy: string; createdAt: string | Date };

export default function AdminManager({ admins: initialAdmins, bootstrapAdmins }: { admins: AssignedAdmin[]; bootstrapAdmins: string[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [issuedId, setIssuedId] = useState("");

  async function request(method: "POST" | "DELETE", body: object) {
    const response = await fetch("/api/admin/admins", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }

  async function assign(event: React.FormEvent) {
    event.preventDefault(); setBusy("assign"); setMessage(""); setIssuedId("");
    try {
      const result = await request("POST", { email });
      setAdmins((current) => [{ ...result, assignedBy: "You", createdAt: new Date() }, ...current]);
      setEmail(""); setIssuedId(result.adminId);
      setMessage(result.demo ? "Admin assigned. The invitation was logged in the server terminal (demo mode)." : result.sent ? "Admin assigned and instructions emailed." : "Admin assigned, but email failed. Share the displayed ID securely and check the email provider settings.");
    } catch (error) { setMessage((error as Error).message); }
    setBusy("");
  }

  async function remove(admin: AssignedAdmin) {
    setBusy(admin.email); setMessage("");
    try {
      await request("DELETE", { email: admin.email });
      setAdmins((current) => current.filter((item) => item.email !== admin.email));
      setMessage(`Removed Admin Panel access for ${admin.email}.`);
    } catch (error) { setMessage((error as Error).message); }
    setBusy("");
  }

  return <>
    <section className="admin-form-builder">
      <h2>Assign an admin</h2>
      <p>Generate a unique five-digit Admin ID and email it with sign-in instructions.</p>
      <form onSubmit={assign}>
        <label htmlFor="new-admin-email">New admin email</label>
        <input id="new-admin-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@university.edu" />
        <button type="submit" disabled={busy !== "" || !email.trim()}>{busy === "assign" ? "Assigning..." : "Generate ID and assign admin"}</button>
      </form>
      {issuedId && <div className="issued-admin-id"><span>Generated Admin ID</span><strong>{issuedId}</strong></div>}
    </section>

    <section className="admin-roster">
      <h2>Bootstrap admins</h2>
      <p>Configured in the server environment. They can assign other admins and cannot be removed here.</p>
      {bootstrapAdmins.map((address) => <div className="admin-roster-row" key={address}><div><strong>{address}</strong><small>Bootstrap admin</small></div></div>)}
      {!bootstrapAdmins.length && <p>No bootstrap admins are configured.</p>}
    </section>

    <section className="admin-roster">
      <h2>Assigned admins</h2>
      {!admins.length && <p>No admins have been assigned yet.</p>}
      {admins.map((admin) => <div className="admin-roster-row" key={admin.email}>
        <div><strong>{admin.email}</strong><small>Admin ID: {admin.adminId} · Assigned by {admin.assignedBy}</small></div>
        <button type="button" className="secondary-button" disabled={busy !== ""} onClick={() => remove(admin)}>{busy === admin.email ? "Removing..." : "Remove access"}</button>
      </div>)}
    </section>
    {message && <p role="status" className={message.includes("failed") ? "err" : "success"}>{message}</p>}
  </>;
}