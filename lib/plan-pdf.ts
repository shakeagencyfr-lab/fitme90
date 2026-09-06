import { cycleSessions, type Plan, type Session } from "@/lib/program";
import { isCircuitSession, type SensationStep } from "@/lib/circuit";
import { macrosForDay, pnum, grp, type ScaledMeal } from "@/lib/nutrition";
import { A4, PdfPage, ellipsize, renderPdf, textWidth, wrap, type PdfImage } from "@/lib/pdf";
import type { HeartZone, RpeStep } from "@/lib/fitness";
import { explainWarmup, bpmLabel } from "@/lib/warmup-guide";
import { dateLocale, makeT, pick, type Locale, type LocalText } from "@/lib/i18n";
import { ZONE_DEFS_DE } from "@/lib/i18n/pack-de";
import { ZONE_DEFS_ES } from "@/lib/i18n/pack-es";
import { contentMarkString } from "@/lib/ai-act";

/**
 * Composition du plan d'entraînement en PDF téléchargeable.
 *
 * Le rendu HTML de `components/plan-pdf-view` reste : il sert à lire le plan à
 * l'écran. Celui-ci produit le FICHIER, celui qui part quand on clique. Les
 * deux montrent la même chose ; ils n'ont simplement pas le même destinataire,
 * un navigateur d'un côté, un lecteur de PDF de l'autre.
 *
 * La mise en page est délibérément sobre : du texte, des filets, quelques
 * aplats. Pas parce qu'on ne saurait pas faire mieux, mais parce qu'un plan
 * d'entraînement se lit et s'annote, parfois sur un papier posé sur un banc.
 */

const MARGE = 44;
const LARGEUR_UTILE = A4.width - MARGE * 2;

const ENCRE: [number, number, number] = [0.09, 0.1, 0.11];
const GRIS: [number, number, number] = [0.43, 0.42, 0.4];
const GRIS_CLAIR: [number, number, number] = [0.6, 0.59, 0.57];
const FILET: [number, number, number] = [0.87, 0.86, 0.84];
const FOND: [number, number, number] = [0.976, 0.973, 0.969];

/** Colonnes du tableau d'exercices, en fraction de la largeur utile. */
const COLONNES = { exercice: 0.42, series: 0.16, repos: 0.1, note: 0.32 };

export interface PlanPdfOptions {
  /** Index des cycles à exporter ; null = tous. */
  cycles: number[] | null;
  /** Les repères nutritionnels (calories et macros). */
  nutrition: boolean;
  /** Une journée type de repas, jour d'entraînement et jour de repos. */
  sampleMeals: boolean;
}

export const PDF_OPTIONS_ALL: PlanPdfOptions = { cycles: null, nutrition: true, sampleMeals: true };

export interface PlanPdfInput {
  plan: Plan;
  clientName: string;
  coachName: string;
  locale: Locale;
  options?: PlanPdfOptions;
  /** Logo du coach ou de la salle, déjà préparé (lib/pdf-image.ts). */
  logo?: PdfImage | null;
  /** Zones cardiaques du client (âge et FC de repos renseignés), sinon null. */
  zones?: HeartZone[] | null;
  /** L'échelle RPE dans la langue du document. */
  rpe?: { intro: string; steps: RpeStep[] } | null;
  /** L'échelle de sensations (circuits), rendue seulement si le plan en a. */
  sensations?: { intro: string; steps: SensationStep[] } | null;
  /** Journée type de repas, calculée par lib/nutrition sur les objectifs du plan. */
  sampleMeals?: { training: ScaledMeal[]; rest: ScaledMeal[] } | null;
}

/**
 * Curseur de composition : tient la page courante et la hauteur déjà occupée,
 * et ouvre une page neuve quand le bloc suivant ne tient plus.
 *
 * C'est le seul état de tout le module. Sans lui, chaque fonction de rendu
 * devrait se demander où elle en est, et une section à cheval sur deux pages
 * serait coupée n'importe où.
 */
class Composeur {
  pages: PdfPage[] = [];
  page!: PdfPage;
  y = 0;

  constructor() {
    this.nouvellePage();
  }

  nouvellePage(): void {
    this.page = new PdfPage();
    this.pages.push(this.page);
    this.y = MARGE;
  }

