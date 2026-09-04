import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeImageUrl, suggestCopy, type ImportDraft } from "@/lib/google-import";

/**
 * Application d'un brouillon Google au compte du coach.
 *
 * L'import se fait en deux temps : `lib/serpapi` va chercher, le coach relit,
 * puis ceci écrit. La séparation compte : rien n'est enregistré sans que le
 * coach ait vu ce qui allait l'être, et il choisit bloc par bloc. Un import
 * qui écrase silencieusement une page déjà rédigée serait pire que pas
 * d'import du tout.
 *
 * Deux règles d'écriture.
 *
 * On n'écrase jamais avec du vide. Si la fiche Google n'a pas de téléphone et
 * que le coach en a saisi un, le sien reste. Un champ absent chez Google veut
 * dire « Google ne sait pas », pas « ce coach n'a pas de téléphone ».
 *
 * Les textes ne sont proposés que sur une page encore vierge. Un coach qui a
 * écrit son accroche ne veut pas la voir remplacée par « Salle de sport à
 * Lyon » parce qu'il a cliqué sur un bouton d'import.
 */

export interface ApplyChoices {
  /** Coordonnées : adresse, téléphone, site, horaires, note. */
  infos: boolean;
  /** Textes proposés (titre, accroche, à propos), sur page vierge seulement. */
  textes: boolean;
  /** Photo à reprendre comme visuel de la section « à propos ». */
  photoUrl: string | null;
  /** Indices des avis retenus dans `draft.reviews`. */
  avis: number[];
}

export interface ApplyResult {
  ok: boolean;
  error?: string;
  /** Ce qui a réellement changé, pour le dire au coach sans le lui faire deviner. */
  applied: { infos: boolean; textes: boolean; photo: boolean; avis: number };
}

/** Taille maximale d'une photo recopiée. Au-delà, on passe. */
const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
const PHOTO_TIMEOUT_MS = 10_000;

/**
 * Recopie une photo Google dans notre stockage.
 *
 * On ne pointe pas vers l'adresse Google directement : elle expire, et elle
 * ferait fuiter la visite de chaque client vers un tiers. On copie donc, une
 * fois, chez nous.
 *
 * L'adresse repasse par `safeImageUrl` bien qu'elle vienne déjà d'un brouillon
 * validé, parce qu'entre les deux elle a fait un aller-retour par le
 * navigateur du coach : ce qui revient d'un formulaire n'est plus ce qu'on y
 * avait mis.
 */
export async function copyPlacePhoto(
  tenantId: string,
  rawUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  const url = safeImageUrl(rawUrl);
  if (!url) return null;

  const ctrl = new AbortController();
  const minuterie = setTimeout(() => ctrl.abort(), PHOTO_TIMEOUT_MS);
  try {
    const res = await fetcher(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    // Sans ce contrôle, une adresse d'image pourrait servir n'importe quel
    // fichier, et on le republierait sous notre propre domaine.
    if (!/^image\/(png|jpeg|webp)$/.test(type)) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > PHOTO_MAX_BYTES) return null;

    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const chemin = `${tenantId}/google-${Date.now()}.${ext}`;
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("tenant-assets")
      .upload(chemin, buf, { contentType: type, upsert: true });
    if (error) return null;
    return admin.storage.from("tenant-assets").getPublicUrl(chemin).data.publicUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(minuterie);
  }
}

