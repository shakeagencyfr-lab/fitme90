/**
 * Générateur de PDF minimal, sans dépendance.
 *
 * POURQUOI ÉCRIRE ÇA PLUTÔT QUE PRENDRE UNE BIBLIOTHÈQUE.
 *
 * L'export du plan passait par `window.print()`, qui ouvre la boîte
 * d'impression du navigateur : sur téléphone, le client doit y trouver
 * « Enregistrer au format PDF », ce que la plupart ne font pas. Un vrai
 * téléchargement demande un fichier PDF produit par le serveur.
 *
 * Les trois voies habituelles étaient fermées. Un service externe de rendu
 * (MarkupGo) : la clé du projet est un espace réservé, personne n'a d'abonnement,
 * et ce n'est pas à nous d'en ouvrir un. Un navigateur sans interface
 * (Puppeteer) : cinquante mégaoctets de Chromium dans une fonction serverless,
 * hors de portée du plan Vercel actuel. Une bibliothèque de rendu : plusieurs
 * mégaoctets pour dessiner du texte et des traits.
 *
 * Un PDF est un format texte. Pour un document qui n'a que du texte, des
 * filets et des rectangles, l'écrire à la main tient dans un fichier, ne coûte
 * rien, et se teste. C'est ce que fait ce module ; `lib/plan-pdf.ts` s'en sert
 * pour composer le plan.
 *
 * Ce module ne connaît RIEN au programme d'entraînement : il sait poser du
 * texte à une position, mesurer sa largeur, et rendre des octets.
 */

// ------------------------------------------------------------------ pages

/** A4 en points typographiques (72 par pouce). */
export const A4 = { width: 595.28, height: 841.89 } as const;

export type FontName = "Helvetica" | "Helvetica-Bold";

/**
 * Largeurs des caractères, en millièmes de cadratin.
 *
 * Ce sont les métriques officielles des polices standard PDF, celles que tout
 * lecteur possède sans qu'on ait à embarquer de fichier. Elles servent à
 * mesurer un texte avant de l'écrire : sans elles, impossible de couper une
 * ligne au bon endroit ni d'aligner une colonne à droite.
 *
 * Les lettres accentuées ont la largeur de leur lettre de base dans ces
 * polices : « é » mesure comme « e ». Le repli les traite donc correctement
 * sans table supplémentaire.
 */
const W_REGULAR: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556,
  "@": 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584,
  " ": 278, "°": 400, "·": 278, "×": 584, "’": 191,
  "«": 556, "»": 556, "…": 1000, "€": 556, "→": 1000,
};

const W_BOLD: Record<string, number> = {
  " ": 278, "!": 333, '"': 474, "#": 556, $: 556, "%": 889, "&": 722, "'": 238,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, ":": 333, ";": 333, "<": 584, "=": 584, ">": 584, "?": 611,
  "@": 975, A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 556, K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 333, "\\": 278, "]": 333, "^": 584, _: 556, "`": 333,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278,
  k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389, s: 556, t: 333,
  u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
  "{": 389, "|": 280, "}": 389, "~": 584,
  " ": 278, "°": 400, "·": 278, "×": 584, "’": 238,
  "«": 556, "»": 556, "…": 1000, "€": 556, "→": 1000,
};

/**
 * Ramène un caractère à sa lettre de base pour la mesure et pour l'encodage.
 * « é » devient « e », « ç » devient « c ». Les accents sont ensuite rendus
 * par l'encodage WinAnsi ; cette table ne sert qu'aux caractères que WinAnsi
 * ne connaît pas et à la mesure.
 */
const BASE: Record<string, string> = {
  à: "a", â: "a", ä: "a", á: "a", ã: "a", å: "a",
  è: "e", é: "e", ê: "e", ë: "e",
  ì: "i", í: "i", î: "i", ï: "i",
  ò: "o", ó: "o", ô: "o", ö: "o", õ: "o",
  ù: "u", ú: "u", û: "u", ü: "u",
  ç: "c", ñ: "n", ý: "y", ÿ: "y",
  À: "A", Â: "A", Ä: "A", Á: "A", Ã: "A", Å: "A",
  È: "E", É: "E", Ê: "E", Ë: "E",
  Ì: "I", Í: "I", Î: "I", Ï: "I",
  Ò: "O", Ó: "O", Ô: "O", Ö: "O", Õ: "O",
  Ù: "U", Ú: "U", Û: "U", Ü: "U",
  Ç: "C", Ñ: "N",
};

/** Largeur d'un texte, en points, pour une police et un corps donnés. */
export function textWidth(text: string, size: number, font: FontName = "Helvetica"): number {
  const table = font === "Helvetica-Bold" ? W_BOLD : W_REGULAR;
  let total = 0;
  for (const ch of text) {
    const w = table[ch] ?? table[BASE[ch] ?? ""] ?? 556;
    total += w;
  }
  return (total * size) / 1000;
}