  /** Ouvre une page si `hauteur` ne tient pas dans ce qui reste. */
  reserver(hauteur: number): void {
    if (this.y + hauteur > A4.height - MARGE) this.nouvellePage();
  }

  espace(n: number): void {
    this.y += n;
  }
}

/** Texte sur plusieurs lignes, avec passage de page si besoin. */
function paragraphe(
  c: Composeur,
  texte: string,
  opts: { size?: number; color?: [number, number, number]; gras?: boolean; largeur?: number } = {},
): void {
  const size = opts.size ?? 9.5;
  const font = opts.gras ? "Helvetica-Bold" : "Helvetica";
  const interligne = size * 1.45;
  for (const ligne of wrap(texte, opts.largeur ?? LARGEUR_UTILE, size, font)) {
    c.reserver(interligne);
    c.page.text(ligne, MARGE, c.y, { size, font, color: opts.color ?? GRIS });
    c.y += interligne;
  }
}

/** En-tête du document : marque, titre, destinataire. */
function entete(c: Composeur, { clientName, coachName, locale, logo }: PlanPdfInput, t: ReturnType<typeof makeT>): void {
  // Le logo du coach ou de la salle en haut à droite, à l'échelle dans une
  // boîte de 150 x 44 points ; sans logo, le nom seul en fait office.
  if (logo && logo.width > 0 && logo.height > 0) {
    const boxW = 150, boxH = 44;
    const k = Math.min(boxW / logo.width, boxH / logo.height);
    const w = logo.width * k, h = logo.height * k;
    c.page.image(logo.name, MARGE + LARGEUR_UTILE - w, c.y - 2, w, h);
  }
  c.page.text(coachName.toUpperCase(), MARGE, c.y, { size: 8.5, font: "Helvetica-Bold", color: GRIS_CLAIR });
  c.y += 18;

  const titre = clientName ? t("pdf.titleFor", { name: clientName }) : t("pdf.title");
  c.page.text(titre, MARGE, c.y, { size: 23, font: "Helvetica-Bold", color: ENCRE });
  c.y += 32;

  const date = new Date().toLocaleDateString(dateLocale(locale), { day: "numeric", month: "long", year: "numeric" });
  c.page.text(`${t("pdf.eyebrow")} · ${date}`, MARGE, c.y, { size: 9, color: GRIS_CLAIR });
  c.y += 16;
  c.page.line(MARGE, c.y, MARGE + LARGEUR_UTILE, { color: FILET });
  c.y += 18;
}

/** Titre de section, avec son filet. */
function section(c: Composeur, titre: string): void {
  c.reserver(46);
  c.page.text(titre, MARGE, c.y, { size: 14, font: "Helvetica-Bold", color: ENCRE });
  c.y += 22;
}

