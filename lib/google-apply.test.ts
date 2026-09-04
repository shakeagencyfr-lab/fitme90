import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeAdmin, mockAdminModule, eqValue, type FakeAdmin } from "@/test/fake-supabase";
import type { ImportDraft } from "./google-import";

/**
 * Écriture d'un import Google dans le compte du coach.
 *
 * Le risque n'est pas qu'un import échoue, c'est qu'il réussisse trop : qu'il
 * remplace un téléphone saisi à la main par le vide de la fiche, qu'il écrase
 * une accroche rédigée, ou qu'il empile les mêmes avis à chaque passage. Les
 * tests portent donc surtout sur ce qui NE doit PAS être écrit.
 */

const DRAFT: ImportDraft = {
  dataId: "0x47e66e:0x40b8",
  name: "Studio Fitme",
  address: "12 rue des Lilas, 75011 Paris, France",
  phone: "+33123456789",
  website: "https://studio-fitme.fr",
  category: "Salle de sport",
  description: "Salle familiale ouverte depuis 2011.",
  rating: 4.8,
  reviewsCount: 214,
  openingHours: [{ day: "lundi", hours: "09:00-20:00" }],
  photos: ["https://lh3.googleusercontent.com/p/abc"],
  reviews: [
    { author: "Léa", rating: 5, body: "Super salle.", publishedLabel: "il y a 2 mois" },
    { author: "Marc", rating: 4, body: "Bon matériel.", publishedLabel: "il y a 1 an" },
  ],
};

/** Brouillon amputé de tout ce que Google peut ignorer. */
const MAIGRE: ImportDraft = {
  ...DRAFT,
  address: null,
  phone: null,
  website: null,
  description: null,
  rating: null,
  reviewsCount: null,
  openingHours: [],
};

let fake: FakeAdmin;
async function lib() {
  vi.resetModules();
  fake = fakeAdmin();
  mockAdminModule(fake);
  return import("./google-apply");
}

/** `fetch` qui rend une image, ou ce qu'on lui demande de rendre. */
function image(type = "image/jpeg", octets = 2048, status = 200) {
  return (async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (h: string) => (h === "content-type" ? type : null) },
      arrayBuffer: async () => new ArrayBuffer(octets),
    })) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.resetModules();
});

describe("coordonnées", () => {
  it("reprend ce que la fiche sait", async () => {
    const { infoPatch } = await lib();
    const p = infoPatch(DRAFT);
    expect(p.address).toBe(DRAFT.address);
    expect(p.phone).toBe("+33123456789");
    expect(p.google_rating).toBe(4.8);
    expect(p.opening_hours).toHaveLength(1);
  });

  it("n'écrase pas un champ avec le vide de Google", async () => {
    // Une fiche sans téléphone veut dire « Google ne sait pas », pas « ce
    // coach n'a pas de téléphone ». Effacer le sien serait une régression
    // qu'il ne remarquerait qu'en perdant des appels.
    const { infoPatch } = await lib();
    const p = infoPatch(MAIGRE);
    expect(p).not.toHaveProperty("phone");
    expect(p).not.toHaveProperty("address");
    expect(p).not.toHaveProperty("website_url");
    expect(p).not.toHaveProperty("opening_hours");
    expect(p.google_place_id).toBe(DRAFT.dataId);
  });

  it("ne fabrique un lien Maps que depuis un identifiant de la bonne forme", async () => {
    const { mapsUrlFor } = await lib();
    expect(mapsUrlFor(DRAFT)).toContain("query_place_id=");
    expect(mapsUrlFor({ ...DRAFT, dataId: "bidon" })).toBeNull();
  });
});

