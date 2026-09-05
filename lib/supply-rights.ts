/**
 * CE QU'UN REVENDEUR A LE DROIT DE PROPOSER À SES COACHS, ET CE QUI EN DÉCOULE.
 *
 * La plateforme ouvre deux droits sur le palier qu'elle vend à un revendeur :
 * laisser ses coachs en clé personnelle (BYOK), et leur fournir l'IA pour la
 * leur revendre en crédits. Ces deux cases décident de TOUT ce que le
 * revendeur peut faire ensuite : les fournitures qu'il pose sur ses propres
 * paliers, son palier gratuit compris, son mode de fourniture, et jusqu'à ce
 * qu'il voit dans son tableau de bord.
 *
 *   BYOK seul      : ses coachs branchent chacun leur clé. Il ne fournit pas
 *                    l'IA, ne revend rien, et ne voit rien des crédits.
 *   crédits seuls  : ses coachs tournent sur son IA. Un palier en clé
 *                    personnelle n'existe pas chez lui.
 *   les deux       : il choisit, palier par palier.
 *
 * Un droit retiré s'applique tout de suite, paliers existants compris : une
 * case décochée par la plateforme n'est pas un souhait, c'est le contrat.
 *
 * Pur : les appelants apportent les droits, ce module rend la règle. La
 * plateforme et un coach n'ont pas de restriction (la question ne se pose
 * qu'à l'étage revendeur), d'où ALL_RIGHTS.
 */

/** Comment l'acheteur d'un palier obtient son IA. */
export type PlanAiSupply = "byok" | "credits";

export interface SupplyRights {
  /** Peut laisser ses coachs en clé personnelle (BYOK). */
  byok: boolean;
  /** Peut fournir l'IA à ses coachs et la leur revendre en crédits. */
  credits: boolean;
}

export const ALL_RIGHTS: SupplyRights = { byok: true, credits: true };

/**
 * Les fournitures qu'un vendeur peut poser sur ses paliers, dans l'ordre où on
 * les présente. Sans aucun droit (impossible par construction : la plateforme
 * ne peut pas vendre un palier qui n'ouvre rien), on rend la clé personnelle
 * plutôt qu'une liste vide qui ferait planter un formulaire.
 */
export function allowedSupplies(r: SupplyRights): PlanAiSupply[] {
  const out: PlanAiSupply[] = [];
  if (r.byok) out.push("byok");
  if (r.credits) out.push("credits");
  return out.length ? out : ["byok"];
}

export function supplyAllowed(r: SupplyRights, supply: PlanAiSupply): boolean {
  return allowedSupplies(r).includes(supply);
}

/** Le vendeur a-t-il un choix à faire, ou la fourniture lui est-elle imposée ? */
export function supplyIsChoice(r: SupplyRights): boolean {
  return allowedSupplies(r).length > 1;
}

/** La fourniture à retenir : celle voulue si elle est permise, sinon la seule permise. */
export function resolveSupply(r: SupplyRights, wanted: PlanAiSupply): PlanAiSupply {
  const ok = allowedSupplies(r);
  return ok.includes(wanted) ? wanted : ok[0];
}

/**
 * Pourquoi un palier est refusé, ou null s'il passe.
 *
 * Un revendeur ne pose que les fournitures que ses droits lui ouvrent. La
 * plateforme, elle, doit ouvrir au moins un droit, et ne peut pas vendre des
 * crédits plateforme à un revendeur sans lui permettre de fournir l'IA à ses
 * coachs : il n'aurait pas de clé à lui, et personne à qui faire tourner ses
 * crédits.
 */
export function planRefusal(
  seller: { kind: "platform" | "reseller" | "coach"; rights: SupplyRights },
  plan: { aiSupply: PlanAiSupply; coachByokAllowed: boolean; coachCreditsAllowed: boolean },
): string | null {
  if (seller.kind === "reseller" && !supplyAllowed(seller.rights, plan.aiSupply)) {
    return plan.aiSupply === "byok"
      ? "Ton palier ne te permet pas de laisser tes coachs en clé personnelle : ce palier doit fournir l'IA (crédits)."
      : "Ton palier ne comprend pas la revente de crédits IA : ce palier doit laisser tes coachs en clé personnelle.";
  }
  if (seller.kind === "platform") {
    if (!plan.coachByokAllowed && !plan.coachCreditsAllowed) {
      return "Ouvre au moins un mode de fourniture aux coachs : clé personnelle ou crédits.";
    }
    if (plan.aiSupply === "credits" && !plan.coachCreditsAllowed) {
      return "Un revendeur en crédits plateforme fournit l'IA à ses coachs : ouvre-lui la revente de crédits, ou vends-lui ce palier en clé personnelle.";
    }
  }
  return null;
}

/**
 * Ce que le compte d'un revendeur doit devenir quand ses droits sont posés.
 *
 * Sans le droit de fournir, il ne fournit pas : chacun sa clé, et le modèle
 * « crédits » retombe en abonnement. Un revendeur en crédits plateforme n'a pas
 * de clé à lui, il reste fournisseur quoi qu'il arrive (la plateforme ne peut
 * plus lui vendre ce cas, mais un compte d'avant peut encore l'être). Sans le
 * droit de laisser ses coachs en clé personnelle, il fournit, point.
 */
export function rightsPatch(
  r: SupplyRights,
  facts: { buysPlatformCredits: boolean; resellerModel: string | null },
): Record<string, string> {
  const patch: Record<string, string> = {};
  if (!r.credits) {
    if (facts.resellerModel === "credits") patch.reseller_model = "subscription";
    if (!facts.buysPlatformCredits) patch.ai_mode = "byok";
  }
  if (!r.byok) patch.ai_mode = "provider";
  return patch;
}

/**
 * La seule fourniture permise, quand il n'y en a qu'une : c'est elle que
 * prennent les paliers existants du revendeur et ses coachs. null quand il
 * choisit, auquel cas rien n'est à corriger.
 */
export function forcedSupply(r: SupplyRights): PlanAiSupply | null {
  const ok = allowedSupplies(r);
  return ok.length === 1 ? ok[0] : null;
}