/** Une séance : titre, échauffement, puis le tableau des exercices. */
function seance(c: Composeur, s: Session, t: ReturnType<typeof makeT>, zones: HeartZone[] | null, locale: Locale): void {
  // Le titre et au moins l'en-tête du tableau doivent tenir ensemble : un
  // titre seul en bas de page, avec ses exercices sur la suivante, se lit mal.
  c.reserver(72);

  c.page.text(s.title, MARGE, c.y, { size: 11.5, font: "Helvetica-Bold", color: ENCRE });
  c.y += 16;

  if (s.warmup.length > 0) {
    // Chaque item avec son mode d'emploi et, pour le cardio, la zone et les
    // pulsations du client : le papier doit se suffire, sans l'app sous la main.
    c.page.text(t("session.warmup"), MARGE, c.y, { size: 8.5, font: "Helvetica-Bold", color: GRIS });
    c.y += 13;
    for (const w of s.warmup) {
      const ex = explainWarmup(w, zones, locale);
      let ligne = w.detail ? `${w.name}, ${w.detail}` : w.name;
      if (ex.zone) {
        ligne += ` (${ex.zone.id}${ex.zone.name ? ` ${ex.zone.name}` : ""}${ex.zone.range ? `, ${bpmLabel(ex.zone.range, locale)}` : ""})`;
      }
      paragraphe(c, `· ${ligne}`, { size: 8.5, color: GRIS });
      if (ex.how) paragraphe(c, ex.how, { size: 8, color: GRIS_CLAIR, largeur: LARGEUR_UTILE - 12 });
      c.y += 2;
    }
    c.y += 4;
  }

  const cols = {
    exercice: LARGEUR_UTILE * COLONNES.exercice,
    series: LARGEUR_UTILE * COLONNES.series,
    repos: LARGEUR_UTILE * COLONNES.repos,
    note: LARGEUR_UTILE * COLONNES.note,
  };
  const x = {
    exercice: MARGE,
    series: MARGE + cols.exercice,
    repos: MARGE + cols.exercice + cols.series,
    note: MARGE + cols.exercice + cols.series + cols.repos,
  };

  c.page.text(t("pdf.setsReps").toUpperCase(), x.series, c.y, { size: 7.5, font: "Helvetica-Bold", color: GRIS_CLAIR });
  c.page.text(t("session.rest").toUpperCase(), x.repos, c.y, { size: 7.5, font: "Helvetica-Bold", color: GRIS_CLAIR });
  c.page.text(t("pdf.note").toUpperCase(), x.note, c.y, { size: 7.5, font: "Helvetica-Bold", color: GRIS_CLAIR });
  c.y += 12;
  c.page.line(MARGE, c.y, MARGE + LARGEUR_UTILE, { color: FILET });
  c.y += 8;

  // Une séance en circuit n'a pas de tableau séries × reps : ses blocs
  // suivent, avec leurs paramètres. Une séance en séries peut finir par un bloc.
  const circuit = isCircuitSession(s);
  for (const ex of circuit ? [] : s.exercises) {
    // Une note longue passe à la ligne : la hauteur d'une rangée dépend d'elle.
    const notes = ex.note ? wrap(ex.note, cols.note - 8, 8.5) : [];
    const hauteur = Math.max(16, notes.length * 12 + 4);
    c.reserver(hauteur + 6);

    c.page.text(ellipsize(ex.name, cols.exercice - 8, 9.5), x.exercice, c.y, { size: 9.5, color: ENCRE });

    const series = ex.cardio ? t("pdf.cardio") : `${ex.sets} × ${ex.reps}`;
    c.page.text(ellipsize(series, cols.series - 8, 9), x.series, c.y, { size: 9, color: GRIS });

    const repos = ex.cardio ? "·" : `${ex.rest ?? s.restSec}s`;
    c.page.text(repos, x.repos, c.y, { size: 9, color: GRIS });

    notes.forEach((ligne, i) => {
      c.page.text(ligne, x.note, c.y + i * 12, { size: 8.5, color: GRIS });
    });

    c.y += hauteur;
    c.page.line(MARGE, c.y - 4, MARGE + LARGEUR_UTILE, { color: [0.93, 0.92, 0.91] });
  }
  for (const b of s.blocks ?? []) {
    c.reserver(40);
    const titre = `${circuit ? "" : `${t("session.finisher")} · `}${b.title || t("pdf.circuit")}`;
    c.page.text(ellipsize(titre, LARGEUR_UTILE - 8, 9.5), MARGE, c.y, { size: 9.5, font: "Helvetica-Bold", color: ENCRE });
    c.y += 13;
    const params = t("pdf.circuitLine", { rounds: b.rounds, work: b.work, rest: b.rest, roundRest: b.roundRest });
    paragraphe(c, b.sensation ? `${params} · ${t("pdf.sensation", { n: b.sensation })}` : params, { size: 8.5, color: GRIS });
    for (const e of b.exercises) {
      c.reserver(14);
      paragraphe(c, `· ${e.name}${e.note ? `, ${e.note}` : ""}`, { size: 8.5, color: GRIS, largeur: LARGEUR_UTILE - 12 });
    }
    c.y += 6;
  }
  c.y += 14;
}

/** L'échelle de sensations : comment régler l'intensité d'un circuit. */
function echelleSensations(c: Composeur, sens: { intro: string; steps: SensationStep[] }, t: ReturnType<typeof makeT>): void {
  c.reserver(130);
  section(c, t("pdf.sensationTitle"));
  paragraphe(c, sens.intro, { size: 9, color: GRIS });
  c.y += 6;
  for (const step of sens.steps) {
    c.reserver(16);
    c.page.text(`${step.id}/4`, MARGE + 6, c.y, { size: 9, font: "Helvetica-Bold", color: ENCRE });
    c.page.text(step.label, MARGE + 40, c.y, { size: 9, font: "Helvetica-Bold", color: GRIS });
    c.page.text(ellipsize(step.body, LARGEUR_UTILE - 132, 8.5), MARGE + 126, c.y, { size: 8.5, color: GRIS });
    c.y += 14;
  }
  c.y += 4;
  paragraphe(c, t("pdf.sensationGoal"), { size: 8.5, color: GRIS_CLAIR });
  c.y += 8;
}

