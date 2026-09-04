import { describe, it, expect } from "vitest";
import { planMetrics, planConformity, constraintEcho } from "./plan-quality";
import type { Plan, PlanExercise } from "./program";

/**
 * Mesures de qualité d'un plan.
 *
 * Ces chiffres servent à décider si on peut baisser l'effort ou changer de
 * modèle sans abîmer le livrable. Une mesure qui ne bouge pas quand la qualité
 * s'effondre ne sert à rien : chaque test vérifie donc qu'elle DISTINGUE un bon
 * plan d'un mauvais, pas seulement qu'elle calcule quelque chose.
 */

const ex = (name: string, sets: number, reps: string, rest = 90): PlanExercise => ({
  name,
  sets,
  reps,
  load: "",
  note: "",
  rest,
  cardio: false,
  duration: "",
  zone: "",
});

const seance = (titre: string, exos: PlanExercise[], echauffement = true) => ({
  cycleLabel: "Cycle 1",
  title: titre,
  meta: "",
  restSec: 90,
  warmup: echauffement ? [{ name: "Rameur", detail: "5 min" }] : [],
  exercises: exos,
});

const plan = (cycles: { sessions: ReturnType<typeof seance>[] }[], nutrition?: Record<string, string>) =>
  ({
    summary: "",
    cycles: cycles.map((c, i) => ({
      label: `Cycle ${i + 1}`,
      name: "Bloc",
      weeks: "",
      body: "",
      sessions: c.sessions,
    })),
    weekPlan: [],
    nutrition: { kcal: "2000", protein: "150", carbs: "200", fat: "56", tags: [], meals: [], ...nutrition },
    warning: "",
  }) as unknown as Plan;

const HAUT = [ex("Développé couché", 4, "10"), ex("Rowing haltère", 4, "10"), ex("Élévations latérales", 3, "12")];
const BAS = [ex("Squat", 4, "10"), ex("Soulevé de terre roumain", 4, "10"), ex("Fentes", 3, "12")];

describe("variété des jours", () => {
  it("donne 1 quand chaque jour est un vrai jour différent", () => {
    const p = plan([{ sessions: [seance("Haut", HAUT), seance("Bas", BAS)] }]);
    expect(planMetrics(p).dayVariety).toBe(1);
  });

  it("s'effondre quand le modèle recopie la même séance", () => {
    // Le défaut classique d'un modèle qui bâcle : quatre jours au menu, une
    // seule vraie séance. Sans cette mesure, le plan passe pour conforme.
    const p = plan([{ sessions: [seance("Jour A", HAUT), seance("Jour B", HAUT)] }]);
    expect(planMetrics(p).dayVariety).toBe(0);
  });

  it("compte comme identique un jour recopié sous un autre titre", () => {
    // Le vrai défaut à attraper : la même séance servie deux fois avec un
    // titre différent, plus un exercice pour donner le change.
    const maquille = [...HAUT, ex("Oiseau", 3, "15")];
    const p = plan([{ sessions: [seance("Haut A", HAUT), seance("Haut B", maquille)] }]);
    expect(planMetrics(p).dayVariety).toBe(0);
  });

  it("laisse passer deux jours qui partagent quelques exercices", () => {
    // « Haut poussée » et « haut tirage » ont légitimement des exercices en
    // commun. Les compter comme un doublon donnerait une fausse alerte sur des
    // plans corrects, et la mesure ne servirait plus à décider.
    const pousseeA = [ex("Développé couché", 4, "10"), ex("Développé militaire", 4, "10"), ex("Dips", 3, "12"), ex("Élévations latérales", 3, "15"), ex("Extensions triceps", 3, "12")];
    const pousseeB = [ex("Développé couché", 4, "8"), ex("Développé incliné", 4, "10"), ex("Pompes lestées", 3, "12"), ex("Oiseau", 3, "15"), ex("Barre au front", 3, "12")];
    const p = plan([{ sessions: [seance("Poussée A", pousseeA), seance("Poussée B", pousseeB)] }]);
    expect(planMetrics(p).dayVariety).toBe(1);
  });
});

describe("progression entre cycles", () => {
  it("vaut 1 quand tout le volume bouge d'un cycle au suivant", () => {
    const c1 = { sessions: [seance("Haut", HAUT)] };
    const c2 = { sessions: [seance("Haut", HAUT.map((e) => ({ ...e, sets: 5, reps: "6" })))] };
    expect(planMetrics(plan([c1, c2])).progression).toBe(1);
  });

  it("tombe à 0 quand les cycles sont recopiés", () => {
    // C'est exactement ce que le produit promet de ne pas faire : trois cycles
    // qui évoluent. Un plan recopié se voit ici et nulle part ailleurs.
    const c = { sessions: [seance("Haut", HAUT)] };
    expect(planMetrics(plan([c, c, c])).progression).toBe(0);
  });

  it("voit un changement de repos seul", () => {
    const c1 = { sessions: [seance("Haut", HAUT)] };
    const c2 = { sessions: [seance("Haut", HAUT.map((e) => ({ ...e, rest: 150 })))] };
    expect(planMetrics(plan([c1, c2])).progression).toBe(1);
  });

  it("ne se prononce pas quand aucun exercice n'est repris", () => {
    // Deux cycles sans exercice commun : la progression n'est pas mesurable,
    // et prétendre le contraire donnerait un 0 trompeur.
    const p = plan([{ sessions: [seance("Haut", HAUT)] }, { sessions: [seance("Bas", BAS)] }]);
    expect(planMetrics(p).progression).toBe(0);
  });
});