/**
 * Coupe un texte pour qu'il tienne dans une largeur, en ajoutant des points de
 * suspension. Utilisé pour les cellules de tableau, où un débordement
 * chevaucherait la colonne voisine.
 */
export function ellipsize(text: string, maxWidth: number, size: number, font: FontName = "Helvetica"): string {
  if (textWidth(text, size, font) <= maxWidth) return text;
  const chars = [...text];
  let out = "";
  for (const ch of chars) {
    if (textWidth(`${out}${ch}…`, size, font) > maxWidth) break;
    out += ch;
  }
  return `${out.trimEnd()}…`;
}

/** Découpe un texte en lignes qui tiennent dans une largeur. */
export function wrap(text: string, maxWidth: number, size: number, font: FontName = "Helvetica"): string[] {
  const lignes: string[] = [];
  for (const paragraphe of text.split("\n")) {
    let courante = "";
    for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (courante && textWidth(essai, size, font) > maxWidth) {
        lignes.push(courante);
        courante = mot;
      } else {
        courante = essai;
      }
    }
    lignes.push(courante);
  }
  return lignes.filter((l, i, a) => l !== "" || i < a.length - 1);
}

// ------------------------------------------------------------------ encodage

/**
 * Encode une chaîne pour un flux PDF, en WinAnsi (Latin-1 étendu).
 *
 * Deux dangers ici. Les parenthèses et la barre oblique inverse délimitent les
 * chaînes en PDF : non échappées, un nom d'exercice contenant « (haltères) »
 * casserait le fichier entier. Et tout caractère hors WinAnsi doit être
 * remplacé plutôt que produire un octet arbitraire.
 */
export function encodeText(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    let octet: number;
    if (ch === "’") octet = 0x92; // apostrophe typographique
    else if (ch === "…") octet = 0x85; // points de suspension
    else if (ch === "€") octet = 0x80; // euro
    else if (ch === "→") octet = 0x2d; // flèche, rendue « - » : une plage de semaines se lit mieux ainsi
    else if (code <= 0xff) octet = code;
    else {
      const base = BASE[ch];
      octet = base ? (base.codePointAt(0) ?? 63) : 63;
    }
    const c = String.fromCharCode(octet);
    if (c === "(" || c === ")" || c === "\\") out += `\\${c}`;
    else if (octet < 32) out += " ";
    else out += c;
  }
  return out;
}

// ------------------------------------------------------------------ document

interface Op {
  s: string;
}

/**
 * Une page en cours de composition. Les coordonnées PDF partent du BAS de la
 * page ; on expose un repère qui part du HAUT, comme tout le reste du code, et
 * la conversion se fait ici une fois pour toutes.
 */
export class PdfPage {
  private ops: Op[] = [];
  constructor(readonly width = A4.width, readonly height = A4.height) {}

  /** Texte, positionné par son coin haut gauche. */
  text(
    value: string,
    x: number,
    yFromTop: number,
    opts: { size?: number; font?: FontName; color?: [number, number, number] } = {},
  ): void {
    const size = opts.size ?? 10;
    const font = opts.font ?? "Helvetica";
    const [r, g, b] = opts.color ?? [0, 0, 0];
    const y = this.height - yFromTop - size;
    this.ops.push({
      s: `BT /${font === "Helvetica-Bold" ? "F2" : "F1"} ${size} Tf ${r} ${g} ${b} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${encodeText(value)}) Tj ET`,
    });
  }

  /** Filet horizontal. */
  line(x1: number, yFromTop: number, x2: number, opts: { color?: [number, number, number]; width?: number } = {}): void {
    const [r, g, b] = opts.color ?? [0.85, 0.85, 0.83];
    const y = this.height - yFromTop;
    this.ops.push({
      s: `${r} ${g} ${b} RG ${(opts.width ?? 0.6).toFixed(2)} w ${x1.toFixed(2)} ${y.toFixed(2)} m ${x2.toFixed(2)} ${y.toFixed(2)} l S`,
    });
  }

  /** Rectangle plein. */
  rect(x: number, yFromTop: number, w: number, h: number, color: [number, number, number]): void {
    const [r, g, b] = color;
    const y = this.height - yFromTop - h;
    this.ops.push({ s: `${r} ${g} ${b} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f` });
  }

  /** Rectangle vide (contour). */
  frame(x: number, yFromTop: number, w: number, h: number, color: [number, number, number] = [0.85, 0.85, 0.83]): void {
    const [r, g, b] = color;
    const y = this.height - yFromTop - h;
    this.ops.push({ s: `${r} ${g} ${b} RG 0.6 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S` });
  }

