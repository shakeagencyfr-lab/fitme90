import { describe, it, expect } from "vitest";
import { renderMemory, MAX_NOTES, MAX_NOTE_CHARS, MAX_DIGEST_CHARS } from "./coach-memory";

describe("renderMemory", () => {
  it("ne rend rien quand la mémoire est vide, pour ne pas alourdir le préfixe caché", () => {
    expect(renderMemory({ notes: [], digest: "", digestThrough: null })).toBe("");
    expect(renderMemory({ notes: [], digest: "   ", digestThrough: null })).toBe("");
  });

  it("rend les notes durables", () => {
    const out = renderMemory({
      notes: ["préfère s'entraîner le matin", "déteste les burpees"],
      digest: "",
      digestThrough: null,
    });
    expect(out).toContain("préfère s'entraîner le matin");
    expect(out).toContain("déteste les burpees");
  });

  it("rend le résumé cumulatif seul si aucune note", () => {
    const out = renderMemory({ notes: [], digest: "Part en déplacement en octobre.", digestThrough: null });
    expect(out).toContain("Part en déplacement en octobre.");
    expect(out).toContain("MÉMOIRE DU CLIENT");
  });

  it("combine notes et résumé", () => {
    const out = renderMemory({ notes: ["aime la course"], digest: "Progresse régulièrement.", digestThrough: null });
    expect(out).toContain("aime la course");
    expect(out).toContain("Progresse régulièrement.");
  });

  it("reste borné : le pire cas tient dans quelques centaines de tokens", () => {
    const notes = Array.from({ length: MAX_NOTES }, () => "x".repeat(MAX_NOTE_CHARS));
    const out = renderMemory({ notes, digest: "y".repeat(MAX_DIGEST_CHARS), digestThrough: null });
    // Plafonds : 40 notes de 200 caractères + un résumé de 1000, plus l'entête.
    expect(out.length).toBeLessThan(MAX_NOTES * (MAX_NOTE_CHARS + 4) + MAX_DIGEST_CHARS + 300);
  });
});
