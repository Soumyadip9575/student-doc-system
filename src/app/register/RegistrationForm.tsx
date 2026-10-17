"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

function newCaptcha() {
  return { first: Math.floor(Math.random() * 8) + 2, second: Math.floor(Math.random() * 8) + 1 };
}

export default function RegistrationForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [captcha, setCaptcha] = useState({ first: 0, second: 0 });
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const loginUrl = `/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`;

  useEffect(() => { setCaptcha(newCaptcha()); }, []);

  async function sendCode() {
    if (Number(answer) !== captcha.first + captcha.second) {
      setMessage("Please solve the security check."); setCaptcha(newCaptcha()); setAnswer(""); return;
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, intent: "register" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send the verification code.");
      setSent(true);
    } catch (error) { setMessage((error as Error).message); }
    setBusy(false);
  }

  async function register() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/register", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Registration could not be completed.");
      setRegistered(true);
    } catch (error) { setMessage((error as Error).message); }
    setBusy(false);
  }

  if (registered) return <div className="registration-complete" role="status">
    <h2>Registration successful</h2>
    <p>Your email is verified and your account is ready. Log in to open your form.</p>
    <Link className="auth-primary-link" href={loginUrl}>Continue to login</Link>
  </div>;

  return <div className="registration-form">
    <label htmlFor="registration-email">Invited email address</label>
    <input id="registration-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@university.edu" disabled={sent} />
    {!sent && <div className="captcha-box">
      <label htmlFor="registration-answer">Security check</label>
      <div className="captcha-question"><span>{captcha.first} + {captcha.second} =</span>
        <input id="registration-answer" inputMode="numeric" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer" />
      </div>
    </div>}
    {!sent ? <button type="button" onClick={sendCode} disabled={busy || !email}>{busy ? "Sending..." : "Send verification code"}</button> : <>
      <label htmlFor="registration-code">Six-digit verification code</label>
      <input id="registration-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} />
      <button type="button" onClick={register} disabled={busy || code.length !== 6}>{busy ? "Registering..." : "Complete registration"}</button>
      <button type="button" className="auth-secondary-button" onClick={() => { setSent(false); setCode(""); setMessage(""); }}>Change email / resend</button>
    </>}
    {message && <p className="err" role="alert">{message}</p>}
  </div>;
}