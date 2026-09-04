import { describe, it, expect } from "vitest";
import {
  nextFollowup,
  dueFollowups,
  followupMessage,
  firstName,
  followupDefaultCopies,
  FOLLOWUP_STEPS,
  MAX_FOLLOWUPS,
  type FollowupCandidate,
} from "./prospect-followup";

// Ces messages partent au nom du coach, vers des gens qui ne l'ont jamais
// payé. Une relance de trop et c'est sa réputation d'expéditeur qui trinque,
// pas la nôtre. Les règles d'arrêt comptent donc autant que l'envoi.

const T0 = "2026-09-01T10:00:00.000Z";
const at = (jours: number) => new Date(Date.parse(T0) + jours * 86_400_000);

function prospect(p: Partial<FollowupCandidate> = {}): FollowupCandidate {
  return {
    id: "p1",
    name: "Marie Dupont",
    email: "marie@example.com",
    createdAt: T0,
    followupSent: 0,
    followupAt: null,
    status: "nouveau",
    unsubscribedAt: null,
    ...p,
  };
}

describe("calendrier de la séquence", () => {
  it("ne relance pas le jour de la capture", () => {
    expect(nextFollowup(prospect(), at(0))).toBeNull();
    expect(nextFollowup(prospect(), at(1))).toBeNull();
  });

  it("envoie la première relance quand son délai est atteint", () => {
    const d = FOLLOWUP_STEPS[0].afterDays;
    expect(nextFollowup(prospect(), at(d - 1))).toBeNull();
    expect(nextFollowup(prospect(), at(d))?.step).toBe(1);
  });

  it("enchaîne les étapes dans l'ordre", () => {
    const p1 = prospect({ followupSent: 1, followupAt: at(3).toISOString() });
    expect(nextFollowup(p1, at(FOLLOWUP_STEPS[1].afterDays))?.step).toBe(2);
    const p2 = prospect({ followupSent: 2, followupAt: at(8).toISOString() });
    expect(nextFollowup(p2, at(FOLLOWUP_STEPS[2].afterDays))?.step).toBe(3);
  });

  it("s'arrête après la dernière étape", () => {
    expect(nextFollowup(prospect({ followupSent: MAX_FOLLOWUPS }), at(90))).toBeNull();
  });

  it("n'envoie jamais deux relances le même jour, même après une panne", () => {
    // Cron arrêté deux semaines : au redémarrage, les trois étapes sont
    // « dues ». Sans garde, la personne reçoit toute la séquence d'un coup.
    const p = prospect({ followupSent: 1, followupAt: at(20).toISOString() });
    expect(nextFollowup(p, at(20))).toBeNull();
    expect(nextFollowup(p, at(21))?.step).toBe(2);
  });
});

describe("règles d'arrêt", () => {
  it("laisse tranquille un prospect désabonné, quoi qu'il arrive", () => {
    const p = prospect({ unsubscribedAt: at(1).toISOString() });
    expect(nextFollowup(p, at(30))).toBeNull();
  });

  it("arrête de relancer un prospect devenu client", () => {
    expect(nextFollowup(prospect({ status: "converti" }), at(30))).toBeNull();
  });

  it("respecte un prospect que le coach a écarté", () => {
    expect(nextFollowup(prospect({ status: "ignoré" }), at(30))).toBeNull();
  });

  it("continue sur un prospect simplement contacté", () => {
    expect(nextFollowup(prospect({ status: "contacté" }), at(30))?.step).toBe(1);
  });
});

describe("sélection du lot", () => {
  it("ne retient que les prospects réellement dus", () => {
    const rows = [
      prospect({ id: "du" }),
      prospect({ id: "trop-tot", createdAt: at(29).toISOString() }),
      prospect({ id: "desabonne", unsubscribedAt: T0 }),
      prospect({ id: "fini", followupSent: MAX_FOLLOWUPS }),
    ];
    const dus = dueFollowups(rows, at(30));
    expect(dus.map((d) => d.prospect.id)).toEqual(["du"]);
  });
});