/** Les repères nutritionnels, en deux lignes : entraînement et repos. */
function nutrition(c: Composeur, plan: Plan, t: ReturnType<typeof makeT>): void {
  const base = {
    kcal: pnum(plan.nutrition.kcal),
    protein: pnum(plan.nutrition.protein),
    carbs: pnum(plan.nutrition.carbs),
    fat: pnum(plan.nutrition.fat),
  };
  const lignes = [
    { titre: t("pdf.trainingDay"), m: macrosForDay(base, false) },
    { titre: t("pdf.restDay"), m: macrosForDay(base, true) },
  ];

  // Le tableau entier tient sur une page : le couper entre les deux jours
  // reviendrait à cacher la moitié de la comparaison.
  c.reserver(120);
  section(c, t("pdf.nutrition"));

  const colTitre = LARGEUR_UTILE * 0.28;
  const colChiffre = (LARGEUR_UTILE - colTitre) / 4;
  const xCol = (i: number) => MARGE + colTitre + i * colChiffre;

  const entetes = [t("dashboard.caloriesPerDay"), t("pdf.protein"), t("pdf.carbs"), t("pdf.fat")];
  c.page.rect(MARGE, c.y - 6, LARGEUR_UTILE, 20, FOND);
  entetes.forEach((h, i) => {
    c.page.text(h.toUpperCase(), xCol(i) + 6, c.y, { size: 7.5, font: "Helvetica-Bold", color: GRIS_CLAIR });
  });
  c.y += 18;

  for (const ligne of lignes) {
    c.page.line(MARGE, c.y - 4, MARGE + LARGEUR_UTILE, { color: FILET });
    c.page.text(ligne.titre, MARGE + 6, c.y + 3, { size: 9.5, font: "Helvetica-Bold", color: ENCRE });
    const valeurs = [grp(ligne.m.kcal), `${ligne.m.protein} g`, `${ligne.m.carbs} g`, `${ligne.m.fat} g`];
    valeurs.forEach((v, i) => {
      c.page.text(v, xCol(i) + 6, c.y + 2, { size: 12, font: "Helvetica-Bold", color: ENCRE });
    });
    c.y += 24;
  }
  c.page.line(MARGE, c.y - 4, MARGE + LARGEUR_UTILE, { color: FILET });
  c.y += 10;
  paragraphe(c, t("pdf.macroNote"), { size: 8.5, color: GRIS_CLAIR });
  c.y += 6;
}

/** L'échelle RPE : comment choisir sa charge. Toujours dans le document. */
function echelleRpe(c: Composeur, rpe: { intro: string; steps: RpeStep[] }, t: ReturnType<typeof makeT>): void {
  c.reserver(150);
  section(c, t("pdf.rpeTitle"));
  paragraphe(c, rpe.intro, { size: 9, color: GRIS });
  c.y += 6;
  for (const step of rpe.steps) {
    c.reserver(16);
    c.page.text(`RPE ${step.id}`, MARGE + 6, c.y, { size: 9, font: "Helvetica-Bold", color: ENCRE });
    c.page.text(step.label, MARGE + 58, c.y, { size: 9, font: "Helvetica-Bold", color: GRIS });
    c.page.text(ellipsize(step.body, LARGEUR_UTILE - 150, 8.5), MARGE + 144, c.y, { size: 8.5, color: GRIS });
    c.y += 14;
  }
  c.y += 4;
  paragraphe(c, t("pdf.rpeGoal"), { size: 8.5, color: GRIS_CLAIR });
  c.y += 8;
}

