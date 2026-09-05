import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { coachSupplyFacts } from "@/lib/credits";
import { whoPays } from "@/lib/ai-supply";

// QUOTA JOURNALIER d'actions IA par client.
//
// UN SEUL COMPTEUR, ET IL NE COMPTE QUE CE QUI COÛTE.
//
// Il y a eu deux compteurs (messages d'un côté, recettes de l'autre), puis un
// seul couvrant les trois actions du client. Il n'en reste que deux à
// compter : le message au Coach IA, et la photo d'aliments analysée (un appel
// de vision, le plus cher des deux). Les recettes du jour et les alternatives
// d'exercice sont désormais CALCULÉES, sans appel à un modèle
// (lib/recipe-engine.ts, lib/exercise-alternatives.ts) : elles ne coûtent
// rien, donc les faire consommer un quota reviendrait à vendre du vide. Elles
// sont libres et illimitées.
//
// Réglé par le coach PAR OFFRE, à défaut par sa configuration générale, et
// plafonné par son revendeur quand celui-ci fournit l'IA. Le compteur se remet
// au quota chaque jour à minuit (heure de Paris) : rien ne s'accumule, 20 par
// jour et 7 restants ce soir font 20 demain matin, pas 27. Le coach n'est
// débité que de ce que le client utilise réellement.

export const DEFAULT_COACH_AI_DAILY_LIMIT = 60;

/**
 * Les routes qui consomment le quota du client.
 *
 * Cette liste EST la définition de « une action IA facturée ». Toute nouvelle
 * route CLIENTE QUI APPELLE UN MODÈLE doit y figurer, sans quoi elle
 * échapperait au plafond et donc à la facture que le coach croit maîtriser. À
 * l'inverse, une route qui ne fait que calculer n'a rien à y faire.
 */
export const CLIENT_AI_ROUTES = ["coach", "recipes"] as const;

const TZ = "Europe/Paris";

// Combine deux plafonds (0 = illimité) : la contrainte la plus stricte gagne.
export function tighter(a: number, b: number): number {
  if (a <= 0) return Math.max(0, b);
  if (b <= 0) return a;
  return Math.min(a, b);
}

/** Décalage (ms) entre l'heure UTC et l'heure de Paris à l'instant donné. */
function parisOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - at.getTime();
}

/** Minuit (heure de Paris) du jour courant, en Date UTC. Logique pure. */
export function parisDayStart(now: Date = new Date()): Date {
  const offset = parisOffsetMs(now);
  const local = new Date(now.getTime() + offset);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(startLocal - offset);
}

/** Prochain minuit (heure de Paris) : l'instant où le quota se remet à plein. */
export function parisNextDayStart(now: Date = new Date()): Date {
  const start = parisDayStart(now);
  // +24 h puis recalage : couvre les changements d'heure (23 h ou 25 h).
  return parisDayStart(new Date(start.getTime() + 26 * 3_600_000));
}

/**
 * Ramène un quota saisi sous le plafond du revendeur.
 *
 * TROIS CAS, ET LE DEUXIÈME EST CELUI QU'ON OUBLIE. Sans plafond, on garde ce
 * qui est saisi. Avec un plafond, « 0 = illimité » devient impossible : c'est
 * le plafond qui fait loi, sinon un quota à zéro passerait au travers en
 * promettant l'infini. Et un nombre au-dessus du plafond est ramené à lui.
 *
 * Le serveur tranche, même si le formulaire empêche déjà de dépasser : un
 * champ borné est un confort, pas une garantie.
 *
 * Pure et testable, et elle vit ici plutôt que dans le fichier d'actions :
 * un module « use server » ne peut exporter que des fonctions asynchrones.
 */
export function quotaSousPlafond(
  saisi: number | null,
  plafond: number,
): { valeur: number | null; ramene: boolean } {
  if (plafond <= 0 || saisi == null) return { valeur: saisi, ramene: false };
  if (saisi <= 0 || saisi > plafond) return { valeur: plafond, ramene: true };
  return { valeur: saisi, ramene: false };
}

/**
 * Le plafond que le revendeur impose aux clients de ce coach (0 = aucun).
 *
 * DEUX CONDITIONS, ET LA SECONDE MANQUAIT. Le plafond n'a de sens que si le
 * revendeur FOURNIT l'IA, et seulement s'il en PAIE l'usage. Dès que le coach
 * règle en crédits, c'est son solde qui borne la dépense : le revendeur ne
 * risque rien, et son écran le dit noir sur blanc (« en modèle crédits, pas de
 * plafond à régler ici »). Le formulaire de plafond disparaît alors.
 *
 * Le compteur, lui, continuait de l'appliquer. Un revendeur passé en crédits
 * gardait donc un ancien plafond qu'il ne voyait plus, ne pouvait plus
 * changer, et qui bridait pourtant tous les clients de tous ses coachs.
 * C'est la cause du « j'ai monté le quota à 30 et mon client est resté à 15 » :
 * un réglage fantôme, invisible des deux côtés.
 *
 * Le plafond ne s'applique donc plus que là où il protège quelqu'un.
 */