describe("textes proposés", () => {
  it("remplit une page vierge", async () => {
    const { copyPatch } = await lib();
    const p = copyPatch(DRAFT, { headline: null, tagline: null, aboutText: null });
    expect(p.headline).toBe("Studio Fitme");
    expect(p.tagline).toBe("Salle de sport à Paris");
    expect(p.about_text).toBe(DRAFT.description);
    expect(p.about_enabled).toBe(true);
  });

  it("laisse intact ce que le coach a déjà écrit", async () => {
    // C'est la règle qui décide si un coach ose cliquer sur le bouton.
    const { copyPatch } = await lib();
    const p = copyPatch(DRAFT, {
      headline: "Reprends ta forme en 12 semaines",
      tagline: "Coaching sur mesure",
      aboutText: "Je suis coach depuis 2011.",
    });
    expect(p).toEqual({});
  });

  it("traite une valeur d'espaces comme vide", async () => {
    const { copyPatch } = await lib();
    const p = copyPatch(DRAFT, { headline: "   ", tagline: null, aboutText: null });
    expect(p.headline).toBe("Studio Fitme");
  });

  it("ne propose rien qu'il ne sache", async () => {
    const { copyPatch } = await lib();
    const p = copyPatch(MAIGRE, { headline: null, tagline: null, aboutText: null });
    expect(p.headline).toBe("Studio Fitme");
    expect(p).not.toHaveProperty("about_text");
  });
});

describe("recopie d'une photo", () => {
  it("dépose l'image chez nous et rend notre adresse", async () => {
    // On ne pointe pas vers Google : l'adresse expire, et chaque visiteur du
    // coach signalerait sa visite à un tiers.
    const { copyPlacePhoto } = await lib();
    const url = await copyPlacePhoto("t1", DRAFT.photos[0], image());
    expect(url).toContain("stockage.test/tenant-assets/t1/google-");
    expect(fake.uploads[0].contentType).toBe("image/jpeg");
  });

  it("refuse une adresse hors des domaines d'images Google", async () => {
    // Le brouillon a été validé, mais il est repassé par le navigateur du
    // coach : ce qui revient d'un formulaire n'est plus ce qu'on y avait mis.
    // Sans ce contrôle, notre serveur irait chercher n'importe quelle machine.
    const { copyPlacePhoto } = await lib();
    expect(await copyPlacePhoto("t1", "http://127.0.0.1:8080/interne", image())).toBeNull();
    expect(await copyPlacePhoto("t1", "https://ailleurs.example/p.jpg", image())).toBeNull();
    expect(fake.uploads).toHaveLength(0);
  });

  it("refuse ce qui n'est pas une image, quoi qu'en dise l'adresse", async () => {
    const { copyPlacePhoto } = await lib();
    expect(await copyPlacePhoto("t1", DRAFT.photos[0], image("text/html"))).toBeNull();
    expect(fake.uploads).toHaveLength(0);
  });

  it("refuse une image trop lourde", async () => {
    const { copyPlacePhoto } = await lib();
    expect(await copyPlacePhoto("t1", DRAFT.photos[0], image("image/png", 5 * 1024 * 1024))).toBeNull();
  });

  it("rend null plutôt que de lever quand la requête échoue", async () => {
    const { copyPlacePhoto } = await lib();
    const casse = (async () => {
      throw new Error("ETIMEDOUT");
    }) as unknown as typeof fetch;
    expect(await copyPlacePhoto("t1", DRAFT.photos[0], casse)).toBeNull();
    expect(await copyPlacePhoto("t1", DRAFT.photos[0], image("image/png", 10, 404))).toBeNull();
  });
});

