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
 * Le texte que le coach peut réécrire : un objet et un corps.
 *
 * Le corps s'arrête là où commencent les obligations. La salutation, la
 * signature et le lien de désabonnement sont ajoutés à l'envoi et ne sont pas
 * modifiables : le désabonnement parce qu'un e-mail de prospection sans lien
 * de retrait n'est pas légal, la signature parce qu'un message anonyme finit
 * en indésirable.
 */
export interface FollowupCopy {
  subject: string;
  body: string;
}

/** Textes personnalisés, par étape. Une étape absente garde le texte d'origine. */
export type FollowupCopyMap = Partial<Record<number, FollowupCopy>>;

/**
 * Les jetons acceptés dans un corps réécrit.
 *
 * Trois, pas davantage : chacun correspond à une information que le coach ne
 * peut pas écrire lui-même parce qu'elle change à chaque destinataire.
 */
export const FOLLOWUP_TOKENS = ["{prenom}", "{marque}", "{lien}"] as const;

/**
 * Remplace les jetons. Un jeton inconnu est laissé tel quel plutôt qu'effacé :
 * si le coach se trompe, il doit le VOIR dans son propre e-mail de test, pas
 * découvrir un trou dans le message reçu par un prospect.
 */
export function fillTokens(text: string, ctx: FollowupContext): string {
  return text
    .replaceAll("{prenom}", ctx.firstName)
    .replaceAll("{marque}", ctx.brand)
    .replaceAll("{lien}", ctx.landingUrl);
}

/**
 * Le texte d'origine d'une étape. Volontairement court et sans mise en forme :
 * ces messages partent souvent depuis le serveur SMTP du coach, où un e-mail
 * sobre passe mieux les filtres qu'un gabarit chargé d'images.
 *
 * C'est aussi ce qui s'affiche dans l'éditeur du coach, prérempli : partir
 * d'une page blanche donne un message écrit à la va-vite ou pas de message du
 * tout.
 */
export function followupDefaultCopy(step: number, locale: Locale): FollowupCopy {
  const t = (fr: string) => translatePhrase(locale, fr);

  if (step === 1) {
    return {
      subject: t("Ta première séance s'est bien passée ?"),
      body:
        t(
          "Tu as reçu ton mini-programme il y a quelques jours. Si tu as déjà fait la première séance, le plus dur est derrière toi : c'est celle-là que la plupart des gens ne font jamais.",
        ) +
        "\n\n" +
        t(
          "Un conseil pour la suite : garde les mêmes charges cette semaine et concentre-toi sur l'exécution. La progression viendra la semaine d'après, pas maintenant.",
        ) +
        "\n\n" +
        t("Si tu bloques sur un exercice, réponds à ce message, je te donne une alternative."),
    };
  }

  if (step === 2) {
    return {
      subject: t("Et maintenant, on fait quoi ?"),
      body:
        t(
          "Ta semaine découverte est terminée. C'est le moment où tout se joue : refaire la même semaine en boucle ne mène nulle part, un corps s'adapte en quelques séances et cesse de changer.",
        ) +
        "\n\n" +
        t(
          "La suite, c'est une progression construite sur plusieurs mois, avec des charges qui montent, des séances qui évoluent et une nutrition qui suit. C'est exactement ce que je fais avec les personnes que j'accompagne.",
        ) +
        "\n\n" +
        `${t("Tu peux voir comment ça se passe ici :")} {lien}`,
    };
  }

  return {
    subject: t("Dernier message"),
    body:
      t(
        "C'est mon dernier message, promis. Si le moment n'est pas le bon, garde le mini-programme, il reste valable.",
      ) +
      "\n\n" +
      t(
        "Si en revanche tu veux un programme construit pour toi, adapté à ton matériel et suivi au quotidien, tout est expliqué ici :",
      ) +
      " {lien}" +
      "\n\n" +
      t("Dans tous les cas, bon entraînement."),
  };
}

/** Les trois textes d'origine, pour préremplir l'éditeur du coach. */
export function followupDefaultCopies(locale: Locale): FollowupCopy[] {
  return FOLLOWUP_STEPS.map((s) => followupDefaultCopy(s.step, locale));
}

/**
 * Le message final : le texte de l'étape, personnalisé ou non, encadré de ce
 * qui ne se négocie pas.
 *
 * Un objet ou un corps vide retombe sur le texte d'origine plutôt que de
 * partir vide. Un coach qui efface tout et enregistre ne doit pas envoyer une
 * coquille à ses prospects.
 */
export function followupMessage(
  step: number,
  ctx: FollowupContext,
  copies: FollowupCopyMap = {},
): FollowupMessage {
  const t = (fr: string) => translatePhrase(ctx.locale, fr);
  const parDefaut = followupDefaultCopy(step, ctx.locale);
  const perso = copies[step];

  const subject = perso?.subject?.trim() || parDefaut.subject;
  const body = perso?.body?.trim() || parDefaut.body;

  const hi = ctx.firstName ? `${t("Salut")} ${ctx.firstName},` : `${t("Salut")},`;
  const signature = `\n\n${ctx.brand}`;
  const foot = `\n\n${t("Pour ne plus recevoir ces messages :")} ${ctx.unsubscribeUrl}`;

  return {
    subject: fillTokens(subject, ctx),
    text: `${hi}\n\n${fillTokens(body, ctx)}${signature}${foot}`,
  };
}
