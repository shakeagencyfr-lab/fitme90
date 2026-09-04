import { describe, it, expect } from "vitest";
import { encodeText, textWidth, wrap, ellipsize, PdfPage, renderPdf, A4 } from "./pdf";
import { contentMarkString, isAiMarked } from "./ai-act";

/**
 * Générateur de PDF.
 *
 * Un PDF est un format texte à la syntaxe stricte : une parenthèse non
 * échappée dans un nom d'exercice suffit à rendre le fichier entier illisible,
 * et le lecteur n'affiche alors rien du tout, sans message d'erreur. Les tests
 * portent donc d'abord sur l'échappement et la structure, ensuite sur la mise
 * en page.
 */

describe("échappement du texte", () => {
  it("échappe ce qui délimite une chaîne PDF", () => {
    // « Presse à cuisses légère (rappel quadriceps) » : cas réel du plan, et
    // cas qui casserait le fichier entier sans échappement.
    expect(encodeText("Presse (légère)")).toContain("\\(");
    expect(encodeText("Presse (légère)")).toContain("\\)");
    expect(encodeText("a\\b")).toBe("a\\\\b");
  });

  it("garde les accents français, qui existent en WinAnsi", () => {
    // S'ils sautaient, tout le document serait truffé de points d'interrogation.
    const out = encodeText("Développé incliné à 30°");
    expect(out).not.toContain("?");
    expect(out.length).toBe("Développé incliné à 30°".length);
  });

  it("remplace un caractère hors table plutôt que d'émettre un octet au hasard", () => {
    expect(encodeText("emoji \u{1F600}")).toContain("?");
  });

  it("neutralise les caractères de contrôle", () => {
    expect(encodeText("ab")).toBe("a b");
  });
});

describe("caractères sans équivalent WinAnsi", () => {
  it("rend une flèche de plage par un tiret, lisible", () => {
    // « SEMAINES 1 → 4 » devient « SEMAINES 1 - 4 » plutôt qu'un chevron ou
    // un point d'interrogation.
    expect(encodeText("SEMAINES 1 → 4")).toBe("SEMAINES 1 - 4");
  });
});

describe("mesure du texte", () => {
  it("mesure un accent comme sa lettre de base", () => {
    // Les polices standard PDF donnent la même chasse à « e » et « é ».
    expect(textWidth("e", 10)).toBe(textWidth("é", 10));
    expect(textWidth("developpe", 10)).toBe(textWidth("développé", 10));
  });

  it("grossit proportionnellement au corps", () => {
    expect(textWidth("Squat", 20)).toBeCloseTo(textWidth("Squat", 10) * 2, 6);
  });

  it("donne le gras plus large que le romain", () => {
    expect(textWidth("Programme", 10, "Helvetica-Bold")).toBeGreaterThan(textWidth("Programme", 10));
  });
});

describe("découpe en lignes", () => {
  it("ne dépasse jamais la largeur demandée", () => {
    const texte =
      "Soulevé de terre roumain barre lourde, dos neutre absolu, et descente contrôlée jusqu'à mi-tibia.";
    for (const ligne of wrap(texte, 180, 9)) {
      expect(textWidth(ligne, 9)).toBeLessThanOrEqual(180);
    }
  });

  it("garde tous les mots, dans l'ordre", () => {
    const texte = "un deux trois quatre cinq six sept huit";
    expect(wrap(texte, 60, 9).join(" ")).toBe(texte);
  });

  it("respecte les retours à la ligne voulus", () => {
    expect(wrap("a\nb", 500, 9)).toEqual(["a", "b"]);
  });

  it("ne boucle pas sur un mot plus long que la ligne", () => {
    // Sans garde, un mot indivisible ferait tourner la découpe sans fin.
    expect(wrap("anticonstitutionnellement", 20, 9)).toHaveLength(1);
  });
});

describe("troncature", () => {
  it("laisse un texte court intact", () => {
    expect(ellipsize("Squat", 200, 10)).toBe("Squat");
  });

  it("tronque et tient dans la largeur", () => {
    // Un nom trop long déborderait sur la colonne voisine du tableau.
    const out = ellipsize("Développé incliné haltères prise neutre", 80, 10);
    expect(out.endsWith("…")).toBe(true);
    expect(textWidth(out, 10)).toBeLessThanOrEqual(80);
  });
});

