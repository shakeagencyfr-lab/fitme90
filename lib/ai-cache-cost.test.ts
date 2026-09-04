import { describe, it, expect } from "vitest";
import { costParts, rowCost, type CostRow } from "./ai-cost";

/**
 * Coût du cache de prompt, selon sa durée.
 *
 * Le cache court (5 min) et le cache long (1 h) ne coûtent pas la même chose :
 * 125 % d'un token d'entrée contre 200 %. Les confondre sous-estimerait la
 * facture, et c'est cette estimation qui sert de base au prix d'un crédit
 * revendu. Une erreur ici se propage directement dans la marge.
 */

function row(p: Partial<CostRow> = {}): CostRow {
  return {
    user_id: "u1",
    route: "coach",
    model: "claude-haiku-4-5",
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    ...p,
  };
}

// Haiku 4.5 : 1 $ le million en entrée. Un million de tokens sert d'unité
// commode pour lire les résultats sans virgule flottante illisible.
const M = 1_000_000;

describe("tarifs du cache", () => {
  it("facture une lecture 10 % d'un token d'entrée", () => {
    expect(rowCost(row({ cache_read_tokens: M }))).toBeCloseTo(0.1, 6);
  });

  it("facture une écriture courte 125 %", () => {
    expect(rowCost(row({ cache_write_tokens: M }))).toBeCloseTo(1.25, 6);
  });

  it("facture une écriture longue 200 %", () => {
    expect(rowCost(row({ cache_write_1h_tokens: M }))).toBeCloseTo(2, 6);
  });

  it("additionne les deux durées quand elles coexistent", () => {
    // Un même appel peut écrire dans les deux caches : plusieurs points de
    // reprise, des durées différentes.
    expect(rowCost(row({ cache_write_tokens: M, cache_write_1h_tokens: M }))).toBeCloseTo(3.25, 6);
  });

  it("laisse justes les lignes antérieures, qui n'ont pas la colonne", () => {
    // Toutes les écritures d'avant le passage au cache long étaient courtes :
    // une colonne absente ne doit rien ajouter.
    const ancienne = row({ cache_write_tokens: M });
    delete (ancienne as { cache_write_1h_tokens?: unknown }).cache_write_1h_tokens;
    expect(rowCost(ancienne)).toBeCloseTo(1.25, 6);
  });
});

describe("économie réelle du cache long", () => {
  // Mesures relevées sur la route coach en Haiku : le préfixe mis en cache
  // pèse environ 6 400 tokens, le reste de l'entrée environ 2 000, la réponse
  // environ 190.
  const PREFIXE = 6_400;
  const SORTIE = 190;

  const premierMessage = (ttl: "5m" | "1h") =>
    rowCost(
      row({
        [ttl === "1h" ? "cache_write_1h_tokens" : "cache_write_tokens"]: PREFIXE + (ttl === "1h" ? 1_900 : 0),
        input_tokens: ttl === "1h" ? 60 : 2_000,
        output_tokens: SORTIE,
      }),
    );

  const messageSuivant = (ttl: "5m" | "1h") =>
    rowCost(
      row({
        cache_read_tokens: PREFIXE + (ttl === "1h" ? 1_900 : 0),
        input_tokens: ttl === "1h" ? 250 : 2_100,
        output_tokens: SORTIE,
      }),
    );

  it("rend le premier message plus cher, et les suivants bien moins", () => {
    expect(premierMessage("1h")).toBeGreaterThan(premierMessage("5m"));
    expect(messageSuivant("1h")).toBeLessThan(messageSuivant("5m"));
  });

  it("devient gagnant dès le deuxième message quand le cache court a expiré", () => {
    // Cas réaliste d'une conversation : le client réfléchit entre deux
    // messages, donc plus de cinq minutes s'écoulent et l'ancien cache
    // expirait, faisant repayer l'écriture à chaque tour.
    for (const n of [2, 4, 8]) {
      const avant = n * premierMessage("5m");
      const apres = premierMessage("1h") + (n - 1) * messageSuivant("1h");
      expect(apres, `${n} messages`).toBeLessThan(avant);
    }
  });

  it("tient la base de 0,0055 euro par message dès quatre messages", () => {
    // C'est la base de coût d'un crédit revendu : elle doit être tenue par la
    // moyenne d'une session, pas par le meilleur des cas.
    const eur = (usd: number) => usd * 0.92;
    const moyenne = (n: number) =>
      eur(premierMessage("1h") + (n - 1) * messageSuivant("1h")) / n;
    expect(moyenne(1)).toBeGreaterThan(0.0055); // un message isolé reste cher
    expect(moyenne(4)).toBeLessThan(0.0055);
    expect(moyenne(8)).toBeLessThan(0.0045);
  });
});

describe("détail du coût", () => {
  it("sépare les postes pour qu'on voie d'où vient la facture", () => {
    const p = costParts(row({ input_tokens: M, output_tokens: M, cache_read_tokens: M, cache_write_1h_tokens: M }));
    expect(p.input).toBeCloseTo(1, 6);
    expect(p.output).toBeCloseTo(5, 6);
    expect(p.cacheRead).toBeCloseTo(0.1, 6);
    expect(p.cacheWrite).toBeCloseTo(2, 6);
    expect(p.total).toBeCloseTo(8.1, 6);
  });
});
