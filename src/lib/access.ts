import { db } from "@/lib/db";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function isAdminEmail(email?: string | null) {
  return !!email && (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function getAdminAccount(email: string) {
  return db.adminAccount.findUnique({ where: { email: normalizeEmail(email) } });
}

export async function hasAdminAccess(email?: string | null) {
  if (!email) return false;
  if (isAdminEmail(email)) return true;
  const account = await getAdminAccount(email);
  return !!account?.isActive;
}

export async function hasValidAdminId(email: string, adminId: string) {
  const account = await getAdminAccount(email);
  if (account) return account.isActive && account.adminId === adminId;
  return isAdminEmail(email) && !adminId;
}

export async function hasFormAccess(email: string, formId?: string) {
  return !!(await db.formAccess.findFirst({
    where: { email: normalizeEmail(email), ...(formId ? { formId } : {}), form: { isActive: true } },
    select: { id: true },
  }));
}

export async function canSignIn(email?: string | null) {
  return !!email && (isAdminEmail(email) || await hasFormAccess(email));
}

export async function isRegisteredUser(email: string) {
  return !!(await db.portalUser.findUnique({ where: { email: normalizeEmail(email) }, select: { email: true } }));
}

export async function registerInvitedUser(email: string) {
  return db.portalUser.upsert({ where: { email: normalizeEmail(email) }, update: {}, create: { email: normalizeEmail(email) } });
}