/** Lien Google Maps d'une fiche, reconstruit depuis son identifiant. */
export function mapsUrlFor(draft: ImportDraft): string | null {
  // `data_id` a la forme « 0x47e66e:0x40b8 » ; Google le comprend en paramètre
  // de requête. Sans lui, pas de lien : on n'en invente pas un approximatif.
  if (!/^0x[0-9a-f]+:0x[0-9a-f]+$/i.test(draft.dataId)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(draft.name)}&query_place_id=${encodeURIComponent(draft.dataId)}`;
}

/**
 * Champs à écrire pour les coordonnées, en ne gardant que ce que Google sait.
 *
 * Séparé de l'écriture pour être testable : c'est ici que se joue le « ne pas
 * écraser avec du vide », et c'est la faute qu'on ne verrait qu'après coup,
 * quand le coach constate que son téléphone a disparu.
 */
export function infoPatch(draft: ImportDraft): Record<string, unknown> {
  const patch: Record<string, unknown> = { google_place_id: draft.dataId };
  if (draft.address) patch.address = draft.address;
  if (draft.phone) patch.phone = draft.phone;
  if (draft.website) patch.website_url = draft.website;
  if (draft.rating != null) patch.google_rating = draft.rating;
  if (draft.reviewsCount != null) patch.google_reviews_count = draft.reviewsCount;
  if (draft.openingHours.length > 0) patch.opening_hours = draft.openingHours;
  const maps = mapsUrlFor(draft);
  if (maps) patch.google_maps_url = maps;
  return patch;
}

/**
 * Champs à écrire pour les textes, sur une page encore vierge uniquement.
 *
 * `actuel` porte ce que le coach a déjà. Chaque champ déjà rempli est laissé
 * tel quel, même si Google propose mieux : ce n'est pas à nous d'en juger.
 */
export function copyPatch(
  draft: ImportDraft,
  actuel: { headline: string | null; tagline: string | null; aboutText: string | null },
): Record<string, unknown> {
  const propose = suggestCopy(draft);
  const patch: Record<string, unknown> = {};
  if (!actuel.headline?.trim() && propose.headline) patch.headline = propose.headline;
  if (!actuel.tagline?.trim() && propose.tagline) patch.tagline = propose.tagline;
  if (!actuel.aboutText?.trim() && propose.aboutText) {
    patch.about_text = propose.aboutText;
    patch.about_enabled = true;
  }
  return patch;
}

/** Applique le brouillon relu par le coach. */
export async function applyGoogleImport(
  tenantId: string,
  draft: ImportDraft,
  choix: ApplyChoices,
  fetcher: typeof fetch = fetch,
  importId: string | null = null,
): Promise<ApplyResult> {
  const admin = createAdminClient();
  const applied = { infos: false, textes: false, photo: false, avis: 0 };
  let patch: Record<string, unknown> = {};

  if (choix.infos) {
    patch = { ...patch, ...infoPatch(draft) };
    applied.infos = true;
  }

  if (choix.textes) {
    const { data: actuel } = await admin
      .from("tenants")
      .select("headline, tagline, about_text")
      .eq("id", tenantId)
      .maybeSingle<{ headline: string | null; tagline: string | null; about_text: string | null }>();
    const textes = copyPatch(draft, {
      headline: actuel?.headline ?? null,
      tagline: actuel?.tagline ?? null,
      aboutText: actuel?.about_text ?? null,
    });
    patch = { ...patch, ...textes };
    applied.textes = Object.keys(textes).length > 0;
  }

  if (choix.photoUrl) {
    const url = await copyPlacePhoto(tenantId, choix.photoUrl, fetcher);
    if (url) {
      patch.about_photo_url = url;
      applied.photo = true;
    }
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("tenants").update(patch).eq("id", tenantId);
    if (error) return { ok: false, error: "Enregistrement impossible.", applied };
  }

  // Les avis retenus deviennent des témoignages. On remplace ceux déjà venus
  // de Google plutôt que d'empiler : réimporter deux fois ne doit pas doubler
  // la section. Ceux saisis à la main ne sont pas touchés.
  const retenus = choix.avis
    .map((i) => draft.reviews[i])
    .filter((r): r is NonNullable<typeof r> => !!r)
    .slice(0, 12);
  if (retenus.length > 0) {
    await admin.from("testimonials").delete().eq("tenant_id", tenantId).eq("source", "google");
    const { error } = await admin.from("testimonials").insert(
      retenus.map((r, i) => ({
        tenant_id: tenantId,
        author: r.author,
        body: r.body,
        rating: r.rating,
        published_label: r.publishedLabel,
        source: "google",
        position: i,
        is_active: true,
      })),
    );
    if (!error) applied.avis = retenus.length;
  }

  // Trace de ce qui a réellement été appliqué, et quand.
  if (importId) {
    await admin
      .from("google_imports")
      .update({ status: "applied", applied_at: new Date().toISOString() })
      .eq("id", importId)
      .eq("tenant_id", tenantId);
  }

  return { ok: true, applied };
}

// ------------------------------------------------------------------ brouillon

/**
 * Met le brouillon de côté, entre la recherche et l'application.
 *
 * Il pourrait faire l'aller-retour par le navigateur du coach, mais alors ce
 * qui reviendrait ne serait plus ce qu'on avait envoyé : il faudrait tout
 * revalider, et une adresse d'image glissée dans le formulaire ferait appeler
 * la machine qu'on lui désigne. Le garder ici coûte une ligne et supprime la
 * question. Accessoirement, cela évite de redemander la fiche au service, qui
 * facture chaque appel.
 */
export async function saveImportDraft(tenantId: string, draft: ImportDraft): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("google_imports")
    .insert({ tenant_id: tenantId, data_id: draft.dataId, payload: draft, status: "preview" })
    .select("id")
    .maybeSingle<{ id: string }>();
  return error ? null : (data?.id ?? null);
}

/**
 * Relit un brouillon mis de côté.
 *
 * Le filtre par tenant n'est pas une précaution de style : l'identifiant vient
 * du navigateur, et sans lui il suffirait d'en essayer un autre pour lire la
 * fiche importée par un confrère.
 */
export async function readImportDraft(tenantId: string, importId: string): Promise<ImportDraft | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_imports")
    .select("payload")
    .eq("id", importId)
    .eq("tenant_id", tenantId)
    .maybeSingle<{ payload: unknown }>();
  const p = data?.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const draft = p as Partial<ImportDraft>;
  // Forme minimale : sans nom ni identifiant, il n'y a rien à appliquer.
  if (typeof draft.dataId !== "string" || typeof draft.name !== "string") return null;
  return {
    ...(draft as ImportDraft),
    openingHours: Array.isArray(draft.openingHours) ? draft.openingHours : [],
    photos: Array.isArray(draft.photos) ? draft.photos : [],
    reviews: Array.isArray(draft.reviews) ? draft.reviews : [],
  };
}
