"use client";
import { useState } from "react";
import type { FormField } from "@/lib/forms";

export default function SubmissionForm({ formId, fields }: { formId: string; fields: FormField[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/forms/${formId}/submissions`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: values }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit this form.");
      setValues({}); setMessage("Response submitted successfully.");
    } catch (error) { setMessage((error as Error).message); }
    setBusy(false);
  }

  return <form className="submission-form" onSubmit={submit}>
    {fields.map((field) => <div key={field.id}>
      <label htmlFor={field.id}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>
      {field.type === "textarea" ? <textarea id={field.id} rows={4} required={field.required} maxLength={2000} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} /> :
        <input id={field.id} type={field.type} required={field.required} maxLength={field.type === "number" ? undefined : 2000} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} />}
    </div>)}
    <button type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit response"}</button>
    {message && <p role="status" className={message.startsWith("Response") ? "success" : "err"}>{message}</p>}
  </form>;
}