/**
 * Lire le corps d'une réponse SANS dépasser un budget d'octets.
 *
 * `res.text()` et `res.arrayBuffer()` mettent TOUT en mémoire avant de rendre
 * la main : vérifier la taille après coup ne protège de rien, le mal est fait.
 * C'était le cas des deux appels sortants de l'import Google, qui annonçaient
 * pourtant une limite. Ici on lit par morceaux et on abandonne au premier
 * dépassement, ce qui rend la limite vraie.
 *
 * `Content-Length` sert de première barrière quand il est présent : autant ne
 * pas ouvrir le flux du tout. Il n'est pas fiable seul (absent en chunked, ou
 * simplement menteur), d'où le décompte réel derrière.
 */
export async function readBounded(res: Response, maxBytes: number): Promise<Uint8Array | null> {
  const annonce = Number(res.headers.get("content-length"));
  if (Number.isFinite(annonce) && annonce > maxBytes) return null;

  const body = res.body;
  if (!body) return null;

  const reader = body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      morceaux.push(value);
    }
  } catch {
    return null;
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const m of morceaux) {
    out.set(m, offset);
    offset += m.byteLength;
  }
  return out;
}

/** Le corps en texte, ou null s'il dépasse le budget. */
export async function readBoundedText(res: Response, maxBytes: number): Promise<string | null> {
  const octets = await readBounded(res, maxBytes);
  return octets === null ? null : new TextDecoder().decode(octets);
}