/** Les cinq zones cardiaques, avec les pulsations du client quand on les connaît. */
function zonesCardio(c: Composeur, zones: HeartZone[] | null, t: ReturnType<typeof makeT>, locale: Locale): void {
  c.reserver(160);
  section(c, t("pdf.zonesTitle"));
  paragraphe(c, zones ? t("pdf.zonesIntro") : t("pdf.zonesNoProfile"), { size: 9, color: GRIS });
  c.y += 6;
  const defs: [string, string, string][] = [
    ["Z1", "Récupération", "Échauffement, retour au calme, marche"],
    ["Z2", "Endurance", "Base du cardio, allure où tu peux parler"],
    ["Z3", "Tempo", "Allure soutenue, phrases courtes"],
    ["Z4", "Seuil", "Intervalles longs, respiration forte"],
    ["Z5", "VO2 max", "Sprints courts, effort maximal"],
  ];
  const defsEn: [string, string, string][] = [
    ["Z1", "Recovery", "Warm-up, cool-down, walking"],
    ["Z2", "Endurance", "Cardio base, a pace where you can talk"],
    ["Z3", "Tempo", "Sustained pace, short sentences"],
    ["Z4", "Threshold", "Long intervals, heavy breathing"],
    ["Z5", "VO2 max", "Short sprints, maximal effort"],
  ];
  const ZONE_DEFS: LocalText<[string, string, string][]> = { fr: defs, en: defsEn, de: ZONE_DEFS_DE, es: ZONE_DEFS_ES };
  const lignes = pick(ZONE_DEFS, locale);
  c.page.rect(MARGE, c.y - 6, LARGEUR_UTILE, 20, FOND);
  c.page.text("ZONE", MARGE + 6, c.y, { size: 7.5, font: "Helvetica-Bold", color: GRIS_CLAIR });
  c.page.text(t("pdf.zoneUse").toUpperCase(), MARGE + 130, c.y, { size: 7.5, font: "Helvetica-Bold", color: GRIS_CLAIR });
  c.page.text("BPM", MARGE + LARGEUR_UTILE - 90, c.y, { size: 7.5, font: "Helvetica-Bold", color: GRIS_CLAIR });
  c.y += 18;
  lignes.forEach(([id, nom, usage], i) => {
    c.reserver(18);
    c.page.line(MARGE, c.y - 4, MARGE + LARGEUR_UTILE, { color: FILET });
    c.page.text(`${id} · ${nom}`, MARGE + 6, c.y, { size: 9, font: "Helvetica-Bold", color: ENCRE });
    c.page.text(ellipsize(usage, LARGEUR_UTILE - 240, 8.5), MARGE + 130, c.y, { size: 8.5, color: GRIS });
    const z = zones?.[i];
    c.page.text(z ? z.range.replace(/[–-]/, " à ") : "·", MARGE + LARGEUR_UTILE - 90, c.y, { size: 9, font: "Helvetica-Bold", color: ENCRE });
    c.y += 17;
  });
  c.page.line(MARGE, c.y - 4, MARGE + LARGEUR_UTILE, { color: FILET });
  c.y += 12;
}

/** Une journée type de repas, jour d'entraînement puis jour de repos. */
function journeeType(c: Composeur, meals: { training: ScaledMeal[]; rest: ScaledMeal[] }, t: ReturnType<typeof makeT>): void {
  c.reserver(120);
  section(c, t("pdf.sampleMeals"));
  paragraphe(c, t("pdf.sampleMealsIntro"), { size: 8.5, color: GRIS_CLAIR });
  c.y += 6;
  for (const bloc of [
    { titre: t("pdf.trainingDay"), list: meals.training },
    { titre: t("pdf.restDay"), list: meals.rest },
  ]) {
    c.reserver(40);
    c.page.text(bloc.titre, MARGE, c.y, { size: 10.5, font: "Helvetica-Bold", color: ENCRE });
    c.y += 16;
    for (const m of bloc.list) {
      c.reserver(30);
      c.page.text(`${m.time}  ${m.name}`, MARGE + 6, c.y, { size: 9.5, font: "Helvetica-Bold", color: ENCRE });
      const kcal = `${grp(m.kcal)} kcal`;
      c.page.text(kcal, MARGE + LARGEUR_UTILE - textWidth(kcal, 9), c.y, { size: 9, color: GRIS });
      c.y += 13;
      const items = m.items.map((it) => `${it.food} ${it.qty}`).join(" · ");
      paragraphe(c, items, { size: 8.5, color: GRIS, largeur: LARGEUR_UTILE - 12 });
      c.y += 5;
    }
    c.y += 6;
  }
}

