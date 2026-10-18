"use client";
import Link from "next/link";
import { useState } from "react";
import type { FormField } from "@/lib/forms";

type FormSummary = {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  fields: FormField[];
  access: { email: string }[];
  _count: { submissions: number };
};

export default function FormsManager({ forms: initialForms }: { forms: FormSummary[] }) {
  const [forms, setForms] = useState(initialForms);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([{ id: "field-1", label: "Student name", type: "text", required: true }]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const hasBlankField = fields.some((field) => !field.label.trim());

  async function request(url: string, method: string, body: object) {
    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }

  async function createForm(event: React.FormEvent) {
    event.preventDefault();
    if (hasBlankField) { setMessage("Give every field a label or remove the blank field."); return; }
    setBusy("create"); setMessage("");
    try {
      const result = await request("/api/admin/forms", "POST", { title, description, fields });
      setForms((current) => [{ id: result.id, title, description, isActive: true, fields, access: [], _count: { submissions: 0 } }, ...current]);
      setTitle(""); setDescription(""); setFields([{ id: `field-${Date.now()}`, label: "Student name", type: "text", required: true }]);
      setMessage("Form created. Add the email addresses allowed to fill it in.");
    } catch (error) { setMessage((error as Error).message); }
    setBusy("");
  }

  async function grantAccess(form: FormSummary) {
    setBusy(form.id); setMessage("");
    try {
      const result = await request(`/api/admin/forms/${form.id}/access`, "POST", { emails: emails[form.id] ?? "" });
      const added = (emails[form.id] ?? "").split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);
      setForms((current) => current.map((item) => item.id === form.id ? {
        ...item, access: [...new Map([...item.access, ...added.map((email) => ({ email }))].map((entry) => [entry.email, entry])).values()],
      } : item));
      setEmails((current) => ({ ...current, [form.id]: result.failed.length ? result.failed.join(", ") : "" }));
      if (result.failed.length) setMessage(`Access saved, but invitations could not be emailed to: ${result.failed.join(", ")}. Check the email provider settings and retry.`);
      else setMessage(result.demo ? "Access saved. Invitation instructions were logged in the server terminal (demo mode)." : `Access saved and invitation sent to ${result.sent.length} email address(es).`);
    } catch (error) { setMessage((error as Error).message); }
    setBusy("");
  }

  async function toggleForm(form: FormSummary) {
    setBusy(form.id); setMessage("");
    try {
      await request(`/api/admin/forms/${form.id}`, "PATCH", { isActive: !form.isActive });
      setForms((current) => current.map((item) => item.id === form.id ? { ...item, isActive: !item.isActive } : item));
    } catch (error) { setMessage((error as Error).message); }
    setBusy("");
  }

  async function deleteForm(form: FormSummary) {
    if (!window.confirm(`Delete "${form.title}"? Its responses and authorized email addresses will also be deleted.`)) return;
    setBusy(form.id); setMessage("");
    try {
      await request(`/api/admin/forms/${form.id}`, "DELETE", {});
      setForms((current) => current.filter((item) => item.id !== form.id));
      setMessage(`Deleted "${form.title}".`);
    } catch (error) { setMessage((error as Error).message); }
    setBusy("");
  }

  async function removeAccess(form: FormSummary, email: string) {
    setBusy(`${form.id}:${email}`); setMessage("");
    try {
      await request(`/api/admin/forms/${form.id}/access`, "DELETE", { email });
      setForms((current) => current.map((item) => item.id === form.id ? { ...item, access: item.access.filter((entry) => entry.email !== email) } : item));
      setMessage(`Removed access for ${email}.`);
    } catch (error) { setMessage((error as Error).message); }
    setBusy("");
  }

  return <>
    <section className="admin-form-builder">
      <h2>New form</h2>
      <form onSubmit={createForm}>
        <label htmlFor="form-title">Form title</label>
        <input id="form-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} />
        <label htmlFor="form-description">Description</label>
        <textarea id="form-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={500} />
        <h3>Fields</h3>
        {fields.map((field, index) => <div className="field-builder-row" key={field.id}>
          <input aria-label={`Field ${index + 1} label`} value={field.label} placeholder="Field label" maxLength={100} onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, label: event.target.value } : item))} />
          <select aria-label={`Field ${index + 1} type`} value={field.type} onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, type: event.target.value as FormField["type"] } : item))}>
            <option value="text">Short text</option><option value="email">Email</option><option value="number">Number</option><option value="date">Date</option><option value="textarea">Long text</option>
          </select>
          <label className="checkbox-label"><input type="checkbox" checked={field.required} onChange={(event) => setFields((current) => current.map((item) => item.id === field.id ? { ...item, required: event.target.checked } : item))} /> Required</label>
          <button type="button" className="icon-button" title="Remove field" aria-label="Remove field" disabled={fields.length === 1} onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))}>×</button>
        </div>)}
        <button type="button" className="secondary-button" onClick={() => setFields((current) => [...current, { id: `field-${Date.now()}-${current.length}`, label: "", type: "text", required: false }])}>+ Add field</button>
        {hasBlankField && <p className="form-hint" role="status">Give every field a label or remove the blank field.</p>}
        <button type="submit" disabled={!!busy || !title.trim() || hasBlankField}>{busy === "create" ? "Creating..." : "Create form"}</button>
      </form>
    </section>

    <section className="form-list">
      <h2>Forms</h2>
      {!forms.length && <p>No forms created yet.</p>}
      {forms.map((form) => <article className="form-admin-item" key={form.id}>
        <div className="form-admin-heading"><div><h3>{form.title}</h3><p>{form.description || "No description"}</p></div>
          <div><Link href={`/admin/forms/${form.id}`}>View responses</Link><button type="button" className="secondary-button" disabled={!!busy} onClick={() => toggleForm(form)}>{form.isActive ? "Pause form" : "Activate form"}</button><button type="button" className="secondary-button" disabled={!!busy} onClick={() => deleteForm(form)}>{busy === form.id ? "Deleting..." : "Delete form"}</button></div></div>
        <p>{form._count.submissions} submissions · {form.access.length} authorized emails · {form.isActive ? "Active" : "Paused"}</p>
        {form.access.length > 0 && <div className="access-list">{form.access.map((entry) => <span className="access-entry" key={entry.email}>{entry.email}<button type="button" className="remove-access" title={`Remove ${entry.email}`} aria-label={`Remove ${entry.email}`} disabled={!!busy} onClick={() => removeAccess(form, entry.email)}>×</button></span>)}</div>}
        <label htmlFor={`access-${form.id}`}>Grant access by email</label>
        <textarea id={`access-${form.id}`} rows={2} value={emails[form.id] ?? ""} onChange={(event) => setEmails((current) => ({ ...current, [form.id]: event.target.value }))} placeholder="one@university.edu, two@university.edu" />
        <button type="button" disabled={!!busy || !(emails[form.id] ?? "").trim()} onClick={() => grantAccess(form)}>{busy === form.id ? "Saving and sending..." : "Grant access and email instructions"}</button>
      </article>)}
    </section>
    {message && <p role="status" className={message.includes("could not be emailed") || message.includes("Give every field") ? "err" : "success"}>{message}</p>}
  </>;
}