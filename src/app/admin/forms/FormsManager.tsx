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

type FormTemplate = {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  updatedAt: string | Date;
};

export default function FormsManager({ forms: initialForms, templates: initialTemplates }: { forms: FormSummary[]; templates: FormTemplate[] }) {
  const [forms, setForms] = useState(initialForms);
  const [templates, setTemplates] = useState(initialTemplates);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([{ id: "field-1", label: "Student name", type: "text", required: true }]);
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const hasBlankField = fields.some((field) => !field.label.trim());
  const hasDuplicateFields = new Set(fields.map((field) => field.id)).size !== fields.length
    || new Set(fields.map((field) => field.label.trim().toLowerCase())).size !== fields.length;

  async function request(url: string, method: string, body: object) {
    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }

  async function createForm(event: React.FormEvent) {
    event.preventDefault();
    if (hasBlankField) { setMessage("Give every field a label or remove the blank field."); return; }
    if (hasDuplicateFields) { setMessage("Field IDs and labels must be unique."); return; }
    setBusy("create"); setMessage("");
    try {
      if (editingTemplateId) {
        const result = await request(`/api/admin/form-templates/${editingTemplateId}`, "PATCH", { title, description, fields });
        setTemplates((current) => current.map((template) => template.id === editingTemplateId ? { ...template, ...result, fields } : template));
        setEditingTemplateId("");
        setMessage("Template updated.");
        setBusy("");
        return;
      }
      const result = await request("/api/admin/forms", "POST", { title, description, fields });
      setForms((current) => [{ id: result.id, title, description, isActive: true, fields, access: [], _count: { submissions: 0 } }, ...current]);
      setTitle(""); setDescription(""); setFields([{ id: `field-${Date.now()}`, label: "Student name", type: "text", required: true }]);
      setMessage("Form created. Add the email addresses allowed to fill it in.");
    } catch (error) { setMessage((error as Error).message); }
    setBusy("");
  }

  async function saveTemplate() {
    if (!title.trim()) { setMessage("Give the template a title."); return; }
    if (hasBlankField) { setMessage("Give every field a label or remove the blank field."); return; }
    if (hasDuplicateFields) { setMessage("Field IDs and labels must be unique."); return; }
    setBusy("template"); setMessage("");
    try {
      const result = await request("/api/admin/form-templates", "POST", { title, description, fields });
      setTemplates((current) => [{ id: result.id, title, description, fields, updatedAt: result.updatedAt }, ...current]);
      setMessage(`Saved "${title}" as a reusable template.`);
    } catch (error) { setMessage((error as Error).message); }
    setBusy("");
  }

  function useTemplate(template: FormTemplate, edit = false) {
    setTitle(template.title);
    setDescription(template.description);
    setFields(template.fields.map((field, index) => ({ ...field, id: `field-${Date.now()}-${index}` })));
    setEditingTemplateId(edit ? template.id : "");
    setMessage(edit ? `Editing template "${template.title}".` : `Template "${template.title}" loaded. Edit it and create a form.`);
    document.getElementById("form-title")?.focus();
  }

  function cancelTemplateEdit() {
    setEditingTemplateId("");
    setTitle("");
    setDescription("");
    setFields([{ id: `field-${Date.now()}`, label: "Student name", type: "text", required: true }]);
    setMessage("Template editing cancelled.");
  }

  async function deleteTemplate(template: FormTemplate) {
    if (!window.confirm(`Delete the reusable template "${template.title}"? Existing forms will not be affected.`)) return;
    setBusy(template.id); setMessage("");
    try {
      await request(`/api/admin/form-templates/${template.id}`, "DELETE", {});
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      if (editingTemplateId === template.id) cancelTemplateEdit();
      setMessage(`Deleted template "${template.title}".`);
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
      <h2>{editingTemplateId ? "Edit reusable template" : "New form"}</h2>
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
        <button type="submit" disabled={!!busy || !title.trim() || hasBlankField || hasDuplicateFields}>{editingTemplateId ? "Save template changes" : "Create form"}</button>
        {!editingTemplateId && <button type="button" className="secondary-button" disabled={!!busy || !title.trim() || hasBlankField || hasDuplicateFields} onClick={saveTemplate}>{busy === "template" ? "Saving..." : "Save as reusable template"}</button>}
        {editingTemplateId && <button type="button" className="secondary-button" disabled={!!busy} onClick={cancelTemplateEdit}>Cancel template editing</button>}
      </form>
    </section>

    <section className="form-list">
      <h2>Reusable templates</h2>
      <p>Save form layouts for future use. Templates are private to the Form Builder and do not appear in the student portal until you create a form from them.</p>
      {!templates.length && <p>No templates saved yet. Build a form above and choose “Save as reusable template”.</p>}
      {templates.map((template) => <article className="form-admin-item" key={template.id}>
        <div className="form-admin-heading"><div><h3>{template.title}</h3><p>{template.description || "No description"}</p></div>
          <div>
            <button type="button" className="secondary-button" disabled={!!busy} onClick={() => useTemplate(template)}>Use template</button>
            <button type="button" className="secondary-button" disabled={!!busy} onClick={() => useTemplate(template, true)}>Edit template</button>
            <button type="button" className="secondary-button" disabled={!!busy} onClick={() => deleteTemplate(template)}>{busy === template.id ? "Deleting..." : "Delete template"}</button>
          </div></div>
        <p>{template.fields.length} fields · Updated {new Date(template.updatedAt).toLocaleDateString()}</p>
      </article>)}
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