describe("contenu des messages", () => {
  const ctx = {
    firstName: "Marie",
    brand: "Seb Coaching",
    landingUrl: "https://seb.example/c/seb",
    unsubscribeUrl: "https://seb.example/desabonnement?t=abc",
    locale: "fr" as const,
  };

  it("porte toujours un lien de désabonnement", () => {
    for (const s of [1, 2, 3]) {
      expect(followupMessage(s, ctx).text).toContain(ctx.unsubscribeUrl);
    }
  });

  it("signe du nom de la marque du coach, jamais du nôtre", () => {
    for (const s of [1, 2, 3]) {
      const m = followupMessage(s, ctx);
      expect(m.text).toContain("Seb Coaching");
      expect(m.text).not.toContain("My Fitness App");
    }
  });

  it("ne vend rien avant la deuxième relance", () => {
    // Le premier message sert la semaine déjà reçue. Y glisser un lien de
    // vente est le meilleur moyen de faire désinscrire tout le monde.
    expect(followupMessage(1, ctx).text).not.toContain(ctx.landingUrl);
    expect(followupMessage(2, ctx).text).toContain(ctx.landingUrl);
    expect(followupMessage(3, ctx).text).toContain(ctx.landingUrl);
  });

  it("s'adresse à la personne par son prénom, et reste correct sans", () => {
    expect(followupMessage(1, ctx).text.startsWith("Salut Marie,")).toBe(true);
    const sans = followupMessage(1, { ...ctx, firstName: "" });
    expect(sans.text.startsWith("Salut,")).toBe(true);
  });

  it("annonce que le dernier message est le dernier", () => {
    expect(followupMessage(3, ctx).subject).toBe("Dernier message");
  });

  it("bascule en anglais quand c'est la langue du coach", () => {
    const en = followupMessage(1, { ...ctx, locale: "en" });
    expect(en.subject).not.toBe(followupMessage(1, ctx).subject);
  });
});

describe("prénom", () => {
  it("garde le premier mot, composé compris", () => {
    expect(firstName("Jean-Marc Dupont")).toBe("Jean-Marc");
    expect(firstName("  Marie   Curie ")).toBe("Marie");
    expect(firstName("")).toBe("");
  });
});

/**
 * Un texte réécrit par le coach ne doit ni casser le cadre légal, ni pouvoir
 * partir vide. Ces deux garanties sont ce qui rend l'éditeur sûr à ouvrir.
 */
describe("textes personnalisés", () => {
  const ctx = {
    firstName: "Léa",
    brand: "Seb Coaching",
    landingUrl: "https://exemple.fr/c/seb",
    unsubscribeUrl: "https://exemple.fr/desabonnement?t=abc",
    locale: "fr" as const,
  };

  it("emploie le texte du coach quand il en a écrit un", () => {
    const m = followupMessage(1, ctx, {
      1: { subject: "Alors, cette séance ?", body: "Dis-moi comment ça s'est passé." },
    });
    expect(m.subject).toBe("Alors, cette séance ?");
    expect(m.text).toContain("Dis-moi comment ça s'est passé.");
  });

  it("garde la signature et le désabonnement, quoi qu'écrive le coach", () => {
    // Un e-mail de prospection sans lien de retrait n'est pas légal : ce n'est
    // pas au texte du coach d'en décider.
    const m = followupMessage(2, ctx, { 2: { subject: "x", body: "y" } });
    expect(m.text).toContain("Seb Coaching");
    expect(m.text).toContain(ctx.unsubscribeUrl);
    expect(m.text.startsWith("Salut Léa,")).toBe(true);
  });

  it("retombe sur le texte d'origine plutôt que d'envoyer du vide", () => {
    const vide = followupMessage(3, ctx, { 3: { subject: "   ", body: "" } });
    const origine = followupMessage(3, ctx);
    expect(vide.subject).toBe(origine.subject);
    expect(vide.text).toBe(origine.text);
  });

  it("remplace les raccourcis, y compris dans l'objet", () => {
    const m = followupMessage(1, ctx, {
      1: { subject: "{prenom}, un mot de {marque}", body: "Tout est ici : {lien}" },
    });
    expect(m.subject).toBe("Léa, un mot de Seb Coaching");
    expect(m.text).toContain("Tout est ici : https://exemple.fr/c/seb");
  });

  it("laisse visible un raccourci mal écrit au lieu de faire un trou", () => {
    // Le coach doit voir sa faute dans son e-mail de test, pas la découvrir
    // dans le message reçu par un prospect.
    const m = followupMessage(1, ctx, { 1: { subject: "o", body: "Salut {prénom} !" } });
    expect(m.text).toContain("{prénom}");
  });

  it("donne les trois textes d'origine à l'éditeur", () => {
    const d = followupDefaultCopies("fr");
    expect(d).toHaveLength(FOLLOWUP_STEPS.length);
    for (const c of d) {
      expect(c.subject.length).toBeGreaterThan(3);
      expect(c.body.length).toBeGreaterThan(20);
      // Le cadre n'appartient pas au corps : il est ajouté à l'envoi.
      expect(c.body).not.toContain("Salut");
      expect(c.body).not.toContain("désabonnement");
    }
  });
});
