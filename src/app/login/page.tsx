import Link from "next/link";
import OtpForm from "./OtpForm";
import GoogleSignInButton from "../GoogleSignInButton";

export default function Login({ searchParams }: { searchParams?: { registered?: string; callbackUrl?: string } }) {
  const requested = searchParams?.callbackUrl;
  const callbackUrl = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/portal";
  return (
    <main className="auth-shell"><div className="card auth-card">
      <div className="auth-brand">
        <img src="/brainware-university.svg" alt="Brainware University logo" width={96} height={96} />
        <span>Brainware University</span>
      </div>
      <h1>Welcome Back</h1>
      <p className="auth-intro">Sign in to your university portal.</p>
      {searchParams?.registered === "1" && <p className="registration-success" role="status">Registration successful. Sign in with the email you registered.</p>}
      <div className="auth-divider" />
      <GoogleSignInButton callbackUrl={callbackUrl} />
      <div className="auth-or"><span>or sign in with email</span></div>
      <OtpForm requireCaptcha callbackUrl={callbackUrl} />
      <p className="auth-footer">New user with an invitation? <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Register</Link></p>
    </div></main>
  );
}
