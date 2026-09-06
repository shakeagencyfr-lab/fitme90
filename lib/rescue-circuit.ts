// Séance de dépannage : le programme du jour, refait en circuit avec ce que le
// client a sous la main.
//
// LE PROBLÈME. Le bouton « Je n'ai pas mon matériel » envoyait la question au
// Coach IA, qui répondait en texte dans le chat. Le client lisait, puis se
// débrouillait : pas de fiche, pas de chrono, rien à valider. C'est le moment
// où il a le plus besoin d'être pris par la main (chambre d'hôtel, voyage,
// salle fermée) qui était le moins bien servi. Et chaque demande coûtait un
// appel au modèle.
//
// LA RÈGLE. On sait faire mieux sans IA : la séance du jour donne les groupes
// musculaires, le moteur d'alternatives donne un mouvement praticable pour
// chacun, et lib/circuit.ts sait déjà transformer une liste d'exercices en
// blocs chronométrés. Résultat instantané, gratuit, et le client déroule le
// même chrono plein écran que les programmes maison. Le programme enregistré
// n'est pas touché : c'est une séance de remplacement pour ce jour-là.
//
// Module PUR : testable à sec, aucune dépendance serveur.

import { pick, translate, type Locale, type LocalText } from "@/lib/i18n";
import { RESCUE_WARMUP_DE } from "@/lib/i18n/pack-de";
import type { Session } from "@/lib/program";
import { libraryEntry, type LibraryExercise } from "@/lib/exercise-library";
import { equipmentSupports, pickAlternative, traitsOf } from "@/lib/exercise-alternatives";
import { EXERCISE_LIBRARY } from "@/lib/exercise-library";
import type { Famille } from "@/lib/exercise-traits";
import {
  circuitParams,
  fillToBudget,
  isCircuitSession,
  trimToBudget,
  type CircuitBlock,
  type CircuitLevel,
} from "@/lib/circuit";

/** Les trois situations proposées par le bouton, et leur matériel. */
export type RescueKind = "aucun" | "hotel" | "halteres";

export const RESCUE_KINDS: readonly RescueKind[] = ["aucun", "hotel", "halteres"] as const;

export function isRescueKind(v: unknown): v is RescueKind {
  return typeof v === "string" && (RESCUE_KINDS as readonly string[]).includes(v);
}

/**
 * Ce dont on dispose dans chaque cas, en clés du catalogue de matériel. La
 * chambre d'hôtel est volontairement modeste : des haltères légers, un banc,
 * un tapis, parfois des élastiques. Tout ce qui demande une machine sort.
 */
export const RESCUE_EQUIPMENT: Record<RescueKind, readonly string[]> = {
  aucun: [],
  hotel: ["halteres", "banc-plat", "tapis-sol", "elastiques"],
  halteres: ["halteres", "tapis-sol"],
};

/** Zone de travail, pour titrer les blocs et alterner le souffle. */
type Zone = "jambes" | "haut" | "tronc" | "cardio";

const ZONE_DE: Record<Famille, Zone> = {
  quadriceps: "jambes",
  ischios: "jambes",
  fessiers: "jambes",
  mollets: "jambes",
  adducteurs: "jambes",
  pectoraux: "haut",
  dos_vertical: "haut",
  dos_horizontal: "haut",
  epaules: "haut",
  epaules_arriere: "haut",
  trapezes: "haut",
  biceps: "haut",
  triceps: "haut",
  avant_bras: "haut",
  abdos: "tronc",
  obliques: "tronc",
  lombaires: "tronc",
  cardio: "cardio",
  corps_entier: "cardio",
};

const ZONE_KEY: Record<Zone, "rescue.zoneLegs" | "rescue.zoneUpper" | "rescue.zoneCore" | "rescue.zoneCardio"> = {
  jambes: "rescue.zoneLegs",
  haut: "rescue.zoneUpper",
  tronc: "rescue.zoneCore",
  cardio: "rescue.zoneCardio",
};

