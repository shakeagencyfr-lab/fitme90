// Verrouillage de la génération sur la bibliothèque.
//
// LE PROBLÈME. Le modèle écrivait librement le nom de chaque exercice. La
// plupart du temps il tombait juste, mais il lui arrivait d'inventer une
// variante (« développé couché prise serrée haltères ») ou un nom approchant.
// Le rapprochement, tolérant, raccrochait alors ce nom à la fiche la plus
// proche, et le client ouvrait une photo qui ne montrait pas ce qu'on lui
// demandait de faire. Le tort n'était pas au rapprochement : il faisait ce
// qu'on lui demandait. Il était en amont, dans un vocabulaire ouvert.
//
// LA RÈGLE. Le modèle reçoit la liste fermée de ce que le client peut faire
// (la bibliothèque filtrée par son matériel, plus les fiches ajoutées par son
// coach) et doit y prendre chaque nom TEL QUEL. Il garde toute liberté sur les
// consignes d'exécution, les séries, les répétitions, le tempo : c'est là que
// l'objectif s'exprime, pas dans l'invention d'un mouvement. Ensuite, on
// vérifie, on répare ce qui peut l'être sans changer de mouvement, et on
// relance une fois si trop de noms sortent de la liste.
//
// Tout ce fichier est PUR : mêmes entrées, même sortie, testable sans réseau.

import {
  EXERCISE_LIBRARY,
  exactLibraryExercise,
  matchLibraryExercise,
  normalizeExerciseName,
  type LibraryExercise,
} from "@/lib/exercise-library";
import { EXERCISE_TRAITS, equipmentSupports, pickAlternative, traitsOf } from "@/lib/exercise-alternatives";
import type { Famille } from "@/lib/exercise-traits";
import type { Plan, PlanExercise } from "@/lib/program";

/** Une fiche ajoutée par le coach dans sa bibliothèque (table exercise_media). */
export interface CoachExercise {
  exercise_key: string;
  name: string;
  muscle: string | null;
}

export interface AllowedExercise {
  key: string;
  name: string;
  /** Groupe affiché, pour ranger la liste dans le prompt. */
  groupe: string;
  /** true : fiche du coach, sans traits connus, permise telle quelle. */
  coach: boolean;
}

/** Libellé de la famille principale, pour ranger la liste envoyée au modèle. */
const GROUPE: Record<Famille, string> = {
  quadriceps: "Cuisses",
  ischios: "Ischio-jambiers",
  fessiers: "Fessiers",
  mollets: "Mollets",
  adducteurs: "Adducteurs",
  pectoraux: "Pectoraux",
  dos_vertical: "Dos (tirage vertical)",
  dos_horizontal: "Dos (tirage horizontal)",
  epaules: "Épaules",
  epaules_arriere: "Arrière d'épaule",
  trapezes: "Trapèzes",
  biceps: "Biceps",
  triceps: "Triceps",
  avant_bras: "Avant-bras",
  abdos: "Abdominaux",
  obliques: "Obliques",
  lombaires: "Lombaires",
  cardio: "Cardio",
  corps_entier: "Corps entier",
};

/**
 * Ce que ce client peut faire : la bibliothèque filtrée par son matériel, puis
 * les fiches de son coach. Sans matériel déclaré, il reste le poids du corps,
 * qui est loin d'être vide depuis la bibliothèque maison.
 */
export function allowedExercises(
  equipment: readonly string[],
  coach: readonly CoachExercise[] = [],
): AllowedExercise[] {
  const out: AllowedExercise[] = [];
  for (const e of EXERCISE_LIBRARY) {
    const t = traitsOf(e);
    if (!t) continue;
    if (!equipmentSupports(t, equipment)) continue;
    out.push({ key: e.key, name: e.name, groupe: GROUPE[t.familles[0]], coach: false });
  }
  const deja = new Set(out.map((a) => normalizeExerciseName(a.name)));
  for (const c of coach) {
    const nom = (c.name ?? "").trim();
    if (!nom || deja.has(normalizeExerciseName(nom))) continue;
    out.push({ key: c.exercise_key, name: nom, groupe: c.muscle?.trim() || "Fiches du coach", coach: true });
  }
  return out;
}

/**
 * La liste telle qu'elle part au modèle : rangée par groupe, un groupe par
 * ligne, noms séparés par des barres. Compacte (un millier de jetons pour une
 * salle complète), lisible, et sans ambiguïté sur ce qui est un nom.
 */
export function allowedListPrompt(list: readonly AllowedExercise[]): string {
  const parGroupe = new Map<string, string[]>();
  for (const a of list) {
    const arr = parGroupe.get(a.groupe) ?? [];
    arr.push(a.name);
    parGroupe.set(a.groupe, arr);
  }
  const lignes = [...parGroupe.entries()].map(([g, noms]) => `${g} : ${noms.join(" | ")}`);
  return [
    "EXERCICES AUTORISÉS (RÈGLE ABSOLUE). Le champ \"name\" de CHAQUE exercice reprend EXACTEMENT, à la lettre, un nom de la liste ci-dessous. Aucun autre exercice, aucune variante inventée, aucun nom approchant, aucun matériel ajouté au nom. Si tu veux une exécution particulière (tempo, amplitude, prise, pause, unilatéral), tu la décris dans \"note\", en gardant le nom tel quel. Un nom hors liste est une faute : il sera retiré du programme.",
    ...lignes,
  ].join("\n");
}

