// Génération de codes lisibles (cadeaux / promo). Alphabet sans caractères
// ambigus (pas de 0/O, 1/I/L) pour la dictée à voix haute.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(len = 8): string {
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += ALPHABET[arr[i] % ALPHABET.length];
  return out;
}

/** Normalise un code saisi (majuscules, sans espaces ni tirets). */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
}
