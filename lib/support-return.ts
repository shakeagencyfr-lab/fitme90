import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Retour à l'espace de l'opérateur après une connexion d'assistance : un cookie
// signé (HMAC, clé serveur) mémorise l'utilisateur d'origine. Il n'accorde rien
// par lui-même : l'action de retour rétablit une session Supabase normale.

export const SUPPORT_RETURN_COOKIE = "support_return";
const MAX_AGE_S = 60 * 60 * 8;

interface Payload {
  actorUserId: string;
  actorName: string;
  targetUserId: string;
  ts: number;
}

function key(): string {
  return process.env.SUPPORT_RETURN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function sign(body: string): string {
  return createHmac("sha256", key()).update(body).digest("base64url");
}

export async function setSupportReturn(p: Omit<Payload, "ts">): Promise<void> {
  if (!key()) return;
  const body = Buffer.from(JSON.stringify({ ...p, ts: Date.now() } satisfies Payload)).toString("base64url");
  const store = await cookies();
  store.set(SUPPORT_RETURN_COOKIE, `${body}.${sign(body)}`, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_S,
  });
}

export async function readSupportReturn(): Promise<Payload | null> {
  if (!key()) return null;
  try {
    const store = await cookies();
    const raw = store.get(SUPPORT_RETURN_COOKIE)?.value;
    if (!raw) return null;
    const [body, sig] = raw.split(".");
    if (!body || !sig) return null;
    const expected = sign(body);
    if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (Date.now() - p.ts > MAX_AGE_S * 1000) return null;
    return p;
  } catch {
    return null;
  }
}

export async function clearSupportReturn(): Promise<void> {
  const store = await cookies();
  store.set(SUPPORT_RETURN_COOKIE, "", { path: "/", maxAge: 0 });
}