export interface Repair {
  from: string;
  to: string;
  raison: "approche" | "materiel";
}

export interface EnforceResult {
  plan: Plan;
  /** Noms réécrits sans changer de mouvement (nom approché -> nom canonique). */
  repaired: Repair[];
  /** Noms remplacés par un autre mouvement de la même famille (matériel). */
  replaced: Repair[];
  /** Noms qu'on n'a pu ni reconnaître ni remplacer : retirés. */
  removed: string[];
}

/**
 * Passe le plan au crible de la liste autorisée et pose la clé de chaque
 * exercice.
 *
 * Quatre issues pour un nom, de la meilleure à la pire :
 *  1. exact (nom ou alias) et permis : on pose la clé, rien à signaler ;
 *  2. approché mais permis : on réécrit le nom canonique, même mouvement ;
 *  3. reconnu mais interdit par le matériel : un mouvement de la même famille
 *     que le client peut faire, via le moteur d'alternatives ;
 *  4. inconnu : retiré. Une séance ne descend jamais sous un exercice : le
 *     dernier reste tel quel, sans clé, plutôt qu'une séance vide.
 */
export function enforceLibrary(
  plan: Plan,
  equipment: readonly string[],
  coach: readonly CoachExercise[] = [],
): EnforceResult {
  const allowed = allowedExercises(equipment, coach);
  const parCle = new Map(allowed.map((a) => [a.key, a]));
  const coachParNom = new Map(coach.map((c) => [normalizeExerciseName(c.name), c]));
  const repaired: Repair[] = [];
  const replaced: Repair[] = [];
  const removed: string[] = [];

  // Les séances « à plat » et la séance unique d'un plan sont des MIROIRS des
  // cycles (compatibilité des anciens plans) : on les passe aussi au crible,
  // mais sans compter deux fois ce qui a déjà été signalé sur les cycles.
  let compter = true;
  const resolve = (ex: PlanExercise, avoid: string[]): PlanExercise | null => {
    const brut = ex.name.trim();
    // Fiche du coach : permise telle quelle.
    const c = coachParNom.get(normalizeExerciseName(brut));
    if (c) return { ...ex, name: c.name, key: c.exercise_key };

    const exact = exactLibraryExercise(brut);
    if (exact && parCle.has(exact.key)) return { ...ex, name: exact.name, key: exact.key };

    const proche: LibraryExercise | null = exact ?? matchLibraryExercise(brut);
    if (proche && parCle.has(proche.key)) {
      if (compter) repaired.push({ from: brut, to: proche.name, raison: "approche" });
      return { ...ex, name: proche.name, key: proche.key };
    }
    if (proche) {
      // Reconnu, mais le client n'a pas le matériel : même famille, autre
      // mouvement. L'alternative est prise dans ce qu'il peut faire.
      const alt = pickAlternative({ name: proche.name, equipment, avoid, cardio: !!ex.cardio });
      if (alt) {
        if (compter) replaced.push({ from: brut, to: alt.name, raison: "materiel" });
        return { ...ex, name: alt.name, key: alt.key, load: "" };
      }
    }
    if (compter) removed.push(brut);
    return null;
  };

  const passeSeance = <S extends { exercises: PlanExercise[] }>(s: S): S => {
    const gardes: PlanExercise[] = [];
    const noms = s.exercises.map((e) => e.name);
    for (const ex of s.exercises) {
      const r = resolve(ex, [...noms, ...gardes.map((g) => g.name)]);
      if (r) gardes.push(r);
    }
    if (!gardes.length && s.exercises.length) {
      // Plutôt une séance douteuse qu'une séance vide : on garde le premier
      // exercice tel quel, sans clé. Il reste dans `removed` pour le signaler.
      gardes.push(s.exercises[0]);
    }
    return { ...s, exercises: gardes };
  };

  const cycles = (plan.cycles ?? []).map((c) => ({
    ...c,
    sessions: c.sessions ? c.sessions.map(passeSeance) : c.sessions,
  }));
  // Un plan sans cycles (ancien format) n'a que ses miroirs : là, on compte.
  compter = !(plan.cycles ?? []).some((c) => c.sessions?.length);
  const sessions = plan.sessions ? plan.sessions.map(passeSeance) : plan.sessions;
  compter = false;
  const session = plan.session ? passeSeance(plan.session) : plan.session;
  return { plan: { ...plan, cycles, sessions, session }, repaired, replaced, removed };
}

/** Nombre de noms qui ont posé problème : sert à décider une relance. */
export function enforceIssues(r: EnforceResult): number {
  return r.repaired.length + r.replaced.length + r.removed.length;
}

/**
 * Un nom d'exercice tel qu'un humain ou le coach IA le tape, ramené à la
 * fiche permise, ou null. Même règle que la génération, pour une retouche de
 * séance : on ne laisse pas entrer par la porte de côté ce qu'on a fermé à
 * l'entrée.
 */
export function canonicalExercise(
  nom: string,
  equipment: readonly string[],
  coach: readonly CoachExercise[] = [],
): { name: string; key: string } | null {
  const c = coach.find((x) => normalizeExerciseName(x.name) === normalizeExerciseName(nom));
  if (c) return { name: c.name, key: c.exercise_key };
  const entry = exactLibraryExercise(nom) ?? matchLibraryExercise(nom);
  if (!entry) return null;
  const t = EXERCISE_TRAITS[entry.key];
  if (t && !equipmentSupports(t, equipment)) return null;
  return { name: entry.name, key: entry.key };
}
