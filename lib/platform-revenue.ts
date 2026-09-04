import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listChildTenants, type ChildTenant } from "@/lib/hierarchy";
import { monthStartIso, rowCost, type CostRow } from "@/lib/ai-cost";
import { usdToEur } from "@/lib/config";
import { keyOwnerFor, type SupplyNode } from "@/lib/ai-supply";

/**
 * Ce que rapporte la revente d'IA, pour la plateforme ou pour un revendeur.
 *
 * Le tableau de bord montrait les abonnements, les comptes et la conso, mais
 * pas le métier : vendre des crédits plus cher qu'ils ne coûtent. Il manquait
 * les trois chiffres qui font la décision, et surtout leur rapport.
 *
 * Un principe gouverne tout le module : ON NE COMPTE UN COÛT QUE LÀ OÙ IL EST
 * RÉELLEMENT SUPPORTÉ. Un compte en clé perso (BYOK) paie son IA directement à
 * Anthropic : il ne rapporte rien et ne coûte rien. L'agréger ferait apparaître
 * une dépense que le vendeur n'a jamais réglée, et une marge fausse. Seuls les
 * comptes en crédits comptent des deux côtés.
 */

/** Une ligne du tableau : un compte enfant et ce qu'il rapporte. */
export interface RevenueLine {
  tenantId: string;
  name: string;
  kind: ChildTenant["kind"];
  /** Le compte achète-t-il ses crédits, ou fournit-il sa propre clé ? */
  onCredits: boolean;
  /** Crédits vendus à ce compte sur la période. */
  creditsSold: number;
  /** Ce qu'il a payé, en centimes. */
  revenueCents: number;
  /** Crédits consommés par lui et toute sa descendance. */
  creditsSpent: number;
  /** Ce que sa consommation a coûté chez Anthropic, en dollars. */
  costUsd: number;
}

export interface RevenueTotals {
  creditsSold: number;
  revenueCents: number;
  creditsSpent: number;
  costUsd: number;
  /** Recette moins coût, en euros. */
  marginEur: number;
  /**
   * Ce qu'un crédit consommé a réellement coûté, en euros.
   *
   * null quand le chiffre n'a pas de sens : aucun crédit consommé, ou aucun
   * coût mesuré en face. Un coût nul n'est PAS un crédit gratuit, c'est une
   * absence de mesure (la conso est partie sur des clés perso, ou le journal
   * IA ne couvre pas encore la période). L'afficher comme 0,00 € donnait un
   * rapport prix/coût infini à l'écran.
   */
  costPerCreditEur: number | null;
}

export interface RevenueReport {
  sinceIso: string;
  lines: RevenueLine[];
  totals: RevenueTotals;
}

/**
 * Somme les lignes.
 *
 * Séparé des requêtes pour être testable : c'est ici que se joue la marge
 * affichée, et une erreur de signe y passerait inaperçue à l'écran.
 */
export function totalsOf(lines: RevenueLine[]): RevenueTotals {
  const t = lines.reduce(
    (acc, l) => ({
      creditsSold: acc.creditsSold + l.creditsSold,
      revenueCents: acc.revenueCents + l.revenueCents,
      creditsSpent: acc.creditsSpent + l.creditsSpent,
      costUsd: acc.costUsd + l.costUsd,
    }),
    { creditsSold: 0, revenueCents: 0, creditsSpent: 0, costUsd: 0 },
  );
  const coutEur = usdToEur(t.costUsd);
  return {
    ...t,
    marginEur: t.revenueCents / 100 - coutEur,
    // Le chiffre qui dit si le crédit est une unité honnête : ce qu'il coûte
    // vraiment, à comparer au prix auquel il est vendu. Il faut les deux
    // termes : sans coût mesuré, il n'y a rien à comparer.
    costPerCreditEur: t.creditsSpent > 0 && coutEur > 0 ? coutEur / t.creditsSpent : null,
  };
}

/**
 * Qui paie l'IA de chaque compte.
 *
 * La règle n'est pas « le revendeur est en crédits, donc la plateforme paie
 * tout son réseau » : `tenantAnthropicKey` essaie D'ABORD la clé du compte
 * lui-même. Un coach dont personne ne fournit l'IA règle Anthropic directement,
 * et compter sa consommation dans la marge de la plateforme afficherait une
 * dépense jamais engagée. La règle n'est pas réécrite ici : `keyOwnerFor` la
 * porte, et c'est la même que celle qui choisit la clé et celle qui débite.
 */
async function payeurParTenant(ids: string[]): Promise<Map<string, string | null>> {
  const admin = createAdminClient();
  if (ids.length === 0) return new Map();

  const [{ data: rows }, { data: secrets }] = await Promise.all([
    admin
      .from("tenants")
      .select("id, parent_id, ai_mode, ai_supply")
      .returns<{ id: string; parent_id: string | null; ai_mode: string | null; ai_supply: string | null }[]>(),
    admin
      .from("tenant_secrets")
      .select("tenant_id, anthropic_key_enc")
      .returns<{ tenant_id: string; anthropic_key_enc: string | null }[]>(),
  ]);

  const aUneCle = new Set((secrets ?? []).filter((s) => !!s.anthropic_key_enc).map((s) => s.tenant_id));
  const reseau = new Map<string, SupplyNode>(
    (rows ?? []).map((r) => [
      r.id,
      {
        id: r.id,
        parentId: r.parent_id,
        aiMode: r.ai_mode === "provider" ? "provider" : "byok",
        aiSupply: r.ai_supply === "platform_credits" ? "platform_credits" : "byok",
        hasOwnKey: aUneCle.has(r.id),
      },
    ]),
  );

  return new Map(ids.map((id) => [id, keyOwnerFor(id, reseau)]));
}

