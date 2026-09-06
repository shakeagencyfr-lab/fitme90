// Les deux formules d'un plan vendu au client : Mini et Max.
//
// POURQUOI DEUX FORMULES PLUTÔT QU'UNE CASE. Le coach cochait « Coach IA
// inclus », une case déjà cochée qu'on décoche rarement. Ce détail décidait
// pourtant de tout : un plan avec le Coach IA coûte au coach à chaque échange
// de son client, un plan sans ne lui coûte que la génération du programme. La
// case laissait donc passer, par défaut, la formule la plus chère, sans que
// personne n'ait rien décidé. Il choisit maintenant, explicitement, entre :
//
//  - MINI : le programme, et c'est tout. Une seule dépense, connue d'avance,
//    au moment de la génération. C'est la formule d'un prix d'appel.
//  - MAX : le Coach IA accompagne le client pendant toute la durée. La
//    dépense suit l'usage, elle est bornée par le quota du plan. C'est la
//    formule d'un programme vendu plus cher, avec un suivi.
//
// Ce que le client reçoit dans les DEUX cas : son programme complet, sa
// nutrition, ses séances, son export PDF, les recettes, les alternatives
// d'exercice et la séance de dépannage en circuit. Tout cela est calculé,
// donc gratuit et illimité (lib/recipe-engine, lib/exercise-alternatives,
// lib/rescue-circuit). La différence porte sur ce qui appelle un modèle.
//
// Module PUR, partagé par le formulaire de création, l'éditeur de plan et
// l'affichage : une seule définition, pas trois façons de dire la même chose.

import { asLocale, pick, type LocalText } from "@/lib/i18n";
export type OfferFormula = "mini" | "max";

export const OFFER_FORMULAS: readonly OfferFormula[] = ["mini", "max"] as const;

export function isOfferFormula(v: unknown): v is OfferFormula {
  return v === "mini" || v === "max";
}

/** La formule d'un plan enregistré. Le stockage reste le booléen `coach_ai`. */
export function formulaOf(offer: { coach_ai: boolean }): OfferFormula {
  return offer.coach_ai ? "max" : "mini";
}

/** Le Coach IA est-il inclus par cette formule ? */
export function coachAiOf(formula: OfferFormula): boolean {
  return formula === "max";
}

export interface FormulaCopy {
  /** Nom court, celui de l'onglet. */
  name: string;
  /** Une ligne : ce que le coach vend. */
  tagline: string;
  /** Ce que le client reçoit en plus (Max) ou n'a pas (Mini). */
  body: string;
  /** Ce que ça coûte au coach, en une phrase. */
  cost: string;
  /** À qui ça s'adresse. */
  fit: string;
}

const COPY: LocalText<Record<OfferFormula, FormulaCopy>> = {
  fr: {
    mini: {
      name: "Mini",
      tagline: "Le programme, et c'est tout",
      body: "Le client reçoit son programme complet, sa nutrition jour par jour, ses séances, son export PDF, les recettes, les alternatives d'exercice et la séance de dépannage. Il n'a PAS le Coach IA : ni questions à toute heure, ni photo d'aliments analysée, ni adaptation en cours de route.",
      cost: "Ce plan ne te coûte que la génération du programme, une fois. Rien après, quoi que fasse le client.",
      fit: "Idéal pour un prix d'appel, un premier programme, un volume important de clients.",
    },
    max: {
      name: "Max",
      tagline: "Le programme et le Coach IA pendant toute la durée",
      body: "Tout ce que contient Mini, plus le Coach IA : le client pose ses questions à toute heure, fait adapter ses séances (blessure, matériel manquant, emploi du temps), prend ses aliments en photo pour une recette, et reçoit des propositions de charges à partir de ce qu'il a réellement soulevé.",
      cost: "Chaque échange avec le Coach IA t'est débité. Tu règles ci-dessous combien tu en inclus par jour et par client : c'est ce réglage qui borne ta dépense.",
      fit: "Idéal pour un programme vendu plus cher et un suivi VIP.",
    },
  },
  en: {
    mini: {
      name: "Mini",
      tagline: "The program, and nothing else",
      body: "The client gets their full program, day-by-day nutrition, workouts, PDF export, recipes, exercise alternatives and the backup workout. They do NOT get the AI Coach: no questions around the clock, no food photo analysis, no mid-program adaptation.",
      cost: "This plan only costs you the program generation, once. Nothing after that, whatever the client does.",
      fit: "Ideal for an entry price, a first program, a large number of clients.",
    },
    max: {
      name: "Max",
      tagline: "The program and the AI Coach for the whole duration",
      body: "Everything in Mini, plus the AI Coach: the client asks questions around the clock, has workouts adapted (injury, missing equipment, schedule), photographs their food for a recipe, and gets load suggestions from what they actually lifted.",
      cost: "Every exchange with the AI Coach is billed to you. You set below how many you include per day and per client: that setting is what caps your spending.",
      fit: "Ideal for a program sold at a higher price with VIP follow-up.",
    },
  },
};

export function formulaCopy(formula: OfferFormula, locale: string): FormulaCopy {
  return pick(COPY, asLocale(locale))[formula];
}
