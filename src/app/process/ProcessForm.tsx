"use client";
import { useState } from "react";

type FormOption = { id: string; title: string; submissions: number };
type Result = { total: number; alreadyProcessed: number; newDocuments: number; sent: number; failed: number; demo: boolean };

export default function ProcessForm({ forms }: { forms: FormOption[] }) {
  const [formId, setFormId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function process() {
    setBusy(true); setMessage(""); setResult(null);
    try {
      const response = await fetch("/api/process", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ formId, recipient }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Document generation failed.");
      setResult(data);
    } catch (error) { setMessage((error as Error).message); }
    setBusy(false);
  }

  return <>
    <section className="admin-form-builder">
      {!forms.length ? <p>No active forms yet. Create one in <a href="/admin/forms">Form Builder</a> and collect responses first.</p> : <>
        <label htmlFor="selected-form">Form</label>
        <select id="selected-form" value={formId} onChange={(event) => setFormId(event.target.value)}>
          <option value="">Select a form</option>{forms.map((form) => <option key={form.id} value={form.id}>{form.title} ({form.submissions} responses)</option>)}
        </select>
        <label htmlFor="recipient">Delivery recipient</label>
        <input id="recipient" type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="department@university.edu" />
        <button type="button" disabled={busy || !formId || !recipient} onClick={process}>{busy ? "Generating and sending..." : "Generate and send PDFs"}</button>
      </>}
      {message && <p className="err" role="alert">{message}</p>}
    </section>
    {result && <section className="card process-result">
      <h2>Processing complete{result.demo ? " (demo, no real email sent)" : ""}</h2>
      <p>{result.total} responses checked · {result.newDocuments} new documents · {result.sent} sent · {result.failed} failed · {result.alreadyProcessed} already processed</p>
      <p><a href="/history">Processing history</a> · <a href="/documents">Documents</a></p>
    </section>}
  </>;
}