/** Descendance complète d'un compte, sur la profondeur du produit. */
async function sousArbre(racineIds: string[]): Promise<Map<string, string[]>> {
  const admin = createAdminClient();
  const parEnfant = new Map<string, string[]>(racineIds.map((id) => [id, [id]]));
  if (racineIds.length === 0) return parEnfant;

  const { data } = await admin
    .from("tenants")
    .select("id, parent_id")
    .in("parent_id", racineIds)
    .returns<{ id: string; parent_id: string }[]>();

  const petits = data ?? [];
  for (const p of petits) parEnfant.get(p.parent_id)?.push(p.id);

  // Un niveau de plus : les clients d'un coach sont chez le coach, mais un
  // revendeur peut avoir des sous-revendeurs. La profondeur s'arrête là, le
  // produit n'en prévoit pas davantage.
  const ids = petits.map((p) => p.id);
  if (ids.length > 0) {
    const { data: sous } = await admin
      .from("tenants")
      .select("id, parent_id")
      .in("parent_id", ids)
      .returns<{ id: string; parent_id: string }[]>();
    const grandParent = new Map(petits.map((p) => [p.id, p.parent_id]));
    for (const s of sous ?? []) {
      const gp = grandParent.get(s.parent_id);
      if (gp) parEnfant.get(gp)?.push(s.id);
    }
  }
  return parEnfant;
}

/**
 * Revenus de revente d'IA du mois courant, ligne par compte enfant.
 *
 * @param tenantId La plateforme, ou un revendeur qui revend à ses coachs.
 */
export async function revenueReport(tenantId: string | null, now = new Date()): Promise<RevenueReport> {
  const since = monthStartIso(now);
  const vide: RevenueReport = { sinceIso: since, lines: [], totals: totalsOf([]) };
  if (!tenantId) return vide;

  const enfants = await listChildTenants(tenantId);
  if (enfants.length === 0) return vide;

  const admin = createAdminClient();
  const idsEnfants = enfants.map((e) => e.id);
  const arbre = await sousArbre(idsEnfants);
  const tousIds = [...new Set([...arbre.values()].flat())];

  const [{ data: ledger }, { data: calls }, payeur] = await Promise.all([
    admin
      .from("credit_ledger")
      .select("tenant_id, delta, price_cents")
      .in("tenant_id", tousIds)
      .gte("created_at", since)
      .limit(100000)
      .returns<{ tenant_id: string; delta: number; price_cents: number | null }[]>(),
    admin
      .from("ai_calls")
      .select("tenant_id, route, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cache_write_1h_tokens")
      .in("tenant_id", tousIds)
      .gte("created_at", since)
      .limit(100000)
      .returns<(CostRow & { tenant_id: string })[]>(),
    payeurParTenant(tousIds),
  ]);

  // Où va chaque tenant de la descendance : sur quelle ligne du tableau.
  const ligneDe = new Map<string, string>();
  for (const [enfant, ids] of arbre) for (const id of ids) ligneDe.set(id, enfant);

  const vendus = new Map<string, number>();
  const recette = new Map<string, number>();
  const consommes = new Map<string, number>();
  const cout = new Map<string, number>();

  for (const l of ledger ?? []) {
    const cle = ligneDe.get(l.tenant_id);
    if (!cle) continue;
    if (l.delta > 0) {
      // Vente seulement si elle a un prix : un crédit offert n'est pas un
      // revenu, et le compter gonflerait la marge d'un montant jamais encaissé.
      if ((l.price_cents ?? 0) > 0) {
        vendus.set(cle, (vendus.get(cle) ?? 0) + l.delta);
        recette.set(cle, (recette.get(cle) ?? 0) + (l.price_cents ?? 0));
      }
    } else {
      consommes.set(cle, (consommes.get(cle) ?? 0) - l.delta);
    }
  }

  for (const c of calls ?? []) {
    const cle = ligneDe.get(c.tenant_id);
    // On ne compte que ce que CE compte a réellement réglé : un descendant qui
    // a sa propre clé Anthropic paie lui-même, sa consommation n'est pas ici.
    if (cle && payeur.get(c.tenant_id) === tenantId) {
      cout.set(cle, (cout.get(cle) ?? 0) + rowCost(c));
    }
  }

  const lines: RevenueLine[] = enfants.map((e) => {
    const onCredits = e.aiSupply === "platform_credits";
    return {
      tenantId: e.id,
      name: e.name,
      kind: e.kind,
      onCredits,
      creditsSold: vendus.get(e.id) ?? 0,
      revenueCents: recette.get(e.id) ?? 0,
      creditsSpent: consommes.get(e.id) ?? 0,
      // Déjà filtré par payeur : ce qui reste est ce que nous avons payé.
      costUsd: cout.get(e.id) ?? 0,
    };
  });

  return { sinceIso: since, lines, totals: totalsOf(lines) };
}
