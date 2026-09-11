import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONSENT_EXPLAINER,
  CONSENT_LABEL,
  CONSENT_TEXT_VERSION,
  LEGAL_BASIS_LABEL,
  MIN_AGE,
  PERSONAL_TABLES,
  SUBPROCESSORS,
  WITHDRAWABLE,
  WITHDRAWAL_EFFECT,
  type ConsentKind,
} from "./gdpr";

// Le garde-fou du registre.
//
// Ce fichier relit le schéma SQL et refuse qu'une table de données
// personnelles existe sans être déclarée dans lib/gdpr.ts. C'est le seul
// moyen tenable : l'export, la politique de confidentialité et le registre de
// l'article 30 dérivent tous du même tableau, donc le tableau doit être à
// jour, et personne ne pense à le mettre à jour six mois plus tard.

const SQL = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");

/** Chaque `create table`, avec le nom et le corps de la définition. */
function tablesDuSchema(): { name: string; cols: Set<string> }[] {
  const out: { name: string; cols: Set<string> }[] = [];
  const re = /create table (?:if not exists )?(?:public\.)?([a-z_0-9]+)\s*\(([\s\S]*?)\n\);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(SQL))) {
    const cols = new Set<string>();
    for (const l of m[2].split("\n")) {
      const c = /^\s{2}([a-z_0-9]+)\s/.exec(l);
      if (c) cols.add(c[1]);
    }
    out.push({ name: m[1], cols });
  }
  return out;
}

/**
 * Les tables qui ne désignent personne, malgré une colonne au nom trompeur.
 *
 * Chaque exception est justifiée ici, pour qu'on ne puisse pas en ajouter une
 * sans écrire pourquoi.
 */
const HORS_REGISTRE: Record<string, string> = {
  // Journal de qui est entré en assistance chez qui : ce sont les données du
  // PROFESSIONNEL qui accède, pas un dossier client. Conservé 12 mois et
  // supprimé en cascade avec l'un ou l'autre des comptes.
  support_access_log: "Traçabilité des accès en assistance, supprimée en cascade avec les comptes concernés.",
};

describe("registre des données personnelles", () => {
  const schema = tablesDuSchema();

  it("relit bien le schéma", () => {
    expect(schema.length).toBeGreaterThan(30);
    expect(schema.map((t) => t.name)).toContain("profiles");
  });

  it("déclare toutes les tables qui rattachent une ligne à une personne", () => {
    const declarees = new Set(PERSONAL_TABLES.map((t) => t.table));
    const oubliees = schema
      .filter((t) => t.cols.has("user_id") || t.cols.has("client_id"))
      .map((t) => t.name)
      .filter((n) => !declarees.has(n) && !(n in HORS_REGISTRE));
    // Si ce test casse, une table de données personnelles vient d'apparaître :
    // ajoute-la à PERSONAL_TABLES (elle entrera dans l'export), ou explique
    // dans HORS_REGISTRE pourquoi elle ne désigne personne.
    expect(oubliees).toEqual([]);
  });

  it("ne déclare que des tables qui existent, sur une colonne qui existe", () => {
    const parNom = new Map(schema.map((t) => [t.name, t.cols]));
    const fantomes: string[] = [];
    for (const t of PERSONAL_TABLES) {
      const cols = parNom.get(t.table);
      // `consents` arrive avec sa migration : tant qu'elle n'est pas dans le
      // schéma, on ne fait pas échouer le test pour autant.
      if (!cols) {
        if (t.table !== "consents") fantomes.push(`${t.table} (table absente du schéma)`);
        continue;
      }
      if (!cols.has(t.column)) fantomes.push(`${t.table}.${t.column} (colonne absente)`);
    }
    expect(fantomes).toEqual([]);
  });

  it("donne à chaque table une finalité, une base légale et une durée", () => {
    for (const t of PERSONAL_TABLES) {
      expect(t.purpose.length, t.table).toBeGreaterThan(20);
      expect(LEGAL_BASIS_LABEL[t.basis], t.table).toBeTruthy();
      expect(t.retention.length, t.table).toBeGreaterThan(15);
    }
  });

  it("ne déclare pas deux fois la même table", () => {
    const noms = PERSONAL_TABLES.map((t) => t.table);
    expect(noms).toHaveLength(new Set(noms).size);
  });

  it("appuie toute donnée de santé sur un consentement explicite ou le contrat", () => {
    // L'article 9 interdit le traitement des données de santé sauf exception.
    // Chez nous, l'exception est le consentement explicite ; le programme et
    // les échanges avec le coach en découlent et reposent sur le contrat.
    for (const t of PERSONAL_TABLES.filter((x) => x.health)) {
      expect(["consentement-sante", "contrat"], t.table).toContain(t.basis);
    }
  });

  it("nomme un sous-traitant hors UE avec sa garantie de transfert", () => {
    for (const s of SUBPROCESSORS) {
      expect(s.role.length, s.name).toBeGreaterThan(10);
      if (/États-Unis/.test(s.region)) {
        expect(s.transfer, `${s.name} traite hors UE sans garantie déclarée`).toBeTruthy();
      }
    }
  });

  it("date la version des textes soumis au consentement", () => {
    expect(CONSENT_TEXT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Object.keys(CONSENT_LABEL).length).toBeGreaterThanOrEqual(4);
  });

  it("retient l'âge minimum français de l'article 8", () => {
    expect(MIN_AGE).toBe(15);
  });

  it("n'écrit aucun tiret cadratin dans les textes vus par le client", () => {
    const textes = [
      ...PERSONAL_TABLES.flatMap((t) => [t.purpose, t.retention]),
      ...SUBPROCESSORS.flatMap((s) => [s.role, s.region, s.transfer ?? ""]),
      ...Object.values(CONSENT_LABEL),
      ...Object.values(LEGAL_BASIS_LABEL),
    ];
    expect(textes.filter((t) => t.includes("—"))).toEqual([]);
  });
});

