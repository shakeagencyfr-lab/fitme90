import { it, expect, vi } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { cycleCountForDays, type Plan } from "@/lib/program";
import { planMetrics, planConformity, constraintEcho } from "@/lib/plan-quality";
import { usdToEur } from "@/lib/config";

/**
 * Banc d'essai : le MÊME brief généré sous plusieurs réglages, comparé sur des
 * mesures et pas sur une impression.
 *
 * Il ne fait pas partie de la suite de tests (son nom ne finit pas par
 * « .test.ts ») parce qu'il appelle vraiment l'API et coûte de l'argent. On le
 * lance à la demande :
 *
 *   ANTHROPIC_API_KEY=sk-ant-… npm run compare:generation
 *
 * Compter environ 0,80 $ pour les trois réglages par défaut.
 *
 * Pourquoi un fichier Vitest plutôt qu'un script : `lib/program` importe
 * `server-only`, que Vitest neutralise déjà, et l'alias « @ » y est configuré.
 * Rien à réinventer pour lancer du code serveur hors de Next.
 */

const CLE = process.env.ANTHROPIC_API_KEY ?? "";
const UTILISABLE = CLE.length > 20 && !/^placeholder/i.test(CLE);

if (!UTILISABLE) {
  process.stdout.write(
    "\n  Banc d'essai non lancé : aucune clé Anthropic utilisable.\n" +
      "  ANTHROPIC_API_KEY=sk-ant-… npm run compare:generation\n" +
      "  Compter environ 0,80 $ pour les trois réglages.\n\n",
  );
}

