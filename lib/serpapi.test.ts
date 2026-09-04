import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { serpApiEnabled, searchPlaces, fetchPlaceDraft } from "./serpapi";

/**
 * Couche réseau de l'import Google.
 *
 * On ne teste pas SerpApi : on teste ce qu'on fait de ses réponses, et surtout
 * ce qu'on fait de ses mauvaises réponses. Un service tiers tombe, répond en
 * retard, change de forme, renvoie un 200 qui contient une erreur. Chacun de
 * ces cas doit donner un message utile au coach, jamais une exception, et
 * jamais la clé.
 */

const CLE = "abcdef0123456789abcdef0123456789";

/**
 * Réponse HTTP simulée. Un vrai `Response`, pas un objet qui lui ressemble :
 * la lecture du corps est bornée par flux, et un faux sans `body` ni `headers`
 * ne dirait rien de ce que le code fait vraiment.
 */
function reponse(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

/** `fetch` de test : enregistre les adresses appelées, rend des corps en file. */
function faux(...corps: Response[]) {
  const urls: string[] = [];
  let i = 0;
  const f = vi.fn(async (url: string | URL | Request) => {
    urls.push(String(url));
    return corps[Math.min(i++, corps.length - 1)];
  });
  return { f: f as unknown as typeof fetch, urls };
}

const FICHE = {
  place_results: {
    title: "Studio Fitme",
    address: "12 rue des Lilas, 75011 Paris, France",
    phone: "+33 1 23 45 67 89",
    website: "https://studio-fitme.fr",
    type: "Salle de sport",
    rating: 4.8,
    reviews: 214,
  },
};

beforeEach(() => {
  process.env.SERPAPI_KEY = CLE;
});
afterEach(() => {
  delete process.env.SERPAPI_KEY;
});

describe("disponibilité", () => {
  it("se déclare indisponible sans clé", () => {
    delete process.env.SERPAPI_KEY;
    expect(serpApiEnabled()).toBe(false);
  });

  it("traite un placeholder comme une absence de clé", () => {
    // Sinon le coach voit un bouton qui ne peut que rendre une erreur
    // d'authentification, ce qui ressemble à une panne de notre côté.
    process.env.SERPAPI_KEY = "placeholder-a-remplacer";
    expect(serpApiEnabled()).toBe(false);
  });

  it("est disponible avec une vraie clé", () => {
    expect(serpApiEnabled()).toBe(true);
  });
});

describe("recherche", () => {
  it("refuse une saisie trop courte sans appeler le service", async () => {
    // Chaque appel est facturé : deux lettres ne valent pas une requête.
    const { f, urls } = faux(reponse({}));
    const r = await searchPlaces("ab", { fetcher: f });
    expect(r.ok).toBe(false);
    expect(urls).toHaveLength(0);
  });

  it("rend les fiches trouvées", async () => {
    const { f } = faux(
      reponse({ local_results: [{ data_id: "0x1:0x2", title: "Studio Fitme", address: "Paris", rating: 4.8, reviews: 214 }] }),
    );
    const r = await searchPlaces("studio fitme paris", { fetcher: f });
    expect(r.ok && r.data[0].name).toBe("Studio Fitme");
    expect(r.ok && r.data[0].dataId).toBe("0x1:0x2");
  });

  it("dit qu'il n'a rien trouvé plutôt que de rendre une liste vide", async () => {
    const { f } = faux(reponse({ local_results: [] }));
    const r = await searchPlaces("établissement introuvable", { fetcher: f });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain("Aucun établissement");
  });

  it("comprend un 200 qui porte un champ d'erreur", async () => {
    // SerpApi ne répond pas en 4xx quand la recherche ne donne rien.
    const { f } = faux(reponse({ error: "Google Maps hasn't returned any results" }));
    const r = await searchPlaces("azerty qwerty", { fetcher: f });
    expect(r.ok).toBe(false);
  });
});

describe("erreurs du service", () => {
  it("distingue une clé refusée d'une panne", async () => {
    const { f } = faux(reponse("Unauthorized", 401));
    const r = await searchPlaces("studio fitme", { fetcher: f });
    expect(r.ok === false && r.error).toContain("refusée");
  });

  it("dit d'attendre quand le quota est atteint", async () => {
    const { f } = faux(reponse("Too many", 429));
    const r = await searchPlaces("studio fitme", { fetcher: f });
    expect(r.ok === false && r.error).toContain("Réessaie");
  });

  it("ne lève pas sur un corps illisible", async () => {
    const { f } = faux(reponse("<html>maintenance</html>"));
    const r = await searchPlaces("studio fitme", { fetcher: f });
    expect(r.ok).toBe(false);
  });

  it("ne lève pas quand le réseau coupe", async () => {
    const f = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;
    const r = await searchPlaces("studio fitme", { fetcher: f });
    expect(r.ok).toBe(false);
  });

  it("ne laisse jamais la clé filtrer dans un message", async () => {
    // La clé est en clair dans l'URL : un message qui reprendrait l'adresse
    // appelée la publierait dans l'interface, et dans les journaux.
    for (const rep of [reponse("nope", 500), reponse("<html>", 200), reponse({ error: "boom" })]) {
      const { f } = faux(rep);
      const r = await searchPlaces("studio fitme", { fetcher: f });
      expect(r.ok).toBe(false);
      expect(r.ok === false && r.error).not.toContain(CLE);
      expect(r.ok === false && r.error).not.toContain("serpapi");
    }
  });
});

describe("détail d'une fiche", () => {
  it("assemble fiche, avis et photos", async () => {
    const { f, urls } = faux(
      reponse(FICHE),
      reponse({ reviews: [{ user: { name: "Léa" }, rating: 5, snippet: "Super salle.", date: "il y a 2 mois" }] }),
      reponse({ photos: [{ image: "https://lh3.googleusercontent.com/p/abc" }] }),
    );
    const r = await fetchPlaceDraft("0x1:0x2", { fetcher: f });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.name).toBe("Studio Fitme");
    expect(r.data.reviews).toHaveLength(1);
    expect(r.data.photos).toHaveLength(1);
    expect(urls).toHaveLength(3);
  });

  it("rend quand même la fiche si les avis et les photos échouent", async () => {
    // Perdre l'établissement entier parce qu'une photo manque serait
    // disproportionné : le coach veut d'abord son nom et son adresse.
    let n = 0;
    const f = (async () => {
      n += 1;
      return n === 1 ? reponse(FICHE) : reponse("nope", 500);
    }) as unknown as typeof fetch;
    const r = await fetchPlaceDraft("0x1:0x2", { fetcher: f });
    expect(r.ok && r.data.name).toBe("Studio Fitme");
    expect(r.ok && r.data.photos).toEqual([]);
    expect(r.ok && r.data.reviews).toEqual([]);
  });

  it("abandonne quand c'est la fiche elle-même qui manque", async () => {
    const { f } = faux(reponse("nope", 500));
    const r = await fetchPlaceDraft("0x1:0x2", { fetcher: f });
    expect(r.ok).toBe(false);
  });

  it("refuse une fiche sans nom plutôt que de proposer un brouillon vide", async () => {
    const { f } = faux(reponse({ place_results: { address: "Paris" } }), reponse({}), reponse({}));
    const r = await fetchPlaceDraft("0x1:0x2", { fetcher: f });
    expect(r.ok).toBe(false);
  });

  it("demande le français par défaut, l'anglais sur demande", async () => {
    const a = faux(reponse(FICHE), reponse({}), reponse({}));
    await fetchPlaceDraft("0x1:0x2", { fetcher: a.f });
    expect(a.urls[0]).toContain("hl=fr");

    const b = faux(reponse(FICHE), reponse({}), reponse({}));
    await fetchPlaceDraft("0x1:0x2", { fetcher: b.f, locale: "en" });
    expect(b.urls[0]).toContain("hl=en");
  });
});