describe("consentements", () => {
  it("chaque type d'accord a un intitulé et une explication", () => {
    for (const kind of Object.keys(CONSENT_LABEL) as ConsentKind[]) {
      expect(CONSENT_LABEL[kind].length, kind).toBeGreaterThan(5);
      // Une explication d'une ligne ne vaut rien : l'article 13 demande des
      // termes clairs, pas un synonyme de l'intitulé.
      expect(CONSENT_EXPLAINER[kind].length, kind).toBeGreaterThan(40);
    }
  });

  it("tout accord retirable dit ce que le retrait interrompt", () => {
    // Un bouton « retirer » sans conséquence annoncée est un piège : la
    // personne découvre après coup que son programme s'est arrêté.
    for (const kind of WITHDRAWABLE) {
      expect(WITHDRAWAL_EFFECT[kind], kind).toBeTruthy();
      expect(String(WITHDRAWAL_EFFECT[kind]).length, kind).toBeGreaterThan(40);
    }
  });

  it("les contrats ne sont pas présentés comme retirables", () => {
    // Les CGV et l'accord de sous-traitance sont la base du service : on en
    // sort en résiliant, pas en décochant. La politique de confidentialité,
    // elle, n'est pas un consentement du tout.
    expect(WITHDRAWABLE).not.toContain("cgv");
    expect(WITHDRAWABLE).not.toContain("sous-traitance");
    expect(WITHDRAWABLE).not.toContain("confidentialite");
  });

  it("le schéma accepte exactement les types déclarés dans le code", () => {
    // Un type ajouté ici mais refusé par la contrainte SQL ferait échouer
    // l'écriture en silence, et la preuve du consentement n'existerait pas.
    const sql = readFileSync(join(__dirname, "..", "supabase", "schema.sql"), "utf8");
    const m = sql.match(/consents_kind_check check \(kind in \(([^)]+)\)\)/);
    expect(m, "contrainte consents_kind_check introuvable dans le schéma").toBeTruthy();
    const autorises = (m?.[1] ?? "").split(",").map((v) => v.trim().replace(/'/g, ""));
    expect(autorises.sort()).toEqual((Object.keys(CONSENT_LABEL) as string[]).sort());
  });
});
