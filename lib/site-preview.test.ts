import { describe, it, expect } from "vitest";
import { readSiteDraft, isSitePreviewReady, SITE_PREVIEW_TYPE, SITE_PREVIEW_READY } from "./site-preview";

// Le brouillon arrive par postMessage, donc d'une autre fenêtre, donc de
// l'extérieur : ces tests verrouillent le fait qu'on le RECONSTRUIT au lieu de
// lui faire confiance. Un champ manquant ne doit pas casser l'aperçu, et une
// adresse d'image quelconque ne doit pas s'afficher dans le tableau de bord.
const base = {
  template: "nocturne",
  intro: "Coaching à Nice",
  services: [{ title: "Séance", body: "Une heure" }],
  photos: ["https://cdn.exemple.fr/a.jpg"],
  programsTitle: "Chez toi",
  programsText: "Le suivi continue",
  address: "3 rue des Sports",
  phone: "0600000000",
  websiteUrl: "https://exemple.fr",
  openingHours: [{ day: "Lundi", hours: "9h-19h" }],
};

describe("brouillon d'aperçu du mini-site", () => {
  it("lit un message complet", () => {
    const d = readSiteDraft({ type: SITE_PREVIEW_TYPE, draft: base });
    expect(d?.template).toBe("nocturne");
    expect(d?.services).toHaveLength(1);
    expect(d?.openingHours[0]).toEqual({ day: "Lundi", hours: "9h-19h" });
  });

  it("refuse tout message qui n'est pas le nôtre", () => {
    expect(readSiteDraft({ type: "autre-chose", draft: base })).toBeNull();
    expect(readSiteDraft({ type: SITE_PREVIEW_TYPE })).toBeNull();
    expect(readSiteDraft("bonjour")).toBeNull();
    expect(readSiteDraft(null)).toBeNull();
  });

  it("survit à un brouillon incomplet plutôt que de casser l'aperçu", () => {
    const d = readSiteDraft({ type: SITE_PREVIEW_TYPE, draft: {} });
    expect(d).not.toBeNull();
    expect(d!.intro).toBe("");
    expect(d!.services).toEqual([]);
    expect(d!.photos).toEqual([]);
    // Un habillage inconnu retombe sur celui par défaut, jamais servi tel quel.
    expect(d!.template).toBe("atelier");
  });

  it("ne laisse passer que des images https", () => {
    const d = readSiteDraft({
      type: SITE_PREVIEW_TYPE,
      draft: { ...base, photos: ["javascript:alert(1)", "http://nu.fr/a.jpg", "https://ok.fr/a.jpg", 42] },
    });
    expect(d!.photos).toEqual(["https://ok.fr/a.jpg"]);
  });

  it("écarte les prestations sans titre et les jours sans créneau", () => {
    const d = readSiteDraft({
      type: SITE_PREVIEW_TYPE,
      draft: {
        ...base,
        services: [{ title: "  ", body: "orpheline" }, { title: "Bilan", body: "" }],
        openingHours: [{ day: "Lundi", hours: "" }, { day: "Mardi", hours: "9h-12h" }],
      },
    });
    expect(d!.services).toEqual([{ title: "Bilan", body: "" }]);
    expect(d!.openingHours).toEqual([{ day: "Mardi", hours: "9h-12h" }]);
  });

  it("tronque les textes trop longs au lieu de les refuser", () => {
    // Un aperçu qui refuserait une saisie trop longue laisserait le coach
    // devant une page figée sans lui dire pourquoi.
    const d = readSiteDraft({ type: SITE_PREVIEW_TYPE, draft: { ...base, intro: "x".repeat(5000) } });
    expect(d!.intro).toHaveLength(600);
  });

  it("reconnaît l'annonce « prêt » de l'aperçu, et elle seule", () => {
    expect(isSitePreviewReady({ type: SITE_PREVIEW_READY })).toBe(true);
    expect(isSitePreviewReady({ type: SITE_PREVIEW_TYPE })).toBe(false);
    expect(isSitePreviewReady(undefined)).toBe(false);
  });
});
