import { describe, it, expect } from "vitest";
import { readServices, readPhotos, readHours } from "./site";
import { asSiteTemplate, SITE_TEMPLATES, SITE_THEME_COLOR, MAX_SERVICES, MAX_SITE_PHOTOS } from "./site-templates";
import { RESERVED_PATH_SEGMENTS, isRewritablePathSegment } from "./config";

describe("normalisation des réglages du mini-site", () => {
  it("garde les prestations qui ont un titre, et jette les autres", () => {
    expect(
      readServices([
        { title: "Séance", body: "Une heure" },
        { title: "  ", body: "sans titre" },
        { body: "titre absent" },
        "pas un objet",
        null,
      ]),
    ).toEqual([{ title: "Séance", body: "Une heure" }]);
  });

  it("borne le nombre de prestations", () => {
    const trop = Array.from({ length: 20 }, (_, i) => ({ title: `p${i}`, body: "" }));
    expect(readServices(trop)).toHaveLength(MAX_SERVICES);
  });

  it("tolère une colonne vide ou mal formée", () => {
    expect(readServices(null)).toEqual([]);
    expect(readServices("[]")).toEqual([]);
    expect(readPhotos(undefined)).toEqual([]);
    expect(readHours(42)).toEqual([]);
  });

  it("ne sert que des photos servies en https", () => {
    // Une adresse externe expirerait, et signalerait chaque visite à un tiers.
    expect(
      readPhotos(["https://x.supabase.co/a.jpg", "http://x/b.jpg", "javascript:alert(1)", 12]),
    ).toEqual(["https://x.supabase.co/a.jpg"]);
  });

  it("borne le nombre de photos", () => {
    const trop = Array.from({ length: 40 }, (_, i) => `https://x/${i}.jpg`);
    expect(readPhotos(trop)).toHaveLength(MAX_SITE_PHOTOS);
  });

  it("exige un jour ET un créneau pour afficher une ligne d'horaires", () => {
    expect(
      readHours([
        { day: "Lundi", hours: "9h-19h" },
        { day: "Mardi", hours: "" },
        { day: "", hours: "9h-19h" },
      ]),
    ).toEqual([{ day: "Lundi", hours: "9h-19h" }]);
  });

  it("ne dépasse jamais sept jours", () => {
    const trop = Array.from({ length: 12 }, (_, i) => ({ day: `J${i}`, hours: "9h-19h" }));
    expect(readHours(trop)).toHaveLength(7);
  });
});

describe("habillages", () => {
  it("retombe sur atelier devant une valeur inconnue", () => {
    expect(asSiteTemplate(null)).toBe("atelier");
    expect(asSiteTemplate("onyx")).toBe("atelier");
    expect(asSiteTemplate("nocturne")).toBe("nocturne");
  });

  it("donne une couleur de barre à chaque habillage", () => {
    for (const t of SITE_TEMPLATES) expect(SITE_THEME_COLOR[t], t).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("réservation de l'adresse /web", () => {
  it("empêche un coach de s'appeler « web »", () => {
    // Sans cette réservation, le proxy réécrirait /web vers la landing d'un
    // coach nommé « web », et le mini-site deviendrait injoignable.
    expect(RESERVED_PATH_SEGMENTS.has("web")).toBe(true);
    expect(isRewritablePathSegment("web")).toBe(false);
  });
});
