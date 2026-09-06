import { cardioZone, isCardioExercise, type HeartZone } from "@/lib/fitness";
import { pick, translate, type Locale, type LocalText } from "@/lib/i18n";
import { CARDIO_HOW_DE, WARMUP_RULES_DE } from "@/lib/i18n/pack-de";

/**
 * Un échauffement qui s'explique tout seul. Pur, testé.
 *
 * Le programme dit « Mobilité hanches, 6 mouvements » ou « Rameur, 5 min » :
 * le client ne sait ni quels mouvements ni à quelle intensité. Pour chaque
 * item, on ajoute le « comment » (les mouvements concrets, les séries
 * d'activation) et, pour le cardio, la zone cardiaque avec la fourchette de
 * pulsations du client. Rien n'est inventé sur le contenu du programme : le
 * texte du plan reste, on l'éclaire.
 */

/** Conservé pour les appelants historiques : c'est la locale de l'app. */
export type WarmupLocale = Locale;

export interface WarmupExplained {
  name: string;
  detail: string;
  /** Le mode d'emploi concret, ou vide si le texte du plan se suffit. */
  how: string;
  /** Zone cardiaque cible (cardio seulement), avec sa fourchette de pulsations. */
  zone: { id: string; name: string; range: string } | null;
}

function deburr(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

type Rule = { test: RegExp } & LocalText;

/** Ce qu'on fait vraiment, par zone du corps ou par type d'item. */
const RULES: Rule[] = [
  {
    test: /fessier|pont|abduction|glute/,
    fr: "Pont fessier 2 x 15, abductions debout ou à l'élastique 2 x 15 par côté : contracte volontairement la fesse en haut de chaque répétition.",
    en: "Glute bridge 2 x 15, standing or banded abductions 2 x 15 per side: squeeze the glute deliberately at the top of every rep.",
    de: WARMUP_RULES_DE[0],
  },
  {
    test: /activation|montee en charge|series? legere|serie d'?approche|a vide|approche/,
    fr: "1 à 2 séries très légères du premier exercice de la séance (environ la moitié de la charge de travail), tempo lent, pour régler la technique avant de charger.",
    en: "1 to 2 very light sets of the first exercise (about half the working load), slow tempo, to set the technique before loading.",
    de: WARMUP_RULES_DE[1],
  },
  {
    test: /hanche.*cheville|cheville.*hanche/,
    fr: "Cercles de hanche 8 par sens, fentes dynamiques 8 par jambe, balancés de jambe avant-arrière 10 par jambe, puis cercles de cheville 10 par sens et montées sur pointes 15.",
    en: "Hip circles 8 each way, dynamic lunges 8 per leg, front-to-back leg swings 10 per leg, then ankle circles 10 each way and 15 calf raises.",
    de: WARMUP_RULES_DE[2],
  },
  {
    test: /hanche|hip/,
    fr: "Cercles de hanche 8 par sens, balancés de jambe avant-arrière puis latéraux 10 par jambe, squats à vide 10, fentes dynamiques 8 par jambe.",
    en: "Hip circles 8 each way, leg swings front-to-back then sideways 10 per leg, 10 bodyweight squats, dynamic lunges 8 per leg.",
    de: WARMUP_RULES_DE[3],
  },
  {
    test: /epaule|shoulder|coiffe|rotateur/,
    fr: "Cercles de bras 10 par sens, rotations externes à l'élastique ou à vide 15, élévations en Y et en T 10 chacune, pompes scapulaires 10.",
    en: "Arm circles 10 each way, external rotations with a band or bodyweight 15, Y and T raises 10 each, scapular push-ups 10.",
    de: WARMUP_RULES_DE[4],
  },
  {
    test: /thoracique|dos|colonne|rachis|spine|back/,
    fr: "Chat-vache 10, rotations thoraciques à quatre pattes 8 par côté, ouvertures de poitrine contre un mur 8 par côté, bonjours au poids du corps 10.",
    en: "Cat-cow 10, quadruped thoracic rotations 8 per side, chest openers against a wall 8 per side, bodyweight good mornings 10.",
    de: WARMUP_RULES_DE[5],
  },
  {
    test: /cheville|ankle|mollet|calf/,
    fr: "Cercles de cheville 10 par sens, flexions genou vers le mur 10 par jambe, montées sur pointes lentes 15.",
    en: "Ankle circles 10 each way, knee-to-wall drives 10 per leg, slow calf raises 15.",
    de: WARMUP_RULES_DE[6],
  },
  {
    test: /poignet|wrist|coude|elbow/,
    fr: "Cercles de poignet 10 par sens, flexions et extensions de poignet 15, appuis progressifs sur les mains au sol.",
    en: "Wrist circles 10 each way, wrist flexion and extension 15, progressive weight on the hands on the floor.",
    de: WARMUP_RULES_DE[7],
  },
  {
    test: /genou|knee/,
    fr: "Squats à vide lents 10, fentes courtes 8 par jambe, montées de genou sur place 20.",
    en: "Slow bodyweight squats 10, short lunges 8 per leg, high knees on the spot 20.",
    de: WARMUP_RULES_DE[8],
  },
  {
    test: /mobilit|articulaire|dynamique|etirement|stretch/,
    fr: "Hanches, épaules, chevilles et colonne : 6 à 8 mouvements lents et amples, sans forcer, 8 à 10 répétitions chacun.",
    en: "Hips, shoulders, ankles and spine: 6 to 8 slow, wide movements, no forcing, 8 to 10 reps each.",
    de: WARMUP_RULES_DE[9],
  },
];

const CARDIO_HOW: LocalText = {
  de: CARDIO_HOW_DE,
  fr: "Allure facile, tu peux parler sans t'essouffler ; monte un peu le rythme sur la dernière minute.",
  en: "Easy pace, you can talk without getting out of breath; pick up the pace a little on the last minute.",
};

/** Les zones du client viennent de son profil (âge, FC de repos) ; sans elles, on annonce la zone sans les pulsations. */
export function explainWarmup(
  item: { name: string; detail?: string },
  zones: HeartZone[] | null,
  locale: WarmupLocale = "fr",
): WarmupExplained {
  const name = item.name || "";
  const detail = item.detail || "";
  const text = deburr(`${name} ${detail}`);

  if (isCardioExercise(name, undefined, false) || /cardio|z1|z2|zone/.test(text)) {
    // Un échauffement se fait en Z1 sauf indication contraire : le plan qui
    // écrit « Z1-Z2 » ou « progressif » a raison, on lit ce qu'il dit.
    const explicit = /z(?:one)?\s*([1-5])/.exec(text);
    let zone: HeartZone | null = null;
    if (zones && zones.length) {
      zone = explicit ? cardioZone(zones, `z${explicit[1]}`, name, detail) : zones[0];
    }
    return {
      name,
      detail,
      how: pick(CARDIO_HOW, locale),
      zone: zone ? { id: zone.id, name: zone.name, range: zone.range } : { id: explicit ? `Z${explicit[1]}` : "Z1", name: "", range: "" },
    };
  }

  const rule = RULES.find((r) => r.test.test(text));
  return { name, detail, how: rule ? pick(rule, locale) : "", zone: null };
}

/** « 105 à 118 bpm » à partir de la fourchette « 105–118 » d'une zone. */
export function bpmLabel(range: string, locale: WarmupLocale = "fr"): string {
  const [a, b] = range.split(/[–-]/).map((x) => x.trim());
  if (!a || !b) return "";
  return translate(locale, "session.bpmRange", { a, b });
}