/** Les noms d'exercices de la séance, circuit ou séries, cardio compris. */
function namesOf(session: Session): { name: string; key?: string; note?: string }[] {
  if (isCircuitSession(session)) {
    return (session.blocks ?? []).flatMap((b) => b.exercises.map((e) => ({ name: e.name, key: e.key, note: e.note })));
  }
  return session.exercises.map((e) => ({ name: e.name, key: e.key, note: e.note }));
}

export interface RescueExercise {
  name: string;
  key: string;
  note: string;
  zone: Zone;
  /** true quand le mouvement d'origine était déjà praticable ici. */
  garde: boolean;
}

export interface RescueMapping {
  exercises: RescueExercise[];
  /**
   * Les mouvements qu'on n'a PAS su remplacer, sous leur nom d'origine.
   *
   * Ils existent vraiment : sans le moindre objet, aucun tirage vertical n'a
   * d'équivalent honnête (une traction demande une barre, un rowing inversé
   * une table ou un élastique). Plutôt que de servir un mouvement qui ne
   * travaille pas le dos et de faire croire que la séance est complète, on
   * les rend à l'appelant, qui le dit au client.
   */
  dropped: string[];
}

/**
 * Les mouvements de remplacement, un par exercice de la séance du jour.
 *
 * Un exercice déjà praticable avec le matériel du dépannage est GARDÉ tel
 * quel : le client n'a aucune raison de troquer ses pompes contre autre chose
 * parce qu'il est à l'hôtel. Le reste passe par le moteur d'alternatives, qui
 * cherche la même famille principale, en préférant cette fois les mouvements
 * qui UTILISENT le matériel annoncé.
 */
export function mapExercises(session: Session, equipment: readonly string[]): RescueMapping {
  const out: RescueExercise[] = [];
  const dropped: string[] = [];
  const pris = new Set<string>();

  for (const src of namesOf(session)) {
    const entry = libraryEntry(src.name, src.key);
    const traits = entry ? traitsOf(entry) : null;
    if (!entry || !traits) {
      dropped.push(src.name);
      continue;
    }

    let choisi: LibraryExercise | null = null;
    let garde = false;
    if (equipmentSupports(traits, equipment)) {
      choisi = entry;
      garde = true;
    } else {
      choisi = pickAlternative({
        name: entry.name,
        equipment,
        avoid: out.map((o) => o.name),
        // Le client a sorti ses haltères : autant s'en servir.
        preferEquipped: equipment.length > 0,
      });
    }
    if (!choisi) {
      dropped.push(entry.name);
      continue;
    }
    // Déjà retenu (deux exercices de la séance mènent au même remplaçant) :
    // ce n'est pas un manque, on ne le signale pas.
    if (pris.has(choisi.key)) continue;
    const t = traitsOf(choisi);
    if (!t) continue;
    pris.add(choisi.key);
    out.push({
      name: choisi.name,
      key: choisi.key,
      // La consigne vient de la fiche : elle est déjà relue, rien à inventer.
      // Celle de l'exercice d'origine ne vaut plus quand le mouvement change.
      note: (garde && src.note ? src.note : choisi.guide.cues[0]) ?? "",
      zone: ZONE_DE[t.familles[0]],
      garde,
    });
  }
  return { exercises: out, dropped };
}

/**
 * Range les exercices pour que deux voisins ne travaillent pas la même zone :
 * on tourne entre jambes, haut du corps, tronc et cardio. En circuit, c'est ce
 * qui permet de tenir le bloc sans s'arrêter, chaque zone récupérant pendant
 * que la suivante travaille.
 */
export function alterneZones(list: readonly RescueExercise[]): RescueExercise[] {
  const files = new Map<Zone, RescueExercise[]>();
  for (const e of list) {
    const f = files.get(e.zone) ?? [];
    f.push(e);
    files.set(e.zone, f);
  }
  const out: RescueExercise[] = [];
  let derniere: Zone | null = null;
  while (out.length < list.length) {
    // La zone la plus fournie, mais jamais deux fois de suite tant qu'une
    // autre attend : c'est l'alternance qui compte, pas l'équilibre parfait.
    const candidates = [...files.entries()].filter(([, f]) => f.length > 0);
    if (!candidates.length) break;
    const autres = candidates.filter(([z]) => z !== derniere);
    const [zone, file] = (autres.length ? autres : candidates).sort((a, b) => b[1].length - a[1].length)[0];
    out.push(file.shift()!);
    derniere = zone;
  }
  return out;
}