  /** Image (déclarée dans `renderPdf`), positionnée par son coin haut gauche. */
  image(name: string, x: number, yFromTop: number, w: number, h: number): void {
    const y = this.height - yFromTop - h;
    this.ops.push({ s: `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${name} Do Q` });
  }

  stream(): string {
    return this.ops.map((o) => o.s).join("\n");
  }
}

/**
 * Une image prête à entrer dans le fichier : un JPEG tel quel (le PDF le
 * décode lui-même), ou des pixels RVB déjà compressés, avec un masque alpha
 * séparé pour les PNG transparents. Voir lib/pdf-image.ts pour la préparation.
 */
export interface PdfImage {
  name: string;
  width: number;
  height: number;
  kind: "jpeg" | "rgb";
  data: Uint8Array;
  /** Canal alpha (gris 8 bits, compressé), pour `kind: "rgb"` seulement. */
  alpha?: Uint8Array;
}

/** Assemble les pages en un fichier PDF complet. */
export function renderPdf(
  pages: PdfPage[],
  meta: {
    title?: string;
    /**
     * Marque de contenu généré par IA (AI Act, article 50(2)), écrite dans le
     * dictionnaire /Info du PDF. Une phrase imprimée sur la page ne suffit pas :
     * l'obligation vise un marquage LISIBLE PAR MACHINE, qu'un outil tiers doit
     * pouvoir détecter sans lire le document.
     */
    aiMark?: string;
    /** Images référencées par les pages (`page.image(name, …)`). */
    images?: PdfImage[];
  } = {},
): Uint8Array {
  const objets: string[] = [];
  /** @returns le numéro de l'objet ajouté (les objets PDF sont numérotés à partir de 1). */
  const ajouter = (contenu: string): number => {
    objets.push(contenu);
    return objets.length;
  };

  // 1 catalogue, 2 arbre de pages : leurs numéros sont fixes, les pages y
  // renvoient et eux renvoient aux pages, d'où l'écriture en deux temps.
  ajouter("");
  ajouter("");
  const police1 = ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const police2 = ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  // Les images : un objet par image (plus un masque pour la transparence),
  // écrites en binaire dans un flux. Le fichier est assemblé en latin1, chaque
  // octet y passe tel quel.
  const bin = (u: Uint8Array) => Buffer.from(u).toString("latin1");
  const xobjects: string[] = [];
  for (const img of meta.images ?? []) {
    let smask = "";
    if (img.kind === "rgb" && img.alpha) {
      const n = ajouter(
        `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceGray ` +
          `/BitsPerComponent 8 /Filter /FlateDecode /Length ${img.alpha.length} >>\nstream\n${bin(img.alpha)}\nendstream`,
      );
      smask = ` /SMask ${n} 0 R`;
    }
    const filtre = img.kind === "jpeg" ? "/DCTDecode" : "/FlateDecode";
    const n = ajouter(
      `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter ${filtre}${smask} /Length ${img.data.length} >>\nstream\n${bin(img.data)}\nendstream`,
    );
    xobjects.push(`/${img.name} ${n} 0 R`);
  }
  const ressourcesImages = xobjects.length ? ` /XObject << ${xobjects.join(" ")} >>` : "";

  const numerosPages: number[] = [];
  for (const page of pages) {
    const flux = page.stream();
    const contenu = ajouter(`<< /Length ${Buffer.byteLength(flux, "latin1")} >>\nstream\n${flux}\nendstream`);
    numerosPages.push(
      ajouter(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width.toFixed(2)} ${page.height.toFixed(2)}] ` +
          `/Resources << /Font << /F1 ${police1} 0 R /F2 ${police2} 0 R >>${ressourcesImages} >> /Contents ${contenu} 0 R >>`,
      ),
    );
  }

  objets[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objets[1] = `<< /Type /Pages /Kids [${numerosPages.map((n) => `${n} 0 R`).join(" ")}] /Count ${numerosPages.length} >>`;

  let corps = "%PDF-1.4\n";
  const positions: number[] = [];
  objets.forEach((o, i) => {
    positions.push(Buffer.byteLength(corps, "latin1"));
    corps += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });

  const debutTable = Buffer.byteLength(corps, "latin1");
  corps += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const p of positions) corps += `${String(p).padStart(10, "0")} 00000 n \n`;
  // /Producer porte la marque IA : c'est un champ standard du dictionnaire
  // /Info, donc lu par n'importe quel outil PDF sans convention privée.
  const info = [
    meta.title ? `/Title (${encodeText(meta.title)})` : "",
    meta.aiMark ? `/Producer (${encodeText(meta.aiMark)})` : "",
  ].filter(Boolean).join(" ");
  corps +=
    `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R` +
    (info ? ` /Info << ${info} >>` : "") +
    ` >>\nstartxref\n${debutTable}\n%%EOF`;

  return new Uint8Array(Buffer.from(corps, "latin1"));
}
