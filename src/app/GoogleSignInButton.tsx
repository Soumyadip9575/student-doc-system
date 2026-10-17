import { signIn } from "@/auth";

export default function GoogleSignInButton({ callbackUrl }: { callbackUrl: string }) {
  return <form action={async () => {
    "use server";
    await signIn("google", { redirectTo: callbackUrl, prompt: "select_account" });
  }}>
    <button type="submit" className="google-button"><span className="google-mark" aria-hidden="true">G</span>Continue with Google</button>
  </form>;
}