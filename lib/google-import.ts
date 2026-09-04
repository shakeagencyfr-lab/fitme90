/**
 * Import d'une fiche d'établissement Google : normalisation.
 *
 * Ce module traduit ce que rend SerpApi en un brouillon prêt à relire par le
 * coach. Il est PUR : aucun réseau, aucune base. C'est là que tout se joue, et
 * c'est donc là que tout est testé.
 *
 * Deux principes.
 *
 * Rien n'est cru sur parole. La réponse vient d'un tiers qui reprend lui-même
 * du contenu écrit par des inconnus : noms d'auteurs, textes d'avis, adresses
 * d'images. Tout est validé, borné et filtré ici. En particulier, une URL qui
 * ne pointe pas vers un domaine d'images Google est écartée : c'est notre
 * serveur qui ira la chercher, et le faire pointer ailleurs ouvrirait la porte
 * à des requêtes vers n'importe quelle machine joignable depuis chez nous.
 *
 * Rien n'est inventé. Un champ absent reste absent ; on ne fabrique pas une
 * accroche à partir de rien. Le coach doit reconnaître son établissement dans
 * ce qu'on lui propose, sinon il n'a aucune raison de nous faire confiance
 * pour le reste de sa page.
 */

// ------------------------------------------------------------------ entrées

/** Une fiche telle que SerpApi la rend. Tous les champs sont incertains. */
export interface RawPlace {
  title?: unknown;
  data_id?: unknown;
  place_id?: unknown;
  address?: unknown;
  phone?: unknown;
  website?: unknown;
  rating?: unknown;
  reviews?: unknown;
  type?: unknown;
  types?: unknown;
  description?: unknown;
  thumbnail?: unknown;
  hours?: unknown;
  operating_hours?: unknown;
  images?: unknown;
}

export interface RawReview {
  user?: unknown;
  rating?: unknown;
  date?: unknown;
  snippet?: unknown;
  extracted_snippet?: unknown;
}

export interface RawPhoto {
  image?: unknown;
  thumbnail?: unknown;
  title?: unknown;
}

// ------------------------------------------------------------------ sorties

/** Un résultat de recherche, proposé au coach pour qu'il choisisse. */
export interface PlaceCandidate {
  /** Identifiant SerpApi de la fiche. Indispensable pour la suite. */
  dataId: string;
  name: string;
  address: string | null;
  rating: number | null;
  reviewsCount: number | null;
  category: string | null;
}

export interface ImportedReview {
  author: string;
  rating: number | null;
  body: string;
  /** Date telle que Google l'écrit (« il y a 2 mois »), jamais réinterprétée. */
  publishedLabel: string | null;
}

export interface OpeningDay {
  day: string;
  hours: string;
}

/** Brouillon complet, relu par le coach avant d'être appliqué. */
export interface ImportDraft {
  dataId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  description: string | null;
  rating: number | null;
  reviewsCount: number | null;
  openingHours: OpeningDay[];
  /** Adresses d'images Google, déjà filtrées sur les domaines autorisés. */
  photos: string[];
  reviews: ImportedReview[];
}

// ------------------------------------------------------------------ garde-fous

/**
 * Domaines d'où une image de fiche Google peut venir.
 *
 * C'est le SEUL endroit qui autorise notre serveur à aller chercher une image
 * ailleurs que chez nous. Sans cette liste, il suffirait qu'une autre adresse
 * se glisse dans la réponse pour lui faire émettre une requête arbitraire,
 * vers un service interne par exemple.
 */
const IMAGE_HOSTS = new Set([
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
  "streetviewpixels-pa.googleapis.com",
  "maps.googleapis.com",
]);

/** Une adresse d'image Google, ou null. */
export function safeImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return null;
    return IMAGE_HOSTS.has(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Une adresse de site web http(s), ou null. Elle finira dans un attribut href. */
export function safeSiteUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 300) : null;
  } catch {
    return null;
  }
}

/**
 * Texte nettoyé et borné, ou null s'il ne reste rien.
 *
 * Les caractères de contrôle et les espaces insécables viennent des
 * copier-coller des auteurs d'avis : ils cassent la mise en page et peuvent
 * masquer du texte à l'œil tout en le laissant dans la page.
 */
function text(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const t = raw
    // Caracteres de controle, et espaces exotiques (insecable, fine, joint de
    // largeur nulle) : ecrits en echappements plutot qu'en litteral, pour que
    // le fichier reste lisible et que l'intention saute aux yeux.
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, " ")
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return t ? t.slice(0, max) : null;
}

/** Numéro de téléphone : on garde les caractères d'un numéro, rien d'autre. */
export function safePhone(raw: unknown): string | null {
  const t = text(raw, 40);
  if (!t) return null;
  const clean = t.replace(/[^0-9+().\-\s]/g, "").replace(/\s+/g, " ").trim();
  // Au moins six chiffres, sinon ce n'est pas un numéro.
  return (clean.match(/\d/g) ?? []).length >= 6 ? clean : null;
}

function number(raw: unknown, min: number, max: number): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return n >= min && n <= max ? n : null;
}

function integer(raw: unknown, max: number): number | null {
  const n = number(raw, 0, max);
  return n === null ? null : Math.round(n);
}

function firstType(raw: unknown): string | null {
  return Array.isArray(raw) ? text(raw[0], 80) : null;
}

