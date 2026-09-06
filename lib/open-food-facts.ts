import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { barcodeCandidates, parseOffProduct, type FoodProduct } from "@/lib/food-log";

// ------------------------------------------------------------------ *
// Open Food Facts, côté serveur : lecture d'une fiche par code-barres et
// recherche par nom, avec cache en base.
//
// POURQUOI UN CACHE. Open Food Facts est gratuit et demande en retour de ne
// pas le marteler (une centaine de lectures par minute, une dizaine de
// recherches). Tous nos clients sortent par les mêmes adresses Vercel, donc
// ces plafonds sont partagés. Une fiche lue une fois est gardée quatre-vingt-
// dix jours ; une recherche sept jours. Le pain de mie que trente clients
// scannent ne coûte qu'un appel.
//
// CE QUI PART. Le code-barres ou les mots tapés, et un User-Agent qui nomme
// l'application, comme le demande la base. Jamais l'identité du client.
//
// PANNE. Une base lente ou muette ne doit pas bloquer l'écran : délai court,
// et à défaut on répond « inconnu », le client saisit à la main.
// ------------------------------------------------------------------ */

const UA = "MyFitnessApp/1.0 (https://myfitnessapp.fit)";
const TIMEOUT_MS = 6000;
const PRODUCT_TTL_MS = 90 * 86400000;
const SEARCH_TTL_MS = 7 * 86400000;
const FIELDS =
  "code,product_name,product_name_fr,product_name_en,generic_name,generic_name_fr,generic_name_en,brands,nutriments,serving_quantity,serving_quantity_unit,image_front_small_url,image_small_url,image_front_url,nutriscore_grade";

async function getJson(url: string): Promise<unknown | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctl.signal, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const fresh = (fetchedAt: string | null | undefined, ttl: number) => !!fetchedAt && Date.now() - new Date(fetchedAt).getTime() < ttl;

/**
 * La fiche d'un code-barres : cache d'abord, puis Open Food Facts en essayant
 * les formes EAN-13 / UPC-A du code. Null si la base ne le connaît pas.
 */
export async function lookupBarcode(code: string, locale: "fr" | "en"): Promise<FoodProduct | null> {
  const candidates = barcodeCandidates(code);
  if (!candidates.length) return null;
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from("food_products")
    .select("barcode, product, fetched_at")
    .in("barcode", candidates)
    .limit(1)
    .maybeSingle<{ barcode: string; product: unknown; fetched_at: string }>();
  if (cached && fresh(cached.fetched_at, PRODUCT_TTL_MS)) {
    // Le cache garde la fiche brute : la langue se choisit à la lecture.
    return parseOffProduct(cached.product, locale);
  }

  for (const c of candidates) {
    const json = (await getJson(`https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=${FIELDS}`)) as
      | { status?: number; product?: unknown }
      | null;
    if (json?.status === 1 && json.product) {
      const parsed = parseOffProduct(json.product, locale);
      if (!parsed) continue;
      await admin.from("food_products").upsert({ barcode: c, product: json.product, fetched_at: new Date().toISOString() }, { onConflict: "barcode" });
      return parsed;
    }
  }
  // Rien de frais en ligne : une fiche périmée vaut mieux qu'un blanc.
  return cached ? parseOffProduct(cached.product, locale) : null;
}

/**
 * Recherche par nom, dix résultats au plus. Passe par le service de recherche
 * d'Open Food Facts, puis par l'ancien point d'entrée si le premier ne répond
 * pas : les deux renvoient des fiches au même format.
 */
export async function searchProducts(query: string, locale: "fr" | "en"): Promise<FoodProduct[]> {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  if (q.length < 2) return [];
  const admin = createAdminClient();
  const key = `${locale}:${q}`;

  const { data: cached } = await admin
    .from("food_searches")
    .select("results, fetched_at")
    .eq("key", key)
    .maybeSingle<{ results: unknown[]; fetched_at: string }>();
  if (cached && fresh(cached.fetched_at, SEARCH_TTL_MS)) {
    return cached.results.map((r) => parseOffProduct(r, locale)).filter((p): p is FoodProduct => !!p);
  }

  const enc = encodeURIComponent(q);
  let hits: unknown[] = [];
  const modern = (await getJson(`https://search.openfoodfacts.org/search?q=${enc}&langs=${locale},en&page_size=10&fields=${FIELDS}`)) as
    | { hits?: unknown[] }
    | null;
  if (Array.isArray(modern?.hits)) hits = modern.hits;
  if (!hits.length) {
    const legacy = (await getJson(
      `https://${locale === "en" ? "world" : locale}.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=10&fields=${FIELDS}`,
    )) as { products?: unknown[] } | null;
    if (Array.isArray(legacy?.products)) hits = legacy.products;
  }

  const products = hits.map((r) => parseOffProduct(r, locale)).filter((p): p is FoodProduct => !!p).slice(0, 10);
  if (products.length) {
    await admin.from("food_searches").upsert({ key, results: hits.slice(0, 10), fetched_at: new Date().toISOString() }, { onConflict: "key" });
  } else if (cached) {
    return cached.results.map((r) => parseOffProduct(r, locale)).filter((p): p is FoodProduct => !!p);
  }
  return products;
}
