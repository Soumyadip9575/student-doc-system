import Link from "next/link";
import RegistrationForm from "./RegistrationForm";
import GoogleSignInButton from "../GoogleSignInButton";

export default function Register({ searchParams }: { searchParams?: { callbackUrl?: string } }) {
  const requested = searchParams?.callbackUrl;
  const callbackUrl = requested?.startsWith("/user/forms/") && !requested.startsWith("//") ? requested : "/user";
  return (
    <main className="auth-shell"><div className="card registration-card">
      <div className="auth-brand">
        <img src="/brainware-university.svg" alt="Brainware University logo" width={96} height={96} />
        <span>Brainware University</span>
      </div>
      <h1>Create your account</h1>
      <p className="auth-intro">Register with the email address that received your form invitation.</p>
      <div className="auth-divider" />
      <GoogleSignInButton callbackUrl={callbackUrl} />
      <div className="auth-or"><span>or register with email</span></div>
      <RegistrationForm callbackUrl={callbackUrl} />
      <p className="auth-footer">Already registered? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Log in</Link></p>
    </div></main>
  );
}