describe("cohérence nutritionnelle", () => {
  it("ne signale rien quand les macros donnent les calories annoncées", () => {
    // 150 g × 4 + 200 g × 4 + 56 g × 9 = 1904, pour 2000 annoncées : 5 %.
    const d = planMetrics(plan([{ sessions: [seance("Haut", HAUT)] }])).macroDrift;
    expect(d).not.toBeNull();
    expect(d!).toBeLessThan(0.06);
  });

  it("repère des macros sans rapport avec les calories", () => {
    // Le genre d'incohérence qu'un modèle moins soigneux laisse passer, et que
    // le client suit à la lettre.
    const p = plan([{ sessions: [seance("Haut", HAUT)] }], { kcal: "2000", protein: "300", carbs: "400", fat: "120" });
    expect(planMetrics(p).macroDrift!).toBeGreaterThan(0.5);
  });

  it("rend null plutôt qu'un zéro trompeur sans nutrition", () => {
    const p = plan([{ sessions: [seance("Haut", HAUT)] }], { kcal: "", protein: "", carbs: "", fat: "" });
    expect(planMetrics(p).macroDrift).toBeNull();
  });
});

describe("densité", () => {
  it("compte échauffements et consignes", () => {
    const avecNote = HAUT.map((e) => ({ ...e, note: "Dos neutre" }));
    const p = plan([{ sessions: [seance("Haut", avecNote), seance("Bas", BAS, false)] }]);
    const m = planMetrics(p);
    expect(m.warmupRate).toBe(0.5);
    expect(m.noteRate).toBeCloseTo(0.5, 5);
    expect(m.avgExercises).toBe(3);
  });
});

describe("conformité au brief", () => {
  it("refuse un plan à qui il manque un cycle", () => {
    const p = plan([{ sessions: [seance("Haut", HAUT), seance("Bas", BAS)] }]);
    expect(planConformity(p, 3, 2).cyclesOk).toBe(false);
  });

  it("refuse un cycle à qui il manque une séance", () => {
    // Un seul cycle incomplet suffit : le client tomberait sur une semaine
    // vide au milieu de son programme.
    const complet = { sessions: [seance("Haut", HAUT), seance("Bas", BAS)] };
    const creux = { sessions: [seance("Haut", HAUT)] };
    expect(planConformity(plan([complet, creux]), 2, 2).sessionsOk).toBe(false);
  });

  it("accepte un plan complet", () => {
    const c = { sessions: [seance("Haut", HAUT), seance("Bas", BAS)] };
    const r = planConformity(plan([c, c, c]), 3, 2);
    expect(r.cyclesOk && r.sessionsOk).toBe(true);
  });
});

describe("trace d'une contrainte déclarée", () => {
  const avec = (warning: string, note: string) =>
    ({
      ...plan([{ sessions: [seance("Haut", HAUT.map((e) => ({ ...e, note })))] }]),
      warning,
    }) as Plan;

  it("voit la contrainte nommée dans l'avertissement et dans une consigne", () => {
    const e = constraintEcho(
      avec("Programme adapté à ton épaule sensible.", "Amplitude réduite, épaule ménagée."),
      ["épaule"],
    );
    expect(e.inWarning).toBe(true);
    expect(e.inNotes).toBe(true);
    expect(e.denies).toBe(false);
  });

  it("ignore les accents, qui varient d'une génération à l'autre", () => {
    const e = constraintEcho(avec("Adapté a ton epaule.", ""), ["épaule"]);
    expect(e.inWarning).toBe(true);
  });

  it("repère un avertissement qui NIE une contrainte pourtant déclarée", () => {
    // Le défaut observé en production : le client a coché une épaule, le plan
    // lui écrit qu'il n'a rien signalé. Rien d'autre ne l'attrape.
    const e = constraintEcho(
      avec("Aucune contrainte de santé ni allergie n'a été déclarée, mais la reprise impose de la prudence.", ""),
      ["épaule"],
    );
    expect(e.denies).toBe(true);
    expect(e.inWarning).toBe(false);
  });

  it("ne crie pas au loup sur un avertissement normal", () => {
    const e = constraintEcho(avec("Programme de reprise après 6 mois d'arrêt, charges prudentes.", ""), ["épaule"]);
    expect(e.denies).toBe(false);
  });

  it("ne compte pas une consigne vide", () => {
    const e = constraintEcho(avec("Épaule ménagée.", ""), ["épaule"]);
    expect(e.inNotes).toBe(false);
  });
});