export async function resellerClientDailyCap(tenantId: string | null): Promise<number> {
  if (!tenantId) return 0;
  // `coachSupplyFacts` tient compte de la dispense : un coach passé sur sa
  // propre clé n'est plus fourni, donc plus plafonné.
  const facts = await coachSupplyFacts(tenantId);
  if (!facts.resellerSupplies) return 0;
  // Le coach paie en crédits : son solde borne déjà tout, le plafond est du
  // bruit. C'est exactement ce que l'écran du revendeur lui annonce.
  if (whoPays(facts).coach) return 0;

  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tenants")
    .select("parent_id")
    .eq("id", tenantId)
    .maybeSingle<{ parent_id: string | null }>();
  if (!t?.parent_id) return 0;
  const { data: parent } = await admin
    .from("tenants")
    .select("ai_client_daily_limit")
    .eq("id", t.parent_id)
    .maybeSingle<{ ai_client_daily_limit: number | null }>();
  return Math.max(0, parent?.ai_client_daily_limit ?? 0);
}

/**
 * Quota journalier effectif d'un client (0 = illimité) : celui de SON offre si
 * elle en fixe un, sinon celui de la configuration du coach, le tout plafonné
 * par le revendeur fournisseur d'IA.
 */
export async function coachAiDailyLimit(tenantId: string | null, userId?: string | null): Promise<number> {
  if (!tenantId) return DEFAULT_COACH_AI_DAILY_LIMIT;
  const admin = createAdminClient();

  let offerLimit: number | null = null;
  if (userId) {
    const { data: prof } = await admin
      .from("profiles")
      .select("selected_offer_id")
      .eq("id", userId)
      .maybeSingle<{ selected_offer_id: string | null }>();
    if (prof?.selected_offer_id) {
      const { data: offer } = await admin
        .from("offers")
        .select("coach_ai_daily_limit")
        .eq("id", prof.selected_offer_id)
        .maybeSingle<{ coach_ai_daily_limit: number | null }>();
      if (offer?.coach_ai_daily_limit != null) offerLimit = Math.max(0, offer.coach_ai_daily_limit);
    }
  }

  const { data } = await admin
    .from("coach_config")
    .select("coach_ai_daily_limit")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ coach_ai_daily_limit: number | null }>();
  const coachDefault = data?.coach_ai_daily_limit == null ? DEFAULT_COACH_AI_DAILY_LIMIT : Math.max(0, data.coach_ai_daily_limit);
  const coachLimit = offerLimit ?? coachDefault;

  // UNE SEULE SOURCE pour le plafond du revendeur. Le calculer ici ET dans
  // `resellerClientDailyCap` revenait à écrire deux fois la même règle : celle
  // qu'applique le compteur et celle qu'affiche le tableau de bord du coach
  // ont divergé, et c'est ainsi qu'un plafond fantôme a pu brider les clients
  // sans apparaître nulle part.
  return tighter(coachLimit, await resellerClientDailyCap(tenantId));
}

export interface BudgetState {
  ok: boolean;
  used: number;
  limit: number; // 0 = illimité
  /** Restant aujourd'hui (Infinity si illimité). */
  remaining: number;
  /** Instant du prochain renouvellement (minuit, heure de Paris). */
  resetsAt: string;
}

/**
 * Le quota du jour d'un client : ses échanges avec le Coach IA.
 *
 * La route « recipes » n'y compte plus que les photos d'aliments analysées :
 * les recettes du jour, elles, ne passent par aucun modèle et n'écrivent donc
 * plus rien dans `ai_calls`.
 */
export async function checkClientAiBudget(userId: string, tenantId: string | null): Promise<BudgetState> {
  const limit = await coachAiDailyLimit(tenantId, userId);
  const resetsAt = parisNextDayStart().toISOString();
  if (limit <= 0) return { ok: true, used: 0, limit: 0, remaining: Infinity, resetsAt };
  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("route", [...CLIENT_AI_ROUTES])
    // Une ligne par appel API depuis que le journal miroite la facture : seule
    // celle qui porte l'action compte comme un message consommé.
    .eq("counts_for_quota", true)
    .gte("created_at", parisDayStart().toISOString());
  const used = count ?? 0;
  return { ok: used < limit, used, limit, remaining: Math.max(0, limit - used), resetsAt };
}