describe("application complète", () => {
  it("écrit les coordonnées et les avis retenus", async () => {
    const { applyGoogleImport } = await lib();
    const r = await applyGoogleImport("t1", DRAFT, { infos: true, textes: false, photoUrl: null, avis: [0] }, image());
    expect(r.ok).toBe(true);
    expect(r.applied.infos).toBe(true);
    expect(r.applied.avis).toBe(1);

    const maj = fake.on("tenants").find((q) => q.filters.some((f) => f.op === "update"));
    expect(eqValue(maj!, "id")).toBe("t1");

    const insert = fake.on("testimonials").find((q) => q.filters.some((f) => f.op === "insert"));
    const lignes = insert!.filters.find((f) => f.op === "insert")!.value as Record<string, unknown>[];
    expect(lignes).toHaveLength(1);
    expect(lignes[0].author).toBe("Léa");
    expect(lignes[0].tenant_id).toBe("t1");
  });

  it("remplace les avis Google au lieu de les empiler", async () => {
    // Réimporter deux fois ne doit pas doubler la section de la page.
    const { applyGoogleImport } = await lib();
    await applyGoogleImport("t1", DRAFT, { infos: false, textes: false, photoUrl: null, avis: [0, 1] }, image());
    const suppr = fake.on("testimonials").find((q) => q.filters.some((f) => f.op === "delete"));
    expect(suppr).toBeDefined();
    // Et seulement ceux venus de Google : les témoignages saisis à la main
    // n'ont pas à disparaître parce qu'on rafraîchit une fiche.
    expect(eqValue(suppr!, "source")).toBe("google");
    expect(eqValue(suppr!, "tenant_id")).toBe("t1");
  });

  it("ignore un indice d'avis qui ne correspond à rien", async () => {
    const { applyGoogleImport } = await lib();
    const r = await applyGoogleImport("t1", DRAFT, { infos: false, textes: false, photoUrl: null, avis: [9] }, image());
    expect(r.applied.avis).toBe(0);
    expect(fake.on("testimonials").some((q) => q.filters.some((f) => f.op === "insert"))).toBe(false);
  });

  it("n'échoue pas parce qu'une photo n'a pas pu être recopiée", async () => {
    // Le coach voulait surtout son adresse et ses avis.
    const { applyGoogleImport } = await lib();
    const r = await applyGoogleImport(
      "t1",
      DRAFT,
      { infos: true, textes: false, photoUrl: "https://ailleurs.example/p.jpg", avis: [] },
      image(),
    );
    expect(r.ok).toBe(true);
    expect(r.applied.photo).toBe(false);
    expect(r.applied.infos).toBe(true);
  });

  it("marque le brouillon comme appliqué", async () => {
    const { applyGoogleImport } = await lib();
    await applyGoogleImport("t1", DRAFT, { infos: true, textes: false, photoUrl: null, avis: [] }, image(), "imp1");
    const maj = fake.on("google_imports").find((q) => q.filters.some((f) => f.op === "update"));
    expect(eqValue(maj!, "id")).toBe("imp1");
    expect(eqValue(maj!, "tenant_id")).toBe("t1");
  });
});

describe("brouillon mis de côté", () => {
  it("enregistre la fiche cherchée", async () => {
    const { saveImportDraft } = await lib();
    await saveImportDraft("t1", DRAFT);
    const ligne = fake.on("google_imports")[0].filters.find((f) => f.op === "insert")!.value as Record<string, unknown>;
    expect(ligne.tenant_id).toBe("t1");
    expect(ligne.data_id).toBe(DRAFT.dataId);
    expect(ligne.status).toBe("preview");
  });

  it("ne relit un brouillon que dans son propre compte", async () => {
    // L'identifiant vient du navigateur : sans ce filtre, il suffirait d'en
    // essayer un autre pour lire la fiche importée par un confrère.
    vi.resetModules();
    fake = fakeAdmin({ google_imports: [{ payload: DRAFT }] });
    mockAdminModule(fake);
    const { readImportDraft } = await import("./google-apply");
    await readImportDraft("t1", "imp1");
    const q = fake.on("google_imports")[0];
    expect(eqValue(q, "id")).toBe("imp1");
    expect(eqValue(q, "tenant_id")).toBe("t1");
  });

  it("refuse un brouillon informe plutôt que d'appliquer n'importe quoi", async () => {
    vi.resetModules();
    fake = fakeAdmin({ google_imports: [{ payload: { name: "Sans identifiant" } }] });
    mockAdminModule(fake);
    const { readImportDraft } = await import("./google-apply");
    expect(await readImportDraft("t1", "imp1")).toBeNull();
  });

  it("comble les listes manquantes au lieu de laisser lever plus loin", async () => {
    vi.resetModules();
    fake = fakeAdmin({ google_imports: [{ payload: { dataId: "0x1:0x2", name: "Studio" } }] });
    mockAdminModule(fake);
    const { readImportDraft } = await import("./google-apply");
    const d = await readImportDraft("t1", "imp1");
    expect(d?.reviews).toEqual([]);
    expect(d?.photos).toEqual([]);
    expect(d?.openingHours).toEqual([]);
  });
});
