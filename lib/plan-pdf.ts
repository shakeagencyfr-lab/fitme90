import { cycleSessions, type Plan, type Session } from "@/lib/program";
import { macrosForDay, pnum, grp } from "@/lib/nutrition";
import { A4, PdfPage, ellipsize, renderPdf, textWidth, wrap } from "@/lib/pdf";
import { dateLocale, makeT, type Locale } from "@/lib/i18n";
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

export interface PlanPdfInput {
  plan: Plan;
  clientName: string;
  coachName: string;
  locale: Locale;
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
function entete(c: Composeur, { clientName, coachName, locale }: PlanPdfInput, t: ReturnType<typeof makeT>): void {
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
function seance(c: Composeur, s: Session, t: ReturnType<typeof makeT>): void {
  // Le titre et au moins l'en-tête du tableau doivent tenir ensemble : un
  // titre seul en bas de page, avec ses exercices sur la suivante, se lit mal.
  c.reserver(72);

  c.page.text(s.title, MARGE, c.y, { size: 11.5, font: "Helvetica-Bold", color: ENCRE });
  c.y += 16;

  if (s.warmup.length > 0) {
    const detail = s.warmup.map((w) => (w.detail ? `${w.name} (${w.detail})` : w.name)).join(" · ");
    paragraphe(c, `${t("session.warmup")} : ${detail}`, { size: 8.5, color: GRIS_CLAIR });
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

  for (const ex of s.exercises) {
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
  c.y += 14;
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

  const cycles = input.plan.cycles ?? [];
  cycles.forEach((cycle, i) => {
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
    for (const s of cycleSessions(input.plan, i)) seance(c, s, t);
  });

  nutrition(c, input.plan, t);

  const date = new Date().toLocaleDateString(dateLocale(input.locale), { day: "numeric", month: "long", year: "numeric" });
  // La mention visible accompagne la marque machine : l'une informe le lecteur,
  // l'autre les outils. L'article 50 attend les deux.
  pieds(c.pages, `${t("pdf.footer", { date })} · ${t("pdf.aiNotice")}`);

  return renderPdf(c.pages, {
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
