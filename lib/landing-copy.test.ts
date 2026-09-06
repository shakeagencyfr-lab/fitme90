import { describe, it, expect } from "vitest";
import { landingCopy, offerCardCopy, type Audience } from "@/components/landing-templates/coach-copy";
import { makeT } from "@/lib/i18n";
import type { Offer } from "@/lib/offers";
import type { Locale } from "@/lib/i18n";

const CASES: { locale: Locale; audience: Audience }[] = [
  { locale: "fr", audience: "coach" },
  { locale: "fr", audience: "gym" },
  { locale: "en", audience: "coach" },
  { locale: "en", audience: "gym" },
];

describe("textes des landings", () => {
  it("les quatre combinaisons sont complètes", () => {
    for (const { locale, audience } of CASES) {
      const L = landingCopy(locale, audience);
      expect(L.features, `${locale}/${audience}`).toHaveLength(8);
      expect(L.authorPoints.length).toBeGreaterThanOrEqual(3);
      expect(L.enginePoints.length).toBeGreaterThanOrEqual(4);
      expect(L.steps).toHaveLength(3);
      expect(L.stats).toHaveLength(4);
      expect(L.forWho.length).toBeGreaterThanOrEqual(6);
      // Aucune chaîne vide : une clé oubliée dans une variante laisserait un
      // trou visible sur la page publique.
      for (const [k, v] of Object.entries(L)) {
        if (typeof v === "string") expect(v.trim(), `${locale}/${audience}.${k}`).not.toBe("");
      }
    }
  });

  it("chaque feature garde son icône après fusion de la variante", () => {
    for (const { locale, audience } of CASES) {
      for (const f of landingCopy(locale, audience).features) {
        expect(typeof f.icon, `${locale}/${audience}`).toBe("function");
      }
    }
  });

  it("le défaut reste le discours coach", () => {
    expect(landingCopy("fr")).toEqual(landingCopy("fr", "coach"));
  });
});

describe("positionnement : le pro devant, l'IA en moteur", () => {
  it("le titre de la section auteur nomme un humain, pas l'IA", () => {
    // Formulation attendue : « Ton coach écrit ton programme. Pas un robot. »
    expect(landingCopy("fr", "coach").authorTitle).toMatch(/coach/i);
    expect(landingCopy("fr", "gym").authorTitle).toMatch(/coachs/i);
    expect(landingCopy("en", "coach").authorTitle).toMatch(/coach/i);
    for (const { locale, audience } of CASES) {
      const t = landingCopy(locale, audience).authorTitle;
      expect(t, `${locale}/${audience}`).not.toMatch(/\bIA\b|\bAI\b/);
    }
  });

  it("la limite du moteur est dite, pas sous-entendue", () => {
    for (const { locale, audience } of CASES) {
      const limit = landingCopy(locale, audience).engineLimit;
      // Elle doit nommer l'avis médical : c'est la seule mention qui protège
      // vraiment, et la retirer serait une régression réglementaire.
      expect(limit, `${locale}/${audience}`).toMatch(/médical|medical/i);
      expect(limit.length).toBeGreaterThan(60);
    }
  });

  it("la signature porte le nom du professionnel", () => {
    for (const { locale, audience } of CASES) {
      expect(landingCopy(locale, audience).authorSignature("Studio Forme")).toContain("Studio Forme");
    }
  });
});

describe("la variante salle parle vraiment d'une salle", () => {
  const fr = landingCopy("fr", "gym");
  const frCoach = landingCopy("fr", "coach");

  it("elle ne se contente pas de renommer le coach", () => {
    // Au moins ces sections doivent différer du socle, sinon la variante
    // n'apporte rien et autant ne pas la proposer.
    const changed = ["defaultTagline", "heroChip", "gymTitle", "spaceTitle", "authorTitle", "stepsTitle", "forWhoTitle", "finalTitle"] as const;
    for (const k of changed) {
      expect(fr[k], k).not.toBe(frCoach[k]);
    }
  });

  it("le parc de machines devient un argument de la salle", () => {
    expect(fr.gymTitle).toMatch(/machines/i);
    expect(landingCopy("en", "gym").gymTitle).toMatch(/machines/i);
  });

  it("elle traite le décrochage entre deux venues", () => {
    expect(`${fr.spaceTitle} ${fr.spaceBody}`).toMatch(/hors de la salle|ne viens pas|abandons/i);
  });

  it("les clés non redéfinies retombent sur le socle", () => {
    expect(fr.footerLegal).toBe(frCoach.footerLegal);
    expect(fr.nutritionTitle).toBe(frCoach.nutritionTitle);
  });
});

describe("la carte de vente n'annonce que ce que le plan contient", () => {
  const offre = (over: Record<string, unknown>) =>
    ({
      id: "o1", tenant_id: "t", name: "Plan", duration_months: 3, price_cents: 19000, currency: "eur",
      position: 0, is_active: true, is_listed: true, vip_chat: false, coach_ai: true,
      coach_ai_daily_limit: null, recipe_ai_daily_limit: null, billing_type: "one_time",
      price_month_cents: null, price_year_cents: null, created_at: "",
      ...over,
    }) as unknown as Offer;

  it("en formule Max, le Coach IA figure dans les arguments", () => {
    const t = makeT("fr");
    const c = offerCardCopy(offre({ coach_ai: true }), [], t);
    expect(c.bullets.some((b) => /Coach IA/.test(b))).toBe(true);
  });

  it("en formule Mini, il n'y figure pas : le client ne l'aura pas", () => {
    const t = makeT("fr");
    const c = offerCardCopy(offre({ coach_ai: false }), [], t);
    expect(c.bullets.some((b) => /Coach IA/.test(b))).toBe(false);
    // Le reste du produit est bien là.
    expect(c.bullets.length).toBeGreaterThanOrEqual(3);
    expect(c.bullets.some((b) => /nutrition/i.test(b))).toBe(true);
  });

  it("le chat avec le coach n'est annoncé que s'il est inclus", () => {
    const t = makeT("fr");
    expect(offerCardCopy(offre({ vip_chat: true }), [], t).bullets.some((b) => /coach réel/i.test(b))).toBe(true);
    expect(offerCardCopy(offre({ vip_chat: false }), [], t).bullets.some((b) => /coach réel/i.test(b))).toBe(false);
  });

  it("vaut aussi pour le 12 mois et en anglais", () => {
    const t = makeT("en");
    const mini = offerCardCopy(offre({ duration_months: 12, coach_ai: false }), [], t);
    expect(mini.bullets.some((b) => /AI Coach/i.test(b))).toBe(false);
    const max = offerCardCopy(offre({ duration_months: 12, coach_ai: true }), [], t);
    expect(max.bullets.some((b) => /AI Coach/i.test(b))).toBe(true);
  });
});
