"use client";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

function newCaptcha() {
  return { first: Math.floor(Math.random() * 8) + 2, second: Math.floor(Math.random() * 8) + 1 };
}

export default function OtpForm({ requireCaptcha = false, callbackUrl = "/portal" }: { requireCaptcha?: boolean; callbackUrl?: string }) {
  const [designation, setDesignation] = useState<"user" | "admin">("user");
  const [email, setEmail] = useState(""); const [code, setCode] = useState("");
  const [adminId, setAdminId] = useState("");
  const [sent, setSent] = useState(false); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState({ first: 0, second: 0 }); const [captchaAnswer, setCaptchaAnswer] = useState("");

  useEffect(() => { if (requireCaptcha) setCaptcha(newCaptcha()); }, [requireCaptcha]);

  async function send() {
    if (requireCaptcha && Number(captchaAnswer) !== captcha.first + captcha.second) {
      setMsg("Please solve the security check.");
      setCaptcha(newCaptcha());
      setCaptchaAnswer("");
      return;
    }
    setBusy(true); setMsg("");
    try {
      const endpoint = designation === "admin" ? "/api/admin-login/send" : "/api/otp/send";
      const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, adminId, intent: "login" }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not send the access code.");
      setSent(true);
    } catch (error) { setMsg((error as Error).message); }
    setBusy(false);
  }
  async function verify() {
    setBusy(true); setMsg("");
    const provider = designation === "admin" ? "admin-code" : "otp";
    const r = await signIn(provider, { email, adminId, code, redirect: false });
    if (!r || r.error) { setMsg("Invalid or expired code. Please request a new one."); setBusy(false); }
    else location.href = designation === "admin" ? "/dashboard" : callbackUrl;
  }
  return (
    <div style={{ marginTop: 24 }}>
      <div className="designation-switch" role="group" aria-label="Choose account type">
        <button type="button" className={designation === "user" ? "selected" : ""} aria-pressed={designation === "user"} onClick={() => { setDesignation("user"); setSent(false); setCode(""); setAdminId(""); setMsg(""); }}>User</button>
        <button type="button" className={designation === "admin" ? "selected" : ""} aria-pressed={designation === "admin"} onClick={() => { setDesignation("admin"); setSent(false); setCode(""); setAdminId(""); setMsg(""); }}>Admin</button>
      </div>
      <label htmlFor="e">{designation === "admin" ? "Admin email" : "University email"}</label>
      <input id="e" type="email" autoComplete="username" value={email} onChange={(x) => setEmail(x.target.value)} placeholder={designation === "admin" ? "admin@university.edu" : "name@university.edu"} disabled={sent} />
      {designation === "admin" && <>
        <label htmlFor="admin-id">Assigned five-digit Admin ID</label>
        <input id="admin-id" inputMode="numeric" autoComplete="off" maxLength={5} value={adminId} onChange={(event) => setAdminId(event.target.value.replace(/\D/g, "").slice(0, 5))} disabled={sent} placeholder="ID supplied by an existing admin" />
        <p className="admin-code-hint">Bootstrap admins may leave this blank. Assigned admins must enter their Admin ID and the separate emailed sign-in code.</p>
      </>}
      {requireCaptcha && !sent && <div className="captcha-box">
        <label htmlFor="captcha">Security check</label>
        <div className="captcha-question">
          <span>{captcha.first} + {captcha.second} =</span>
          <input id="captcha" inputMode="numeric" value={captchaAnswer} onChange={(x) => setCaptchaAnswer(x.target.value)} placeholder="Answer" />
        </div>
      </div>}
      {!sent ? <button onClick={send} disabled={busy || !email || (designation === "admin" && !!adminId && adminId.length !== 5)} style={{ width: "100%" }}>{busy ? "Sending..." : designation === "admin" ? "Continue and email sign-in code" : "Send OTP"}</button> : <>
        <label htmlFor="c">{designation === "admin" ? "Five-digit admin access code" : "Enter 6-digit verification code"}</label>
        <input id="c" inputMode="numeric" maxLength={designation === "admin" ? 5 : 6} value={code} onChange={(x) => setCode(x.target.value.replace(/\D/g, "").slice(0, designation === "admin" ? 5 : 6))} />
        <button onClick={verify} disabled={busy || code.length !== (designation === "admin" ? 5 : 6)} style={{ width: "100%" }}>{busy ? "Continuing..." : designation === "admin" ? "Continue to Admin Panel" : "Verify and continue"}</button>
        <button onClick={() => { setSent(false); setCode(""); }} style={{ width: "100%", background: "#111" }}>Resend / change email</button></>}
      {msg && <p className="err" role="alert">{msg}</p>}
    </div>
  );
}
