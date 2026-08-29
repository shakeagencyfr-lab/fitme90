import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Chiffrement symétrique (AES-256-GCM) des secrets sensibles (ex. clé Anthropic
// d'un tenant). La clé maître vient de l'environnement serveur SECRETS_ENC_KEY
// (32 octets, en hex de 64 caractères ou en base64). Le texte chiffré stocké est
// base64( iv(12) | tag(16) | ciphertext ). Jamais de secret en clair en base.

function masterKey(): Buffer | null {
  const raw = process.env.SECRETS_ENC_KEY;
  if (!raw) return null;
  // Accepte hex (64 car.) ou base64.
  const buf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : null;
}

/** Le chiffrement des secrets est-il configuré ? */
export function secretsEncryptionReady(): boolean {
  return masterKey() !== null;
}

/** Chiffre une chaîne. Lève si SECRETS_ENC_KEY est absente/invalide. */
export function encryptSecret(plain: string): string {
  const key = masterKey();
  if (!key) throw new Error("SECRETS_ENC_KEY manquante ou invalide (32 octets).");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Déchiffre une chaîne produite par encryptSecret. null si impossible. */
export function decryptSecret(payload: string | null | undefined): string | null {
  const key = masterKey();
  if (!key || !payload) return null;
  try {
    const raw = Buffer.from(payload, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Indice non secret pour l'affichage (ex. "sk-ant-…AB12"). */
export function keyHint(key: string): string {
  const t = key.trim();
  if (t.length <= 8) return "…";
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}