/** Numéro de page en pied, une fois le nombre total connu. */
function pieds(pages: PdfPage[], mention: string): void {
  pages.forEach((page, i) => {
    const y = A4.height - MARGE + 6;
    page.line(MARGE, y - 12, MARGE + LARGEUR_UTILE, { color: FILET });
    page.text(mention, MARGE, y, { size: 7.5, color: GRIS_CLAIR });
    const num = `${i + 1} / ${pages.length}`;
    page.text(num, MARGE + LARGEUR_UTILE - textWidth(num, 7.5), y, { size: 7.5, color: GRIS_CLAIR });
  });
}

/** Compose le plan et rend les octets du PDF. */
export function planPdf(input: PlanPdfInput): Uint8Array {
  const t = makeT(input.locale);
  const c = new Composeur();

  entete(c, input, t);

  if (input.plan.summary) {
    paragraphe(c, input.plan.summary, { size: 10, color: GRIS });
    c.y += 14;
  }

  const options = input.options ?? PDF_OPTIONS_ALL;
  const zones = input.zones ?? null;
  const cycles = input.plan.cycles ?? [];
  cycles.forEach((cycle, i) => {
    if (options.cycles && !options.cycles.includes(i)) return;
    // Les semaines couvertes AVANT le titre, en surtitre : posées après, elles
    // retombaient sur la ligne du titre et les deux se chevauchaient.
    if (cycle.weeks) {
      c.reserver(60);
      c.page.text(cycle.weeks, MARGE, c.y, { size: 8, font: "Helvetica-Bold", color: GRIS_CLAIR });
      c.y += 13;
    }
    section(c, `${cycle.label} · ${cycle.name}`);
    if (cycle.body) {
      paragraphe(c, cycle.body, { size: 9, color: GRIS });
      c.y += 8;
    }
    for (const s of cycleSessions(input.plan, i)) seance(c, s, t, zones, input.locale);
  });

  // Toujours présents : le client s'entraîne avec ce papier, il doit savoir
  // choisir sa charge et lire une zone cardiaque sans l'app.
  // Les deux échelles ne sont pas exclusives : une salle peut avoir un
  // finisher en circuit, et un programme maison n'a que des sensations.
  const desBlocs = cycles.some((_, i) => cycleSessions(input.plan, i).some((s) => (s.blocks?.length ?? 0) > 0));
  const desSeries = cycles.some((_, i) => cycleSessions(input.plan, i).some((s) => !isCircuitSession(s)));
  if (input.rpe && (desSeries || !desBlocs)) echelleRpe(c, input.rpe, t);
  if (input.sensations && desBlocs) echelleSensations(c, input.sensations, t);
  zonesCardio(c, zones, t, input.locale);

  if (options.nutrition) nutrition(c, input.plan, t);
  if (options.sampleMeals && input.sampleMeals) journeeType(c, input.sampleMeals, t);

  const date = new Date().toLocaleDateString(dateLocale(input.locale), { day: "numeric", month: "long", year: "numeric" });
  // Pas de mention visible en pied de page : le document que le client
  // imprime est celui de SON coach, et la ligne coupait ce lien à chaque page.
  // La marque lisible par machine reste écrite dans les métadonnées du fichier
  // (champ /Producer, plus bas) : c'est ce format-là que l'article 50(2)
  // demande, et la transparence sur l'usage de l'IA vit dans le parcours
  // (page /ia, information au premier échange avec le Coach IA).
  pieds(c.pages, t("pdf.footer", { date }));

  return renderPdf(c.pages, {
    images: input.logo ? [input.logo] : [],
    title: input.clientName ? `${t("pdf.title")} ${input.clientName}` : t("pdf.title"),
    // AI Act, article 50(2) : le document sort marqué, pas seulement légendé.
    aiMark: contentMarkString({
      vendor: "Anthropic",
      purpose: t("pdf.title"),
      generatedAt: new Date().toISOString(),
    }),
  });
}

/** Nom de fichier proposé au téléchargement, sûr sur tous les systèmes. */
export function planPdfFilename(clientName: string): string {
  const base = (clientName || "programme")
    .normalize("NFD")
    // Marques combinantes laissées par la décomposition NFD, écrites en
    // échappements : en littéral elles sont invisibles et se perdent au copier-coller.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return `programme-${base || "client"}.pdf`;
}