/**
 * Une erreur qu'on ne peut pas diagnostiquer est une erreur qu'on ne corrigera
 * pas. En production, tout ce qu'on voyait était « Google n'a pas répondu »,
 * pour une clé refusée comme pour un paramètre invalide. Ces tests verrouillent
 * les deux exigences : tracer assez pour comprendre, jamais la clé.
 */
describe("diagnostic des échecs", () => {
  it("trace le statut et le message de SerpApi, sans la clé", async () => {
    const trace = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = faux(reponse({ error: "Invalid data_id parameter" }, 400));
    await fetchPlaceDraft("0x0:0x0", { fetcher: f.f });

    expect(trace).toHaveBeenCalled();
    const journalise = JSON.stringify(trace.mock.calls);
    expect(journalise).toContain("Invalid data_id parameter");
    expect(journalise).toContain("400");
    // Le point critique : ni la clé, ni l'adresse qui la porte.
    expect(journalise).not.toContain(CLE);
    expect(journalise).not.toContain("api_key");
    expect(journalise).not.toContain("serpapi.com");
    trace.mockRestore();
  });

  it("ne propose pas de réessayer sur un 4xx, qui ne s'arrangera pas seul", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const f = faux(reponse({ error: "Invalid data_id" }, 400));
    const r = await fetchPlaceDraft("0x0:0x0", { fetcher: f.f });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).not.toMatch(/Réessaie dans un instant/);
    vi.restoreAllMocks();
  });

  it("garde « réessaie » pour une panne serveur, qui elle peut passer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const f = faux(reponse("panne", 503));
    const r = await searchPlaces("studio fitme", { fetcher: f.f });
    expect(r.ok === false && r.error).toMatch(/Réessaie dans un instant/);
    vi.restoreAllMocks();
  });

  it("distingue toujours une clé refusée du reste", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const f = faux(reponse({ error: "Invalid API key" }, 401));
    const r = await searchPlaces("studio fitme", { fetcher: f.f });
    expect(r.ok === false && r.error).toMatch(/Clé Google refusée/);
    vi.restoreAllMocks();
  });
});

