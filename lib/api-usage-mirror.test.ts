import { describe, it, expect } from "vitest";
import { usageOf, apiCallOf } from "./anthropic";
import type Anthropic from "@anthropic-ai/sdk";

// Ces tests verrouillent le point où le journal peut redevenir un à-peu-près.
// Chaque appelant recopiait auparavant les champs d'`usage` à la main, et
// chacun en oubliait : le journal affichait un dixième de la facture réelle sur
// un message à gros cache. Un seul extracteur, testé une fois.

function msg(usage: Partial<Anthropic.Usage>): Anthropic.Message {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5-20251001",
    content: [],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      ...usage,
    } as Anthropic.Usage,
  } as unknown as Anthropic.Message;
}

describe("usageOf : la consommation telle que l'API la facture", () => {
  it("lit les cinq seaux", () => {
    expect(
      usageOf(
        msg({
          input_tokens: 120,
          output_tokens: 340,
          cache_read_input_tokens: 5000,
          cache_creation: { ephemeral_5m_input_tokens: 800, ephemeral_1h_input_tokens: 200 },
        }),
      ),
    ).toEqual({
      input_tokens: 120,
      output_tokens: 340,
      cache_read_tokens: 5000,
      cache_write_tokens: 800,
      cache_write_1h_tokens: 200,
    });
  });

  it("ne compte pas deux fois les écritures de cache", () => {
    // `cache_creation` DÉTAILLE `cache_creation_input_tokens` par durée, il ne
    // s'y ajoute pas. Additionner les deux gonflerait la facture affichée de
    // 100 % sur toute conversation qui écrit du cache.
    const u = usageOf(
      msg({
        cache_creation_input_tokens: 1000,
        cache_creation: { ephemeral_5m_input_tokens: 600, ephemeral_1h_input_tokens: 400 },
      }),
    );
    expect(u.cache_write_tokens).toBe(600);
    expect(u.cache_write_1h_tokens).toBe(400);
  });

  it("retombe sur le champ historique quand le détail par durée est absent", () => {
    const u = usageOf(msg({ cache_creation_input_tokens: 1000 }));
    expect(u.cache_write_tokens).toBe(1000);
    expect(u.cache_write_1h_tokens).toBe(0);
  });

  it("traite les champs absents comme zéro, jamais comme NaN", () => {
    expect(usageOf(msg({}))).toEqual({
      input_tokens: 0,
      output_tokens: 0,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      cache_write_1h_tokens: 0,
    });
  });
});

describe("apiCallOf : ce qui rend une ligne vérifiable", () => {
  it("retient le modèle SERVI, pas celui demandé", () => {
    // On demande « claude-haiku-4-5 », l'API sert une version datée, et c'est
    // elle qui figure sur la facture. Le journal doit porter la même.
    expect(apiCallOf(msg({})).model).toBe("claude-haiku-4-5-20251001");
  });

  it("prend l'identifiant posé par le SDK sur la réponse", () => {
    const m = Object.assign(msg({}), { _request_id: "req_abc" });
    expect(apiCallOf(m).requestId).toBe("req_abc");
  });

  it("accepte l'identifiant du flux, seul endroit où il vit en streaming", () => {
    expect(apiCallOf(msg({}), "req_stream").requestId).toBe("req_stream");
  });

  it("n'invente pas d'identifiant quand il n'y en a pas", () => {
    expect(apiCallOf(msg({})).requestId).toBeNull();
  });
});
