/**
 * QUI FOURNIT L'IA D'UN COMPTE, ET QUI LA PAIE.
 *
 * Cette question se posait à quatre endroits (résolution de la clé, débit des
 * crédits, colonne IA du réseau, marge de la revente) avec quatre réponses
 * légèrement différentes. Deux écrans finissaient par décrire le même compte
 * autrement : « 93 crédits » côté revendeur, « sur vos propres clés » côté
 * coach. Tout passe désormais par ce module, et il est pur : les appelants
 * apportent les faits, il rend la règle.
 *
 * LA RÈGLE. Un revendeur en mode `provider` FOURNIT l'IA à ses coachs. Ses
 * coachs tournent donc sur sa chaîne d'approvisionnement, et une clé qu'un
 * coach aurait enregistrée reste dormante. Sinon (« coachs autonomes »), chaque
 * coach tourne sur sa propre clé et ne doit rien à personne.
 *
 * Faire primer la clé du coach avait l'air plus juste, mais ouvrait une brèche :
 * n'importe quel coach pouvait coller une clé et cesser de payer les crédits de
 * son revendeur, qui perdait son revenu sans pouvoir s'y opposer. C'est le
 * fournisseur qui décide s'il fournit.
 *
 * L'EXCEPTION, ET POURQUOI ELLE NE ROUVRE PAS LA BRÈCHE. Un revendeur peut
 * dispenser un coach précis et le laisser tourner sur sa propre clé. La
 * décision reste celle du fournisseur : c'est lui qui pose l'exception depuis
 * son écran réseau, jamais le coach depuis le sien. Un coach dispensé ne
 * consomme plus aucun crédit et règle Anthropic directement.
 */

/** Un compte, tel que la résolution a besoin de le voir. */
export interface SupplyNode {
  id: string;
  parentId: string | null;
  /** `provider` : ce compte fournit l'IA à ses enfants. */
  aiMode: "provider" | "byok";
  /** D'où ce compte tient l'IA qu'il fournit : sa clé, ou des crédits achetés au-dessus. */
  aiSupply: "byok" | "platform_credits";
  /** Une clé Anthropic utilisable est enregistrée sur ce compte. */
  hasOwnKey: boolean;
  /**
   * Dispensé par son parent : tourne sur sa propre clé même si le parent
   * fournit. Posé par le parent, jamais par le compte lui-même.
   */
  selfManaged?: boolean;
}

/**
 * Le compte dont la clé fait RÉELLEMENT tourner l'IA de `id`, ou null si
 * aucune clé n'est disponible (l'appel doit alors être refusé, jamais reporté
 * en silence sur la plateforme).
 *
 * @param depth garde-fou : la chaîne est plateforme → revendeur → coach, mais
 *   une boucle de parenté en base ne doit pas faire tourner la récursion.
 */
export function keyOwnerFor(id: string, byId: Map<string, SupplyNode>, depth = 0): string | null {
  const moi = byId.get(id);
  if (!moi || depth > 4) return null;

  // Dispensé : on ne remonte pas la chaîne, ce compte répond de lui-même.
  if (moi.selfManaged) return moi.hasOwnKey ? moi.id : null;

  const parent = moi.parentId ? byId.get(moi.parentId) : undefined;
  if (parent?.aiMode === "provider") {
    // Le parent fournit : sa chaîne tourne, la clé de `moi` reste dormante.
    if (parent.aiSupply === "platform_credits") {
      return parent.parentId ? keyOwnerFor(parent.parentId, byId, depth + 1) : null;
    }
    return parent.hasOwnKey ? parent.id : null;
  }
  return moi.hasOwnKey ? moi.id : null;
}

/** Ce que la chaîne de fourniture dit d'une action IA, pour décider des débits. */
export interface SupplyFacts {
  /**
   * Le revendeur fournit l'IA à ce coach : son mode est `provider` ET le coach
   * n'a pas été dispensé. Un coach dispensé se comporte exactement comme un
   * coach dont le revendeur ne fournit pas.
   */
  resellerSupplies: boolean;
  /** Le revendeur facture ses coachs en crédits, ou par abonnement. */
  model: "subscription" | "credits";
  /** Le revendeur paie l'IA lui-même (byok) ou achète ses crédits à la plateforme. */
  supply: "byok" | "platform_credits";
}

