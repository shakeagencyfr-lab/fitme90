import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { keyOwnerFor, type SupplyNode } from "@/lib/ai-supply";

/**
 * L'IA PEUT-ELLE RÉELLEMENT TOURNER pour les clients de ce compte ?
 *
 * En modèle crédits, la question ne se posait pas : la clé de la plateforme
 * tourne toujours. En clé perso, elle devient la première cause de client
 * mécontent. Rien n'empêchait un coach de publier ses offres et d'encaisser
 * sans avoir renseigné sa clé Anthropic ; le client payait, puis la génération
 * échouait sur « L'IA n'est pas configurée pour ce coach ». Remboursement, et
 * confiance perdue au premier client.
 *
 * La bonne question n'est PAS « ce coach a-t-il une clé » : un coach fourni par
 * son revendeur n'en a pas besoin, c'est la chaîne au-dessus qui tourne. On
 * pose donc exactement la question de `keyOwnerFor` : au bout de la chaîne de
 * fourniture, y a-t-il une clé utilisable ? C'est la même règle que celle qui
 * choisit la clé à l'exécution, donc la réponse ne peut pas diverger.
 */

/** Profondeur de la chaîne : plateforme → revendeur → coach. */
const CHAINE = 3;

/**
 * Charge le compte et ses ascendants, puis applique la règle partagée.
 *
 * Trois requêtes au plus, jamais la table entière : cette fonction est appelée
 * depuis la page publique d'un coach, qui doit rester rapide.
 */
export async function tenantAiReady(tenantId: string | null): Promise<boolean> {
  if (!tenantId) return false;
  const admin = createAdminClient();

  const noeuds = new Map<string, SupplyNode>();
  const aVoir: string[] = [tenantId];
  const ids: string[] = [];

  for (let i = 0; i < CHAINE && aVoir.length > 0; i++) {
    const id = aVoir.shift()!;
    if (noeuds.has(id)) continue;
    const { data } = await admin
      .from("tenants")
      .select("id, parent_id, ai_mode, ai_supply, ai_self_managed")
      .eq("id", id)
      .maybeSingle<{ id: string; parent_id: string | null; ai_mode: string | null; ai_supply: string | null; ai_self_managed: boolean | null }>();
    if (!data) break;
    ids.push(data.id);
    noeuds.set(data.id, {
      id: data.id,
      parentId: data.parent_id,
      aiMode: data.ai_mode === "provider" ? "provider" : "byok",
      aiSupply: data.ai_supply === "platform_credits" ? "platform_credits" : "byok",
      selfManaged: !!data.ai_self_managed,
      hasOwnKey: false, // rempli juste après, en une seule requête
    });
    if (data.parent_id) aVoir.push(data.parent_id);
  }
  if (noeuds.size === 0) return false;

  const { data: secrets } = await admin
    .from("tenant_secrets")
    .select("tenant_id, anthropic_key_enc")
    .in("tenant_id", ids)
    .returns<{ tenant_id: string; anthropic_key_enc: string | null }[]>();
  for (const s of secrets ?? []) {
    const n = noeuds.get(s.tenant_id);
    if (n) n.hasOwnKey = !!s.anthropic_key_enc;
  }

  return keyOwnerFor(tenantId, noeuds) !== null;
}

/** Ce qui manque à un compte pour pouvoir vendre. Sert au bandeau du coach. */
export interface SellReadiness {
  /** Une clé Anthropic est disponible au bout de la chaîne de fourniture. */
  aiReady: boolean;
  /** Une clé Stripe est configurée : le compte peut encaisser. */
  chargesEnabled: boolean;
}

/** Vrai quand le compte peut vendre sans promettre ce qu'il ne livrera pas. */
export function canSell(r: SellReadiness): boolean {
  return r.aiReady && r.chargesEnabled;
}

/**
 * Ce qu'il faut dire au coach, dans l'ordre où il doit agir. Renvoie null
 * quand tout est en place.
 */
export function readinessMessage(r: SellReadiness): string | null {
  if (!r.aiReady && !r.chargesEnabled) {
    return "Tes offres ne sont pas encore en vente : il manque ta clé Anthropic (l'IA de tes clients) et ta clé Stripe (l'encaissement). Renseigne-les dans Intégrations.";
  }
  if (!r.aiReady) {
    return "Tes offres ne sont pas en vente : sans clé Anthropic, le programme de ton client ne pourrait pas être généré après son paiement. Renseigne-la dans Intégrations.";
  }
  if (!r.chargesEnabled) {
    return "Tes offres ne sont pas en vente : sans clé Stripe, tu ne peux pas encaisser. Renseigne-la dans Intégrations.";
  }
  return null;
}