/** Découpe en blocs de taille voisine, 3 à 5 exercices, 3 blocs au plus. */
export function decoupeBlocs(list: readonly RescueExercise[]): RescueExercise[][] {
  const n = list.length;
  if (n === 0) return [];
  const nb = Math.max(1, Math.min(3, Math.round(n / 4) || 1));
  const taille = Math.ceil(n / nb);
  const out: RescueExercise[][] = [];
  for (let i = 0; i < n; i += taille) out.push(list.slice(i, i + taille));
  return out;
}

/**
 * Un circuit trop maigre pour être une séance.
 *
 * Une séance qu'on a déjà retouchée peut ne compter que deux ou trois
 * mouvements. Mise au chrono telle quelle, elle donne un circuit qu'on tourne
 * six fois : pénible et sans intérêt. En dessous de ce seuil, on complète
 * depuis la bibliothèque avec ce que le matériel permet, en cherchant les
 * zones qui manquent.
 */
const CIBLE_EXERCICES = 6;

/**
 * Complète une liste d'exercices jusqu'à une séance jouable.
 *
 * On prend d'abord dans les zones absentes (un circuit qui n'a que du haut du
 * corps s'équilibre avec des jambes et du tronc), puis dans les moins
 * représentées. À matériel égal, le mouvement le plus simple à mettre en place
 * gagne : c'est un circuit, on enchaîne, personne ne veut régler une machine
 * entre deux exercices.
 */
export function completerCircuit(
  base: readonly RescueExercise[],
  equipment: readonly string[],
  cible = CIBLE_EXERCICES,
): RescueExercise[] {
  const out = [...base];
  if (out.length >= cible) return out;
  const pris = new Set(out.map((e) => e.key));

  const candidats = EXERCISE_LIBRARY.map((e) => ({ e, t: traitsOf(e) }))
    .filter(({ e, t }) => !!t && !pris.has(e.key) && equipmentSupports(t!, equipment))
    .map(({ e, t }) => ({ entry: e, zone: ZONE_DE[t!.familles[0]], besoins: t!.besoin.length }));

  while (out.length < cible) {
    const compte = new Map<Zone, number>();
    for (const e of out) compte.set(e.zone, (compte.get(e.zone) ?? 0) + 1);
    // La zone la moins servie d'abord, le mouvement le plus simple ensuite.
    const trie = candidats
      .filter((c) => !pris.has(c.entry.key))
      .sort((a, b) => (compte.get(a.zone) ?? 0) - (compte.get(b.zone) ?? 0) || a.besoins - b.besoins);
    const choisi = trie[0];
    if (!choisi) break;
    pris.add(choisi.entry.key);
    out.push({
      name: choisi.entry.name,
      key: choisi.entry.key,
      note: choisi.entry.guide.cues[0] ?? "",
      zone: choisi.zone,
      garde: false,
    });
  }
  return out;
}

export interface CircuitFromInput {
  session: Session;
  /** Le matériel réellement disponible pour CETTE séance. */
  equipment: readonly string[];
  level: CircuitLevel;
  /** Durée cible de la séance, en minutes. */
  minutes: number;
  /** Cycle en cours (0, 1, 2) : il règle effort, repos et tours. */
  cycleIndex: number;
  locale: Locale;
}

/** Les mouvements du dépannage, pour la situation choisie par le client. */
export function rescueExercises(session: Session, kind: RescueKind): RescueMapping {
  return mapExercises(session, RESCUE_EQUIPMENT[kind]);
}

export interface RescueInput {
  session: Session;
  kind: RescueKind;
  level: CircuitLevel;
  /** Durée cible de la séance, en minutes (celle du programme). */
  minutes: number;
  /** Cycle en cours (0, 1, 2) : il règle effort, repos et tours. */
  cycleIndex: number;
  locale: Locale;
}

