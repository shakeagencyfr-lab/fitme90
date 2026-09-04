import "server-only";
import { readBoundedText } from "@/lib/bounded-body";
import {
  buildDraft,
  readCandidates,
  type ImportDraft,
  type PlaceCandidate,
  type RawPlace,
} from "@/lib/google-import";

/**
 * Accès à SerpApi : la seule partie de l'import Google qui touche au réseau.
 *
 * Elle est mince à dessein. Tout ce qui interprète la réponse vit dans
 * `lib/google-import.ts`, qui est pur et testé de près ; ici on ne fait que
 * construire une adresse, appeler, et passer le résultat au normalisateur.
 *
 * Trois précautions, parce qu'on appelle un service qu'on ne maîtrise pas :
 *
 * La clé ne sort jamais. Elle est en clair dans l'URL, c'est ce que SerpApi
 * impose, donc aucune adresse et aucun corps de réponse ne remonte dans un
 * message d'erreur. Ce serait le moyen le plus bête de la publier.
 *
 * Un appel ne peut pas durer. Sans délai maximum, une requête qui reste
 * ouverte bloque la fonction serverless jusqu'à sa limite, et le coach n'a
 * qu'un écran figé.
 *
 * La réponse est bornée, et bornée à la lecture : un corps énorme, accidentel
 * ou non, remplirait la mémoire du processus avant même qu'on l'analyse.
 */

const BASE = "https://serpapi.com/search.json";
const TIMEOUT_MS = 12_000;
/** 4 Mo : une réponse de fiche fait quelques dizaines de Ko. */
const MAX_BYTES = 4 * 1024 * 1024;

export type SerpResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Vrai quand une clé utilisable est configurée.
 *
 * Un « placeholder » laissé dans un fichier d'exemple compte comme absent :
 * mieux vaut masquer la fonctionnalité que promettre un bouton qui rendra une
 * erreur d'authentification.
 */
export function serpApiEnabled(): boolean {
  const k = process.env.SERPAPI_KEY?.trim();
  return !!k && k.length >= 20 && !/^placeholder/i.test(k);
}

/** `fetch` remplaçable, pour tester sans réseau. */
export type Fetcher = typeof fetch;

/**
 * Trace serveur d'un appel raté : les paramètres MÉTIER, le statut, et ce que
 * SerpApi dit lui-même. Jamais l'adresse appelée, qui porte la clé en clair.
 *
 * `api_key` est retiré explicitement plutôt que par confiance dans l'appelant :
 * c'est le genre d'oubli qui publie une clé dans les logs d'un hébergeur.
 */
function journal(params: Record<string, string>, status: number, detail: string): void {
  const sansCle = { ...params };
  delete sansCle.api_key;
  console.error("[serpapi]", { params: sansCle, status, detail });
}

/**
 * Le message d'erreur que SerpApi renvoie dans son corps, borné et sans rien
 * d'autre. C'est presque toujours lui qui explique un 4xx (« Invalid data_id »,
 * « missing parameter »), et sans lui on en est réduit aux suppositions.
 */
async function messageErreur(res: Response): Promise<string> {
  try {
    const brut = await readBoundedText(res, 8 * 1024);
    if (!brut) return "corps illisible";
    const o = JSON.parse(brut) as { error?: unknown };
    return typeof o?.error === "string" ? o.error.slice(0, 300) : brut.slice(0, 200);
  } catch {
    return "corps illisible";
  }
}

