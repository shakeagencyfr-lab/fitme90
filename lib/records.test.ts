import { describe, it, expect } from "vitest";
import { personalRecords, epley1rm } from "./records";

describe("epley1rm", () => {
  it("estime le 1RM (Epley)", () => {
    expect(Math.round(epley1rm(100, 1))).toBe(103); // 100 x (1+1/30)
    expect(Math.round(epley1rm(70, 6))).toBe(84); // 70 x 1.2
    expect(epley1rm(0, 5)).toBe(0);
  });
});

describe("personalRecords", () => {
  it("retient la charge max et les reps à cette charge", () => {
    const recs = personalRecords([
      { exercise: "Développé couché", kg: 60, reps: 10 },
      { exercise: "Développé couché", kg: 70, reps: 6 },
      { exercise: "Développé couché", kg: 70, reps: 8 }, // même charge, plus de reps
      { exercise: "Squat", kg: 100, reps: 5 },
    ]);
    const dc = recs.find((r) => r.exercise === "Développé couché")!;
    expect(dc.kg).toBe(70);
    expect(dc.reps).toBe(8);
    const squat = recs.find((r) => r.exercise === "Squat")!;
    expect(squat.kg).toBe(100);
  });

  it("exclut le cardio et les entrées sans charge", () => {
    const recs = personalRecords([
      { exercise: "Rameur", kg: null, reps: null, cardio: true },
      { exercise: "Gainage", kg: 0, reps: 60 },
      { exercise: "Tractions", kg: null, reps: 8 },
      { exercise: "Curl", kg: 15, reps: 12 },
    ]);
    expect(recs.map((r) => r.exercise)).toEqual(["Curl"]);
  });

  it("trie par 1RM estimé décroissant", () => {
    const recs = personalRecords([
      { exercise: "Curl", kg: 20, reps: 10 },
      { exercise: "Squat", kg: 100, reps: 5 },
    ]);
    expect(recs[0].exercise).toBe("Squat");
  });
});