/** Tarifs Anthropic, dollars par million de tokens. */
const TARIFS: Record<string, { in: number; out: number }> = {
  "claude-opus-5": { in: 5, out: 25 },
  "claude-sonnet-5": { in: 2, out: 10 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

/**
 * Un brief FIXE. C'est la condition de la comparaison : si le brief bouge, les
 * écarts observés ne veulent plus rien dire. Quatre jours d'entraînement,
 * matériel de salle complète, objectif de prise de masse.
 */
/** Zone contrainte du brief, cherchée ensuite dans le plan rendu. */
const ZONES = ["épaule"];

const BRIEF = {
  answers: {
    name: "Témoin",
    age: "34",
    weight: "78",
    height: "180",
    rest: "62",
    sex: "homme",
    goal: "prise de masse",
    level: "intermédiaire",
    days: "4",
    place: "salle",
    // VRAIES clés du questionnaire. La première version utilisait « injuries »,
    // qui n'existe nulle part : la contrainte n'atteignait pas le bloc impératif
    // du brief et le banc mesurait un chemin que personne n'emprunte.
    patho1: ["Épaule"],
    mobility: ["Épaules"],
    past_injuries: "gêne à l'épaule droite en développé militaire",
    diet: "aucune restriction",
    training_history: "3 ans de musculation, arrêt de 6 mois",
    loved_exos: "j'aime le soulevé de terre, je déteste le burpee",
  } as Record<string, unknown>,
  trainDays: ["LUN", "MAR", "JEU", "VEN"],
  equipment: ["Barre olympique", "Haltères", "Rack à squat", "Poulie haute", "Presse à cuisses", "Banc réglable", "Rameur"],
  programDays: 90,
  locale: "fr" as const,
};

/** Les réglages comparés. Le premier est celui en production aujourd'hui. */
const REGLAGES = [
  { nom: "Opus 5 · high (production)", model: "claude-opus-5", effort: "high" as const },
  { nom: "Opus 5 · medium", model: "claude-opus-5", effort: "medium" as const },
  { nom: "Sonnet 5 · high", model: "claude-sonnet-5", effort: "high" as const },
];

const SORTIE = "tmp/compare-generation";

interface Ligne {
  nom: string;
  model: string;
  effort: string;
  secondes: number;
  inTok: number;
  outTok: number;
  usd: number;
  eur: number;
  conforme: string;
  variete: number;
  progression: number;
  exosParSeance: number;
  echauffements: number;
  consignes: number;
  derive: string;
  contrainte: string;
  erreur?: string;
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

it.skipIf(!UTILISABLE)(
  "génère le même brief sous chaque réglage et compare",
  // Trois générations Opus de bout en bout : le délai par défaut de Vitest ne
  // suffit pas, et une coupure au milieu gaspillerait les appels déjà payés.
  { timeout: 15 * 60 * 1000 },
  async () => {
    mkdirSync(SORTIE, { recursive: true });
    const wantCycles = cycleCountForDays(BRIEF.programDays);
    const wantSessions = BRIEF.trainDays.length;
    const lignes: Ligne[] = [];

    for (const r of REGLAGES) {
      // `MODELS.generate` lit la variable d'environnement UNE SEULE FOIS, au
      // chargement du module. Poser la variable dans la boucle sans recharger
      // ferait donc tourner les trois réglages sur le même modèle, et la
      // comparaison ne comparerait rien. D'où le rechargement à chaque tour.
      process.env.ANTHROPIC_MODEL_GENERATE = r.model;
      vi.resetModules();
      const { generateProgram } = await import("@/lib/program");
      const t0 = Date.now();
      try {
        const res = await generateProgram(BRIEF, r.effort, CLE, null);
        const secondes = (Date.now() - t0) / 1000;
        const tarif = TARIFS[r.model] ?? TARIFS["claude-opus-5"];
        // Tous les appels du run, relance jetée comprise : c'est ce que la
        // facture porte, et donc ce qu'il faut comparer d'un modèle à l'autre.
        const inTok = res.calls.reduce((n, c) => n + c.usage.input_tokens, 0);
        const outTok = res.calls.reduce((n, c) => n + c.usage.output_tokens, 0);
        const usd = (inTok * tarif.in + outTok * tarif.out) / 1_000_000;
        const m = planMetrics(res.plan as Plan);
        const c = planConformity(res.plan as Plan, wantCycles, wantSessions);
        const ce = constraintEcho(res.plan as Plan, ZONES);
        // Le seul critère où « presque » ne suffit pas : nier une contrainte
        // déclarée est disqualifiant, quel que soit le reste du plan.
        const contrainte = ce.denies
          ? "NIÉE"
          : ce.inWarning && ce.inNotes
            ? "avert. + consigne"
            : ce.inWarning
              ? "avert. seul"
              : ce.inNotes
                ? "consigne seule"
                : "absente";

        writeFileSync(`${SORTIE}/${r.model}-${r.effort}.json`, JSON.stringify(res.plan, null, 2));
        lignes.push({
          nom: r.nom,
          model: r.model,
          effort: r.effort,
          secondes,
          inTok,
          outTok,
          usd,
          eur: usdToEur(usd),
          conforme: c.cyclesOk && c.sessionsOk ? "oui" : `non (${c.cyclesOk ? "" : "cycles "}${c.sessionsOk ? "" : "séances"})`.trim(),
          variete: m.dayVariety,
          progression: m.progression,
          exosParSeance: m.avgExercises,
          echauffements: m.warmupRate,
          consignes: m.noteRate,
          derive: m.macroDrift == null ? "n/a" : pct(m.macroDrift),
          contrainte,
        });
      } catch (e) {
        lignes.push({
          nom: r.nom, model: r.model, effort: r.effort,
          secondes: (Date.now() - t0) / 1000,
          inTok: 0, outTok: 0, usd: 0, eur: 0,
          conforme: "échec", variete: 0, progression: 0, exosParSeance: 0,
          echauffements: 0, consignes: 0, derive: "n/a", contrainte: "n/a",
          erreur: e instanceof Error ? e.message : String(e),
        });
      }
    }
    delete process.env.ANTHROPIC_MODEL_GENERATE;

    // Tableau écrit à la main sur la sortie standard : `console` est
    // intercepté par Vitest et le rendu dépend du rapporteur, alors que ce
    // tableau EST le résultat du banc. Il doit s'afficher, toujours.
    const colonnes: [string, (l: Ligne) => string][] = [
      ["Réglage", (l) => l.nom],
      ["Coût $", (l) => l.usd.toFixed(4)],
      ["Coût €", (l) => l.eur.toFixed(3)],
      ["Sortie", (l) => String(l.outTok)],
      ["Durée", (l) => `${l.secondes.toFixed(0)} s`],
      ["Conforme", (l) => l.conforme],
      ["Jours distincts", (l) => pct(l.variete)],
      ["Progression", (l) => pct(l.progression)],
      ["Exos/séance", (l) => l.exosParSeance.toFixed(1)],
      ["Échauff.", (l) => pct(l.echauffements)],
      ["Consignes", (l) => pct(l.consignes)],
      ["Dérive macros", (l) => l.derive],
      ["Contrainte épaule", (l) => l.contrainte],
    ];
    const largeurs = colonnes.map(([titre, get]) =>
      Math.max(titre.length, ...lignes.map((l) => get(l).length)),
    );
    const rendu = (cells: string[]) =>
      cells.map((c, i) => c.padEnd(largeurs[i])).join("  ").trimEnd();

    const sortie = [
      "",
      rendu(colonnes.map(([t]) => t)),
      rendu(largeurs.map((w) => "-".repeat(w))),
      ...lignes.map((l) => rendu(colonnes.map(([, get]) => get(l)))),
      "",
    ];
    for (const l of lignes) if (l.erreur) sortie.push(`  ${l.nom} : ${l.erreur}`);

    writeFileSync(`${SORTIE}/resultats.json`, JSON.stringify(lignes, null, 2));
    const total = lignes.reduce((s, l) => s + l.usd, 0);
    sortie.push(
      `  Plans complets et résultats bruts dans ${SORTIE}/`,
      `  Dépense de ce banc d'essai : ${total.toFixed(2)} $`,
      "",
    );
    process.stdout.write(sortie.join("\n"));

    expect(lignes.some((l) => !l.erreur)).toBe(true);
  },
);

it.skipIf(UTILISABLE)("sans clé, ne dépense rien et dit quoi faire", () => {
  expect(UTILISABLE).toBe(false);
});