describe("structure du fichier", () => {
  function octets() {
    const p = new PdfPage();
    p.text("Programme de Sébastien", 44, 44, { size: 20, font: "Helvetica-Bold" });
    p.line(44, 80, 550);
    p.rect(44, 90, 100, 20, [0.95, 0.95, 0.95]);
    return renderPdf([p], { title: "Programme" });
  }
  const texte = () => Buffer.from(octets()).toString("latin1");

  it("commence par l'en-tête PDF et finit par le marqueur de fin", () => {
    const s = texte();
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("porte une table de références dont les décalages pointent sur les objets", () => {
    // C'est cette table qui permet à un lecteur d'ouvrir le fichier. Un seul
    // décalage faux et rien ne s'affiche.
    const s = texte();
    const startxref = Number(s.slice(s.lastIndexOf("startxref") + 9).trim().split("\n")[0]);
    expect(s.slice(startxref, startxref + 4)).toBe("xref");

    // « xref », la plage, puis l'entrée libre de l'objet 0 : les objets réels
    // commencent à la quatrième ligne.
    const lignes = s.slice(startxref).split("\n").slice(3);
    let numero = 0;
    for (const ligne of lignes) {
      const m = ligne.match(/^(\d{10}) 00000 n/);
      if (!m) break;
      numero += 1;
      expect(s.slice(Number(m[1])).startsWith(`${numero} 0 obj`), `objet ${numero}`).toBe(true);
    }
    expect(numero).toBeGreaterThan(3);
  });

  it("déclare autant de pages qu'on lui en donne", () => {
    const s = Buffer.from(renderPdf([new PdfPage(), new PdfPage(), new PdfPage()])).toString("latin1");
    expect(s).toContain("/Count 3");
    expect(s.match(/\/Type \/Page[^s]/g)).toHaveLength(3);
  });

  it("utilise le format A4 et l'encodage WinAnsi", () => {
    const s = texte();
    expect(s).toContain(`/MediaBox [0 0 ${A4.width.toFixed(2)} ${A4.height.toFixed(2)}]`);
    expect(s).toContain("/WinAnsiEncoding");
  });

  it("annonce la bonne longueur pour chaque flux", () => {
    // Une longueur fausse tronque le contenu au rendu, sans erreur visible.
    const s = texte();
    const m = s.match(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/);
    expect(m).not.toBeNull();
    expect(Buffer.byteLength(m![2], "latin1")).toBe(Number(m![1]));
  });
});

// AI Act, article 50(2) : un contenu généré doit porter une marque LISIBLE PAR
// MACHINE. Une mention imprimée sur la page n'y suffit pas, un outil tiers doit
// pouvoir la détecter sans lire le document.
describe("marquage IA du fichier", () => {
  const marque = contentMarkString({
    vendor: "Anthropic",
    purpose: "Mon programme",
    generatedAt: "2026-09-04T10:00:00.000Z",
  });

  it("inscrit la marque dans les métadonnées du PDF", () => {
    const s = Buffer.from(renderPdf([new PdfPage()], { aiMark: marque })).toString("latin1");
    expect(s).toContain("/Producer (");
    expect(s).toContain("EU-AI-Act-Art-50");
  });

  it("la marque écrite se relit comme une marque IA", () => {
    const s = Buffer.from(renderPdf([new PdfPage()], { aiMark: marque })).toString("latin1");
    const m = s.match(/\/Producer \((.*?)\) >>/);
    expect(m).not.toBeNull();
    // Les parenthèses sont échappées dans un littéral PDF : on les rétablit
    // avant de relire, sinon le JSON ne se parse pas.
    const brut = m![1].replace(/\\([()\\])/g, "$1");
    expect(isAiMarked(brut)).toBe(true);
  });

  it("n'écrit aucun /Info quand il n'y a ni titre ni marque", () => {
    const s = Buffer.from(renderPdf([new PdfPage()])).toString("latin1");
    expect(s).not.toContain("/Info");
  });

  it("garde le titre ET la marque quand les deux sont donnés", () => {
    const s = Buffer.from(renderPdf([new PdfPage()], { title: "Mon programme", aiMark: marque })).toString("latin1");
    expect(s).toContain("/Title (");
    expect(s).toContain("/Producer (");
  });
});