/** Quels étages doivent être débités pour cette action. */
export interface UsageCharge {
  coach: boolean;
  reseller: boolean;
}

/**
 * Qui paie une action IA.
 *
 * Un crédit n'est pas un droit d'usage, c'est de l'IA achetée à quelqu'un. Si
 * le revendeur ne fournit pas l'IA, le coach tourne sur sa propre clé et règle
 * Anthropic en dollars : aucun portefeuille ne bouge. S'il fournit, chaque
 * étage est débité selon ce qu'il achète en amont, et seulement s'il achète.
 */
export function whoPays(f: SupplyFacts): UsageCharge {
  if (!f.resellerSupplies) return { coach: false, reseller: false };
  return { coach: f.model === "credits", reseller: f.supply === "platform_credits" };
}

/**
 * Comment présenter la fourniture d'un compte à l'écran. Un seul vocabulaire
 * pour la liste du réseau, le bandeau du coach et l'écran des crédits.
 *
 * - `credits`  : il achète ses crédits, son solde est ce qui compte.
 * - `supplied` : son fournisseur porte le coût, il n'a ni solde ni facture.
 * - `own_key`  : il paie Anthropic directement, en dollars.
 */
export type SupplyDisplay = "credits" | "supplied" | "own_key";

export function supplyDisplay(f: SupplyFacts): SupplyDisplay {
  if (!f.resellerSupplies) return "own_key";
  return f.model === "credits" ? "credits" : "supplied";
}

export type AiSupply = "byok" | "platform_credits";

/**
 * Champs à écrire pour basculer la fourniture d'IA d'un revendeur. Pur, testé.
 *
 * Vers les crédits : le revendeur fournit l'IA à ses coachs (`ai_mode=provider`)
 * sans clé à lui, c'est celle de la plateforme qui tourne et son solde qui est
 * débité, exactement comme un revendeur créé en crédits.
 *
 * Retour en BYOK : s'il n'a pas branché sa propre clé, le laisser en `provider`
 * couperait l'IA de tous ses coachs sans rien afficher. On le repasse donc en
 * « coachs autonomes » (chacun sa clé) et en modèle abonnement, faute de source
 * d'IA à revendre.
 */
export function supplySwitchPatch(supply: AiSupply, targetHasOwnKey: boolean): Record<string, string> {
  if (supply === "platform_credits") return { ai_supply: "platform_credits", ai_mode: "provider" };
  return targetHasOwnKey
    ? { ai_supply: "byok" }
    : { ai_supply: "byok", ai_mode: "byok", reseller_model: "subscription" };
}


/**
 * CE QU'UN COMPTE A LE DROIT DE VOIR DE SES COÛTS D'IA.
 *
 * La marge se cache dans l'écart entre ce qu'un crédit coûte chez Anthropic
 * et le prix auquel il est vendu. Un compte qui ACHÈTE des crédits ne doit
 * donc jamais voir de dollars : il verrait la marge de son fournisseur. Un
 * compte qui règle Anthropic lui-même (sa propre clé) voit ses dollars, comme
 * la plateforme. Un compte dont l'IA est comprise dans son abonnement n'a ni
 * facture ni solde : il ne voit que des appels.
 *
 *   usd       : ma clé, mes dollars (plateforme, revendeur en clé perso,
 *               coach en clé perso ou dispensé).
 *   credits   : j'achète des crédits, je vois des crédits (revendeur en
 *               crédits plateforme, coach chez un revendeur en crédits).
 *   included  : l'IA est comprise dans mon abonnement (coach chez un
 *               revendeur fournisseur en modèle abonnement).
 *
 * Pure : les appelants apportent les faits, elle rend la règle. Un seul
 * endroit, sinon chaque écran finit par décider autrement.
 */
export type CostView = "usd" | "credits" | "included";

export function costViewFor(
  kind: "platform" | "reseller" | "coach",
  resellerSupply: AiSupply,
  coachDisplay: SupplyDisplay,
): CostView {
  if (kind === "platform") return "usd";
  if (kind === "reseller") return resellerSupply === "platform_credits" ? "credits" : "usd";
  if (coachDisplay === "own_key") return "usd";
  return coachDisplay === "credits" ? "credits" : "included";
}
