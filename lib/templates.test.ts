import { describe, it, expect } from "vitest";
import {
  SPLITS,
  YEAR_BLOCKS,
  blockDef,
  blockLabel,
  cycleWeeksLabel,
  templatePrompt,
  blocksForMonths,
} from "./templates";
import { SESSIONS_PER_WEEK, clampSessionsPerWeek, PRODUCTS } from "./config";

// Deux produits × quatre fréquences = huit squelettes. La structure est figée
// ici ; ces tests garantissent qu'aucun squelette n'est bancal et que le prompt
// dit bien au modèle ce qu'on attend de lui, cycle par cycle.

describe("répartitions hebdomadaires", () => {
  it("existe pour chaque fréquence proposée, avec autant de séances que de jours", () => {
    for (const n of SESSIONS_PER_WEEK) {
      expect(SPLITS[n].sessions).toHaveLength(n);
    }
  });

  it("donne à chaque séance un titre, une lettre unique et des patrons", () => {
    for (const n of SESSIONS_PER_WEEK) {
      const codes = new Set<string>();
      for (const s of SPLITS[n].sessions) {
        expect(s.title.length).toBeGreaterThan(3);
        expect(s.patterns.length).toBeGreaterThanOrEqual(4);
        expect(codes.has(s.code)).toBe(false);
        codes.add(s.code);
      }
    }
  });

  it("équilibre poussée et tirage sur la semaine", () => {
    for (const n of SESSIONS_PER_WEEK) {
      const all = SPLITS[n].sessions.flatMap((s) => s.patterns).join(" ");
      expect(all).toMatch(/pouss/);
      expect(all).toMatch(/tirage/);
      // Le bas du corps n'est jamais sacrifié.
      expect(all).toMatch(/squat|charnière|soulevé|fente|presse/);
    }
  });

  // Principe validé avec le coach : chaque muscle au moins deux fois par
  // semaine, quelle que soit la fréquence. C'est le test qui interdit le bro
  // split pour de bon : si quelqu'un réécrit une répartition en « un muscle par
  // jour », il casse ici.
  it("travaille chaque grand groupe musculaire au moins deux fois par semaine", () => {
    const groups = ["pectoraux", "dos", "épaules", "quadriceps", "ischio-jambiers"];
    for (const n of SESSIONS_PER_WEEK) {
      for (const g of groups) {
        const hits = SPLITS[n].sessions.filter((s) => s.muscles.includes(g)).length;
        expect(hits, `${g} sur ${n} séances`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("donne un rappel léger à l'autre moitié de la jambe sur chaque jour à focus", () => {
    for (const n of SESSIONS_PER_WEEK) {
      for (const s of SPLITS[n].sessions) {
        if (/quadriceps/.test(s.title)) expect(s.secondary).toMatch(/ischio/);
        if (/ischio/.test(s.title)) expect(s.secondary).toMatch(/quadriceps/);
      }
    }
  });

  it("suit la base à 5 séances validée : Push, Pull, quadriceps, Haut, ischio, dans cet ordre", () => {
    expect(SPLITS[5].sessions.map((s) => s.title)).toEqual([
      "Push",
      "Pull",
      "Jambes · quadriceps",
      "Haut du corps",
      "Jambes · ischio-jambiers",
    ]);
  });

  it("refuse les bro splits déguisés : pas de Push/Pull/Legs sur 3 jours, pas de Haut/Bas sur 2", () => {
    expect(SPLITS[3].sessions.map((s) => s.title).join(" ")).not.toMatch(/^Push Pull/);
    expect(SPLITS[2].sessions.every((s) => /Full body/.test(s.title))).toBe(true);
  });

  it("ramène toute fréquence hors gabarit sur 2 à 5", () => {
    expect(clampSessionsPerWeek(1)).toBe(2);
    expect(clampSessionsPerWeek(6)).toBe(5);
    expect(clampSessionsPerWeek(7)).toBe(5);
    expect(clampSessionsPerWeek(3)).toBe(3);
    expect(clampSessionsPerWeek(NaN)).toBe(3);
  });
});

describe("blocs et cycles", () => {
  it("le produit 3 mois est un seul bloc de 3 cycles qui finit en décharge", () => {
    const b = blockDef(0, 1);
    expect(b.cycles).toHaveLength(3);
    expect(b.cycles[2].deloadLastWeek).toBe(true);
    expect(b.cycles[0].deloadLastWeek).toBe(false);
  });

  it("le produit 12 mois enchaîne 4 blocs d'orientation différente", () => {
    expect(PRODUCTS[12].blocks).toBe(4);
    expect(YEAR_BLOCKS).toHaveLength(4);
    const names = YEAR_BLOCKS.map((b) => b.name);
    expect(new Set(names).size).toBe(4);
    for (let i = 0; i < 4; i++) expect(blockDef(i, 4).name).toBe(names[i]);
  });

  it("la force (bloc 3) descend les reps et allonge les repos par rapport aux fondations", () => {
    const fondations = blockDef(0, 4).cycles[1];
    const force = blockDef(2, 4).cycles[1];
    expect(force.reps).toMatch(/5 à 8/);
    expect(fondations.reps).toMatch(/10 à 12/);
    expect(force.rest).toMatch(/180/);
  });

  it("un abonné qui dépasse l'année ne refait pas les fondations", () => {
    expect(blockDef(4, 4).name).not.toBe("Fondations");
    expect(blockDef(4, 4).name).toBe("Construction");
    expect(blockDef(7, 4).name).toBe("Construction");
  });

  it("une offre héritée d'un mois reçoit un cycle unique autonome", () => {
    const b = blockDef(0, 1, 1);
    expect(b.cycles).toHaveLength(1);
    expect(b.cycles[0].deloadLastWeek).toBe(true);
  });

  it("libelle les blocs et les semaines depuis l'index global", () => {
    expect(blockLabel(0, 1)).toBe("Transformation");
    expect(blockLabel(1, 4)).toBe("Bloc 2 · Construction");
    expect(cycleWeeksLabel(0)).toBe("SEMAINES 1 → 4");
    expect(cycleWeeksLabel(3)).toBe("SEMAINES 13 → 16");
    expect(cycleWeeksLabel(11)).toBe("SEMAINES 45 → 48");
  });

  it("compte un bloc par tranche de 3 mois", () => {
    expect(blocksForMonths(3)).toBe(1);
    expect(blocksForMonths(12)).toBe(4);
    expect(blocksForMonths(6)).toBe(2);
    expect(blocksForMonths(1)).toBe(1);
  });
});

describe("templatePrompt", () => {
  it("impose les titres des séances et les patrons pour la fréquence demandée", () => {
    const p = templatePrompt({ sessionsPerWeek: 4, blockIndex: 0, totalBlocks: 1 });
    for (const s of SPLITS[4].sessions) {
      expect(p).toContain(`"${s.title}"`);
      for (const pat of s.patterns) expect(p).toContain(pat);
      if (s.secondary) expect(p).toContain(s.secondary);
    }
    expect(p).toContain("4 séances distinctes");
  });

  it("rappelle au modèle la règle des deux fois par semaine et l'interdiction du bro split", () => {
    const p = templatePrompt({ sessionsPerWeek: 3, blockIndex: 0, totalBlocks: 1 });
    expect(p).toContain("DEUX FOIS PAR SEMAINE");
    expect(p).toMatch(/bro split/);
  });

  it("numérote les cycles du 2e bloc à partir du cycle 4 et des semaines 13", () => {
    const p = templatePrompt({ sessionsPerWeek: 3, blockIndex: 1, totalBlocks: 4 });
    expect(p).toContain('label "Cycle 4"');
    expect(p).toContain('label "Cycle 6"');
    expect(p).not.toContain('label "Cycle 1"');
    expect(p).toContain("SEMAINES 13 → 16");
    expect(p).toContain("SEMAINES 21 → 24");
    expect(p).toContain("BLOC 2 SUR 4");
    expect(p).toContain("Construction");
  });

  it("annonce la décharge uniquement sur les cycles qui la prévoient", () => {
    const p = templatePrompt({ sessionsPerWeek: 2, blockIndex: 0, totalBlocks: 1 });
    const occurrences = p.split("DÉCHARGE").length - 1;
    expect(occurrences).toBe(1);
  });

  it("tronque le bloc pour une offre héritée de 2 mois", () => {
    const p = templatePrompt({ sessionsPerWeek: 3, blockIndex: 0, totalBlocks: 1, cycleCount: 2 });
    expect(p).toContain('label "Cycle 2"');
    expect(p).not.toContain('label "Cycle 3"');
    expect(p).toContain("CYCLES DE CE BLOC (2)");
  });

  it("n'utilise jamais de tiret cadratin", () => {
    for (const n of SESSIONS_PER_WEEK) {
      for (let b = 0; b < 4; b++) {
        expect(templatePrompt({ sessionsPerWeek: n, blockIndex: b, totalBlocks: 4 })).not.toMatch(/[—–]/);
      }
    }
  });
});
