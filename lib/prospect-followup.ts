import { translatePhrase, type Locale } from "@/lib/i18n";

/**
 * Relances des prospects du lead magnet.
 *
 * Le mini-programme gratuit capte une adresse, puis plus rien : le prospect
 * repart avec son PDF et le coach ne le recontacte jamais. Trois messages
 * espacés valent mieux qu'un rappel manuel qui n'a jamais lieu.
 *
 * Le ton compte autant que le calendrier. Les deux premiers messages n'ont
 * rien à vendre : ils servent la semaine que la personne a déjà entre les
 * mains. Seul le dernier propose un programme, et il dit clairement que c'est
 * le dernier. Une séquence qui pousse dès le premier jour fait désinscrire.
 *
 * Ce module ne connaît ni la base ni le service d'envoi : il décide QUI
 * relancer et QUOI écrire. L'envoi vit dans `prospect-followup-send`.
 */

/** Une étape de la séquence. */
export interface FollowupStep {
  /** Rang, à partir de 1. Correspond à `prospects.followup_sent` + 1. */
  step: number;
  /** Jours écoulés depuis la capture avant l'envoi. */
  afterDays: number;
}

export const FOLLOWUP_STEPS: readonly FollowupStep[] = [
  // Assez tôt pour que la première séance soit encore fraîche, assez tard
  // pour que la personne ait eu le temps de s'y mettre.
  { step: 1, afterDays: 3 },
  // La semaine offerte est finie : c'est le moment où la question « et
  // après ? » se pose d'elle-même.
  { step: 2, afterDays: 8 },
  // Dernier message, et il le dit.
  { step: 3, afterDays: 17 },
] as const;

export const MAX_FOLLOWUPS = FOLLOWUP_STEPS.length;

/** État d'un prospect vu par le planificateur. */
export interface FollowupCandidate {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  followupSent: number;
  followupAt: string | null;
  status: string;
  unsubscribedAt: string | null;
}

/** Écart en jours entiers entre deux instants. */
function daysBetween(from: string, to: Date): number {
  return Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000);
}

/**
 * La prochaine relance due pour ce prospect, ou `null`.
 *
 * On s'arrête dans quatre cas : le prospect s'est désabonné, le coach l'a
 * marqué converti ou ignoré, la séquence est terminée, ou l'étape n'est pas
 * encore due. Un délai minimal entre deux envois évite qu'un rattrapage après
 * une panne n'expédie toute la séquence dans la même heure.
 */
export function nextFollowup(p: FollowupCandidate, now: Date = new Date()): FollowupStep | null {
  if (p.unsubscribedAt) return null;
  if (p.status === "converti" || p.status === "ignoré") return null;
  if (p.followupSent >= MAX_FOLLOWUPS) return null;

  const step = FOLLOWUP_STEPS[p.followupSent];
  if (!step) return null;
  if (daysBetween(p.createdAt, now) < step.afterDays) return null;
  // Deux relances ne partent jamais le même jour, même si le cron a du retard.
  if (p.followupAt && daysBetween(p.followupAt, now) < 1) return null;
  return step;
}

/** Les prospects à relancer maintenant, avec l'étape due pour chacun. */
export function dueFollowups(
  rows: readonly FollowupCandidate[],
  now: Date = new Date(),
): { prospect: FollowupCandidate; step: FollowupStep }[] {
  const out: { prospect: FollowupCandidate; step: FollowupStep }[] = [];
  for (const p of rows) {
    const step = nextFollowup(p, now);
    if (step) out.push({ prospect: p, step });
  }
  return out;
}

export interface FollowupMessage {
  subject: string;
  text: string;
}

export interface FollowupContext {
  firstName: string;
  /** Nom de la marque du coach ou de la salle. */
  brand: string;
  /** Adresse publique de la page du coach. */
  landingUrl: string;
  /** Lien de désabonnement, obligatoire dans chaque message. */
  unsubscribeUrl: string;
  locale: Locale;
}

/** Premier prénom, propre : « Jean-Marc Dupont » devient « Jean-Marc ». */
export function firstName(full: string): string {
  return (full ?? "").trim().split(/\s+/)[0] ?? "";
}

/**
 * Le texte d'une étape. Volontairement court et sans mise en forme : ces
 * messages partent souvent depuis le serveur SMTP du coach, où un e-mail
 * sobre passe mieux les filtres qu'un gabarit chargé d'images.
 */
export function followupMessage(step: number, ctx: FollowupContext): FollowupMessage {
  const t = (fr: string) => translatePhrase(ctx.locale, fr);
  const hi = ctx.firstName ? `${t("Salut")} ${ctx.firstName},` : `${t("Salut")},`;
  const signature = `\n\n${ctx.brand}`;
  const foot = `\n\n${t("Pour ne plus recevoir ces messages :")} ${ctx.unsubscribeUrl}`;

  if (step === 1) {
    return {
      subject: t("Ta première séance s'est bien passée ?"),
      text:
        `${hi}\n\n` +
        t(
          "Tu as reçu ton mini-programme il y a quelques jours. Si tu as déjà fait la première séance, le plus dur est derrière toi : c'est celle-là que la plupart des gens ne font jamais.",
        ) +
        "\n\n" +
        t(
          "Un conseil pour la suite : garde les mêmes charges cette semaine et concentre-toi sur l'exécution. La progression viendra la semaine d'après, pas maintenant.",
        ) +
        "\n\n" +
        t("Si tu bloques sur un exercice, réponds à ce message, je te donne une alternative.") +
        signature +
        foot,
    };
  }

  if (step === 2) {
    return {
      subject: t("Et maintenant, on fait quoi ?"),
      text:
        `${hi}\n\n` +
        t(
          "Ta semaine découverte est terminée. C'est le moment où tout se joue : refaire la même semaine en boucle ne mène nulle part, un corps s'adapte en quelques séances et cesse de changer.",
        ) +
        "\n\n" +
        t(
          "La suite, c'est une progression construite sur plusieurs mois, avec des charges qui montent, des séances qui évoluent et une nutrition qui suit. C'est exactement ce que je fais avec les personnes que j'accompagne.",
        ) +
        "\n\n" +
        `${t("Tu peux voir comment ça se passe ici :")} ${ctx.landingUrl}` +
        signature +
        foot,
    };
  }

  return {
    subject: t("Dernier message"),
    text:
      `${hi}\n\n` +
      t(
        "C'est mon dernier message, promis. Si le moment n'est pas le bon, garde le mini-programme, il reste valable.",
      ) +
      "\n\n" +
      t(
        "Si en revanche tu veux un programme construit pour toi, adapté à ton matériel et suivi au quotidien, tout est expliqué ici :",
      ) +
      ` ${ctx.landingUrl}` +
      "\n\n" +
      t("Dans tous les cas, bon entraînement.") +
      signature +
      foot,
  };
}
