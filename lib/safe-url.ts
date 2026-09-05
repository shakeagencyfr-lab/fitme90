/**
 * Adresses venues de l'extérieur : où on accepte d'envoyer quelqu'un, et où
 * on accepte d'envoyer quelque chose. Pur, testé.
 *
 * Un paramètre « suite » ou « next » dit où atterrir après une connexion. Il
 * doit rester DANS le site : « //evil.com » commence pourtant par « / », et un
 * navigateur y lit une adresse absolue vers un autre domaine. Ce genre de
 * lien, dans un e-mail à l'en-tête de la plateforme, envoie une personne qui
 * vient de se connecter chez elle vers une page qu'elle croit être la nôtre.
 */

/** Un chemin local et seulement local, sinon le repli. */
export function safeLocalPath(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!s.startsWith("/")) return fallback;
  // « // » et « /\ » : adresses absolues déguisées en chemin.
  if (s.length > 1 && (s[1] === "/" || s[1] === "\\")) return fallback;
  // Un chemin n'a ni schéma, ni caractère de contrôle, ni retour à la ligne.
  if (/[\u0000-\u001f\u007f]/.test(s) || /^\/+[a-z][a-z0-9+.-]*:/i.test(s)) return fallback;
  if (s.length > 2000) return fallback;
  return s;
}

/**
 * Une adresse de service push acceptable : HTTPS, vers un vrai nom d'hôte.
 *
 * Le serveur POSTE ensuite sur cette adresse (web-push). Enregistrée depuis
 * un navigateur elle vient toujours d'un service push public en HTTPS ; posée
 * à la main par un appel direct à l'API, elle ferait de notre serveur un
 * relais vers n'importe quelle adresse, y compris interne.
 */
export function safePushEndpoint(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 2000) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".")) return null;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  // Adresse IP littérale (v4 ou v6 entre crochets) : jamais un service push.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) return null;
  return u.toString();
}