export interface RescueSession {
  blocks: CircuitBlock[];
  warmup: { name: string; detail: string }[];
  /** Les mouvements sans équivalent ici, à dire au client. */
  dropped: string[];
}

const WARMUP: LocalText<{ name: string; detail: string }[]> = {
  fr: [
    { name: "Monter en température", detail: "3 min de marche sur place, montées de genoux puis talons fesses, de plus en plus vite." },
    { name: "Mobilité", detail: "Cercles de bras 10 par sens, rotations de hanches 8 par sens, squats à vide 10, fentes arrière 6 par jambe." },
    { name: "Activation", detail: "1 tour du premier bloc à moitié vitesse, pour installer les appuis et la respiration." },
  ],
  en: [
    { name: "Warm up", detail: "3 min marching on the spot, high knees then heel flicks, picking up the pace." },
    { name: "Mobility", detail: "Arm circles 10 each way, hip rotations 8 each way, 10 bodyweight squats, 6 reverse lunges per leg." },
    { name: "Activation", detail: "One round of the first block at half speed, to set your stance and your breathing." },
  ],
  de: RESCUE_WARMUP_DE,
};

/**
 * Une séance existante, refaite en circuit avec le matériel donné.
 *
 * C'est le moteur commun de deux usages : la séance de dépannage (matériel
 * restreint, choisi par le client dans l'app) et la conversion en circuit
 * demandée au Coach IA (matériel du client, ou matériel restreint lui aussi).
 * Les paramètres (effort, repos, tours) sont ceux du cycle en cours, pour que
 * le circuit soit du même niveau d'exigence que le programme, et l'ensemble
 * est ramené dans la durée habituelle des séances du client.
 */
export function circuitFromSession(input: CircuitFromInput): RescueSession {
  const p = circuitParams(input.level, input.cycleIndex);
  const { exercises, dropped } = mapExercises(input.session, input.equipment);
  // Une séance déjà réduite à deux mouvements ne fait pas un circuit : on
  // complète avant de découper, sinon on tourne six fois sur deux exercices.
  const complets = completerCircuit(exercises, input.equipment);
  const groupes = decoupeBlocs(alterneZones(complets));
  const locale = input.locale;
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);

  const blocks: CircuitBlock[] = groupes.map((g, i) => {
    // Zone dominante du bloc : c'est ce que le client lit avant de lancer.
    const compte = new Map<Zone, number>();
    for (const e of g) compte.set(e.zone, (compte.get(e.zone) ?? 0) + 1);
    // Zone dominante du bloc, et « corps entier » quand aucune ne domine :
    // un bloc jambes + tronc + cardio ne s'appelle pas « bloc tronc ».
    const rangs = [...compte.entries()].sort((a, b) => b[1] - a[1]);
    const zone = rangs.length > 1 && rangs[0][1] === rangs[1][1] ? null : rangs[0][0];
    return {
      title: `${t("rescue.block")} ${i + 1} · ${zone ? t(ZONE_KEY[zone]) : t("rescue.fullBody")}`,
      rounds: p.rounds,
      work: p.work,
      rest: p.rest,
      roundRest: 30,
      restAfter: i === groupes.length - 1 ? 0 : 60,
      sensation: input.cycleIndex === 0 ? 2 : 3,
      exercises: g.map((e) => ({ name: e.name, key: e.key, note: e.note })),
    };
  });

  // Le temps disponible, échauffement déduit. On rogne s'il y a trop, on
  // ajoute des tours s'il y a trop peu : quatre mouvements praticables ne
  // doivent pas donner un quart d'heure là où le client en a quarante-cinq.
  const budget = Math.max(15, input.minutes - 7) * 60;
  return {
    blocks: fillToBudget(trimToBudget(blocks, budget), budget),
    warmup: pick(WARMUP, locale),
    dropped,
  };
}

/** La séance de dépannage : un circuit avec le matériel de la situation choisie. */
export function rescueSession(input: RescueInput): RescueSession {
  const { kind, ...reste } = input;
  return circuitFromSession({ ...reste, equipment: RESCUE_EQUIPMENT[kind] });
}