async function call(
  params: Record<string, string>,
  fetcher: Fetcher,
): Promise<SerpResult<Record<string, unknown>>> {
  const key = process.env.SERPAPI_KEY?.trim();
  if (!key) return { ok: false, error: "Import Google indisponible." };

  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", key);

  const ctrl = new AbortController();
  const minuterie = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetcher(url.toString(), { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) {
      // Le message rendu au coach reste générique, mais le SERVEUR doit savoir
      // ce qui s'est passé. Ne rien tracer rendait l'import indébogable : en
      // production, tout ce qu'on voyait était « Google n'a pas répondu », pour
      // une clé refusée comme pour un paramètre invalide.
      journal(params, res.status, await messageErreur(res));
      if (res.status === 401 || res.status === 403) return { ok: false, error: "Clé Google refusée." };
      if (res.status === 429) return { ok: false, error: "Trop de recherches d'un coup. Réessaie dans une minute." };
      // Un 4xx n'est pas un incident réseau : réessayer ne changera rien, et le
      // dire ferait tourner le coach en rond.
      if (res.status >= 400 && res.status < 500) {
        return { ok: false, error: "Google n'a pas accepté cette demande. Choisis une autre fiche ou relance la recherche." };
      }
      return { ok: false, error: "Google n'a pas répondu. Réessaie dans un instant." };
    }
    // Lecture bornée pour de vrai : `res.text()` aurait déjà tout chargé avant
    // qu'on puisse refuser.
    const brut = await readBoundedText(res, MAX_BYTES);
    if (brut === null) return { ok: false, error: "Réponse Google inexploitable." };
    const json = JSON.parse(brut) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      return { ok: false, error: "Réponse Google inexploitable." };
    }
    const obj = json as Record<string, unknown>;
    // SerpApi rend un 200 avec un champ d'erreur quand la recherche échoue.
    if (typeof obj.error === "string" && obj.error) {
      return { ok: false, error: "Aucun résultat pour cette recherche." };
    }
    return { ok: true, data: obj };
  } catch (e) {
    // Coupure, délai dépassé, JSON illisible : la cause exacte n'aide pas le
    // coach, mais elle est indispensable côté serveur.
    journal(params, 0, e instanceof Error ? e.name : "erreur inconnue");
    return { ok: false, error: "Google n'a pas répondu. Réessaie dans un instant." };
  } finally {
    clearTimeout(minuterie);
  }
}

/** Cherche un établissement par nom, éventuellement avec sa ville. */
export async function searchPlaces(
  query: string,
  opts: { locale?: string; fetcher?: Fetcher } = {},
): Promise<SerpResult<PlaceCandidate[]>> {
  const q = query.trim().slice(0, 120);
  if (q.length < 3) return { ok: false, error: "Écris au moins trois caractères." };

  const hl = opts.locale === "en" ? "en" : "fr";
  const res = await call(
    { engine: "google_maps", type: "search", q, hl, gl: hl },
    opts.fetcher ?? fetch,
  );
  if (!res.ok) return res;

  const candidats = readCandidates(res.data.local_results ?? res.data.place_results);
  if (candidats.length === 0) return { ok: false, error: "Aucun établissement trouvé sous ce nom." };
  return { ok: true, data: candidats };
}

/**
 * Détail d'une fiche : informations, avis, photos.
 *
 * Trois appels, parce que SerpApi les sépare. Les avis et les photos ne sont
 * pas indispensables : si l'un des deux échoue, on rend quand même le
 * brouillon avec ce qu'on a. Perdre la fiche entière parce qu'une photo
 * manque serait disproportionné.
 */
export async function fetchPlaceDraft(
  dataId: string,
  opts: { locale?: string; fetcher?: Fetcher } = {},
): Promise<SerpResult<ImportDraft>> {
  const id = dataId.trim().slice(0, 120);
  if (!id) return { ok: false, error: "Fiche inconnue." };

  const hl = opts.locale === "en" ? "en" : "fr";
  const f = opts.fetcher ?? fetch;

  const fiche = await call({ engine: "google_maps", type: "place", data_id: id, hl }, f);
  if (!fiche.ok) return fiche;

  const [avis, photos] = await Promise.all([
    call({ engine: "google_maps_reviews", data_id: id, hl }, f),
    call({ engine: "google_maps_photos", data_id: id, hl }, f),
  ]);

  const place = (fiche.data.place_results ?? {}) as RawPlace;
  const draft = buildDraft(place, {
    dataId: id,
    reviews: avis.ok ? avis.data.reviews : undefined,
    photos: photos.ok ? photos.data.photos : undefined,
  });
  if (!draft) return { ok: false, error: "Cette fiche ne contient rien d'exploitable." };
  return { ok: true, data: draft };
}
