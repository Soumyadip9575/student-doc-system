import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { verifyOtp } from "@/lib/otp";
import { hasAdminAccess, hasFormAccess, hasValidAdminId, isAdminEmail, isRegisteredUser, normalizeEmail, registerInvitedUser } from "@/lib/access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    Credentials({
      id: "otp",
      credentials: { email: {}, code: {} },
      async authorize(c) {
        const email = normalizeEmail(String(c?.email ?? "")), code = String(c?.code ?? "");
        const allowed = !(await hasAdminAccess(email)) && await isRegisteredUser(email) && await hasFormAccess(email);
        if (!allowed || !(await verifyOtp(email, code))) return null;
        return { id: email, email, name: email };
      },
    }),
    Credentials({
      id: "admin-code",
      credentials: { email: {}, adminId: {}, code: {} },
      async authorize(c) {
        const email = normalizeEmail(String(c?.email ?? "")), adminId = String(c?.adminId ?? ""), code = String(c?.code ?? "");
        if (!(await hasAdminAccess(email)) || !(await hasValidAdminId(email, adminId)) || !/^\d{5}$/.test(code) || !(await verifyOtp(email, code))) return null;
        return { id: email, email, name: email };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  callbacks: {
    signIn: async ({ user, profile, account }) => {
      const rawEmail = profile?.email ?? user?.email;
      if (!rawEmail) return false;
      const email = normalizeEmail(rawEmail);
      if (account?.provider === "google" && profile?.email_verified !== true) return false;
      if (account?.provider === "admin-code") return await hasAdminAccess(email);
      if (isAdminEmail(email)) return true;
      if (await hasAdminAccess(email)) return false;
      if (account?.provider === "google") {
        if (!(await hasFormAccess(email))) return false;
        await registerInvitedUser(email);
        return true;
      }
      return await isRegisteredUser(email) && await hasFormAccess(email);
    },
    authorized: ({ auth }) => !!auth,
  },
});
