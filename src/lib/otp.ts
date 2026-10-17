import { db } from "./db";

async function hash(email: string, code: string) {
  const input = new TextEncoder().encode(`${email}|${code}|${process.env.AUTH_SECRET}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function issueCode(email: string, digits: number): Promise<string> {
  const e = email.toLowerCase();
  const last = await db.otp.findFirst({
    where: { email: e, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - last.createdAt.getTime() < 60_000) throw new Error("Please wait a minute before requesting another code.");
  const min = 10 ** (digits - 1);
  const range = min * 9;
  const limit = Math.floor(0x100000000 / range) * range;
  let randomValue: number;
  do {
    const random = globalThis.crypto.getRandomValues(new Uint32Array(1));
    randomValue = random[0];
  } while (randomValue >= limit);
  const code = String(min + randomValue % range);
  await db.otp.create({ data: { email: e, codeHash: await hash(e, code), expiresAt: new Date(Date.now() + 5 * 60_000) } });
  return code;
}

/** Creates a 6-digit code valid for 5 minutes. Only the hash is stored. 60s resend cooldown. */
export async function issueOtp(email: string): Promise<string> {
  return issueCode(email, 6);
}

/** Creates a 5-digit admin code with the same one-use, expiry, and resend protections. */
export async function issueAdminCode(email: string): Promise<string> {
  return issueCode(email, 5);
}

export async function cancelOtp(email: string, code: string): Promise<void> {
  const e = email.toLowerCase();
  await db.otp.updateMany({
    where: { email: e, codeHash: await hash(e, code), used: false },
    data: { used: true, expiresAt: new Date(0) },
  });
}

/** Single-use, max 5 wrong attempts. */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const e = email.toLowerCase();
  const o = await db.otp.findFirst({ where: { email: e, used: false }, orderBy: { createdAt: "desc" } });
  if (!o || o.expiresAt < new Date() || o.attempts >= 5) return false;
  if (o.codeHash !== await hash(e, code)) { await db.otp.update({ where: { id: o.id }, data: { attempts: { increment: 1 } } }); return false; }
  await db.otp.update({ where: { id: o.id }, data: { used: true } });
  return true;
}
