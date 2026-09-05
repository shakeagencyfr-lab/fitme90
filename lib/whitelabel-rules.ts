/**
 * Les règles du pack marque blanche, sans base ni Stripe : ce qui se décide à
 * partir de faits déjà lus. Testable à sec, et c'est le point : la marque
 * blanche se monétise, une faille ici se vend gratuitement.
 */

/** Comment ce compte a obtenu le pack (ou pourquoi il ne l'a pas). */
export type WhitelabelSource =
  /** Plateforme, revendeur, ou coach sans revendeur : rien à débloquer. */
  | "own"
  /** Le palier courant (gratuit ou payant) inclut le pack. */
  | "plan"
  /** Le coach a souscrit le pack à part, chez son revendeur. */
  | "addon"
  /** Le revendeur vend le pack à part, le coach ne l'a pas pris. */
  | "offered"
  /** Le revendeur ne propose pas le pack à ce compte. */
  | "closed";

export interface WhitelabelAccess {
  allowed: boolean;
  source: WhitelabelSource;
  /** Prix mensuel du pack chez le revendeur (centimes), ou null. */
  priceCents: number | null;
  /** Statut Stripe de l'abonnement au pack, quand il y en a un. */
  subStatus: string | null;
  /** Le coach a coché « retirer le badge ». Sans effet sans le pack. */
  hidePoweredBy: boolean;
}

/** Ce qu'on sait d'un compte au moment de décider. */
export interface WhitelabelFacts {
  kind: string | null;
  parentId: string | null;
  /** Abonnement au pack ouvert (et relu par le cron). */
  addonEnabled: boolean;
  /** Le palier courant inclut le pack. */
  planIncluded: boolean;
  /** Prix auquel le revendeur vend le pack à part, ou null. */
  priceCents: number | null;
  subStatus: string | null;
  hidePoweredBy: boolean;
}

/**
 * La décision, dans l'ordre des portes.
 *
 * Plateforme et revendeurs ont le pack d'office : la promesse faite au
 * revendeur est la marque blanche complète dès son premier jour. Un coach sans
 * parent aussi : personne ne peut lui fermer quoi que ce soit. Pour les
 * autres, le pack payé passe avant le palier, et l'absence de prix chez le
 * revendeur FERME le pack : un prix non renseigné n'a jamais voulu dire
 * « offert ».
 */
export function resolveWhitelabel(f: WhitelabelFacts): WhitelabelAccess {
  const base = { subStatus: f.subStatus, hidePoweredBy: f.hidePoweredBy };
  if (f.kind === "platform" || f.kind === "reseller" || !f.parentId) {
    return { allowed: true, source: "own", priceCents: null, ...base };
  }
  if (f.addonEnabled) return { allowed: true, source: "addon", priceCents: null, ...base };
  if (f.planIncluded) return { allowed: true, source: "plan", priceCents: null, ...base };
  const price = f.priceCents != null && f.priceCents > 0 ? f.priceCents : null;
  return { allowed: false, source: price != null ? "offered" : "closed", priceCents: price, ...base };
}

/** Le badge « Propulsé par » disparaît seulement avec le pack ET la case cochée. */
export function poweredByHiddenFor(a: WhitelabelAccess): boolean {
  return a.allowed && a.hidePoweredBy;
}

const ACTIVE = new Set(["active", "trialing"]);

/**
 * Un abonnement Stripe au pack vaut-il encore accès ?
 *
 * Résilié en fin de période : le coach a payé jusque-là, il garde le pack
 * jusque-là (`cancelAt` en secondes Unix, comme Stripe l'écrit). Impayé,
 * résilié dans le passé, incomplet : fermé.
 */
export function whitelabelSubActive(status: string, cancelAt: number | null, now = Date.now()): boolean {
  if (ACTIVE.has(status)) return true;
  if (status === "canceled" && cancelAt != null && cancelAt * 1000 > now) return true;
  return false;
}