// ------------------------------------------------------------------ lecture

/** Résultats de recherche : ne garde que les fiches réellement exploitables. */
export function readCandidates(raw: unknown, limit = 8): PlaceCandidate[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: PlaceCandidate[] = [];
  const vus = new Set<string>();
  for (const item of list) {
    const p = (item ?? {}) as RawPlace;
    const dataId = text(p.data_id, 120);
    const name = text(p.title, 120);
    // Sans identifiant, impossible d'aller chercher le détail : la proposer
    // reviendrait à offrir un bouton qui ne peut rien faire.
    if (!dataId || !name || vus.has(dataId)) continue;
    vus.add(dataId);
    out.push({
      dataId,
      name,
      address: text(p.address, 200),
      rating: number(p.rating, 0, 5),
      reviewsCount: integer(p.reviews, 10_000_000),
      category: text(p.type, 80) ?? firstType(p.types),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Horaires, tels que Google les écrit. Jamais réinterprétés : un « ouvert
 * 24h/24 » ne doit pas devenir faux à cause de notre analyse.
 */
export function readOpeningHours(raw: unknown): OpeningDay[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: OpeningDay[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    // SerpApi rend un objet par jour, de la forme { lundi: "09:00-19:00" }.
    for (const [day, hours] of Object.entries(item as Record<string, unknown>)) {
      const d = text(day, 20);
      const h = text(hours, 120);
      if (d && h && out.length < 7) out.push({ day: d, hours: h });
    }
    if (out.length >= 7) break;
  }
  return out;
}

/** Avis : ne garde que ceux qui portent un texte ET un auteur. */
export function readReviews(raw: unknown, limit = 12): ImportedReview[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: ImportedReview[] = [];
  for (const item of list) {
    const r = (item ?? {}) as RawReview;
    const user = (r.user && typeof r.user === "object" ? r.user : {}) as { name?: unknown };
    const author = text(user.name, 80);
    const body = text(r.extracted_snippet ?? r.snippet, 600);
    // Un avis sans texte est une note, pas un témoignage : rien à afficher.
    if (!author || !body) continue;
    out.push({
      author,
      rating: integer(r.rating, 5),
      body,
      publishedLabel: text(r.date, 60),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Photos : adresses d'images Google uniquement, sans doublon. */
export function readPhotos(raw: unknown, limit = 12): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const vues = new Set<string>();
  for (const item of list) {
    const p = (item && typeof item === "object" ? item : {}) as RawPhoto;
    const url = safeImageUrl(p.image) ?? safeImageUrl(p.thumbnail) ?? safeImageUrl(item);
    if (!url || vues.has(url)) continue;
    vues.add(url);
    out.push(url);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Assemble le brouillon. `place` vient du détail de la fiche ; `reviews` et
 * `photos` de deux appels séparés, ou de la fiche elle-même quand elle les
 * porte déjà.
 */
export function buildDraft(
  place: RawPlace,
  opts: { dataId: string; reviews?: unknown; photos?: unknown },
): ImportDraft | null {
  const name = text(place.title, 120);
  // Une fiche sans nom n'est pas exploitable : mieux vaut le dire tout de suite
  // que de proposer un brouillon vide au coach.
  if (!name) return null;
  return {
    dataId: opts.dataId,
    name,
    address: text(place.address, 200),
    phone: safePhone(place.phone),
    website: safeSiteUrl(place.website),
    category: text(place.type, 80) ?? firstType(place.types),
    description: text(place.description, 1200),
    rating: number(place.rating, 0, 5),
    reviewsCount: integer(place.reviews, 10_000_000),
    openingHours: readOpeningHours(place.hours ?? place.operating_hours),
    photos: readPhotos(opts.photos ?? place.images),
    reviews: readReviews(opts.reviews),
  };
}

// ------------------------------------------------------------------ textes

/**
 * Propositions de textes pour la page publique.
 *
 * On ne rédige pas à la place du coach : on assemble ce que sa fiche dit déjà.
 * Le titre reprend son nom, l'accroche sa catégorie et sa ville, la section
 * « à propos » sa description quand il en a écrit une. Tout reste modifiable
 * juste après, dans les champs habituels.
 */
export interface SuggestedCopy {
  headline: string;
  tagline: string | null;
  aboutText: string | null;
}

/** Ville déduite d'une adresse postale, ou null. */
export function cityFromAddress(address: string | null): string | null {
  if (!address) return null;
  // « 12 rue des Lilas, 75011 Paris, France » : la ville suit le code postal.
  const m = address.match(/\b\d{4,5}\s+([^,]{2,60})/);
  const ville = m?.[1]?.trim();
  if (ville) return ville;
  // À défaut, l'avant-dernier segment, le dernier étant souvent le pays.
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2].slice(0, 60) : null;
}

export function suggestCopy(draft: ImportDraft): SuggestedCopy {
  const ville = cityFromAddress(draft.address);
  const cat = draft.category;
  // L'accroche n'existe que si la fiche dit quelque chose. Une phrase
  // générique vaudrait moins que rien : elle a l'air d'un site pas fini.
  let tagline: string | null = null;
  if (cat && ville) tagline = `${cat} à ${ville}`;
  else if (cat) tagline = cat;
  else if (ville) tagline = ville;

  return { headline: draft.name, tagline, aboutText: draft.description };
}
