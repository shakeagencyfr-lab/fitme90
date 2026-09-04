import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { asLocale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/config";
import {
  dueFollowups,
  followupMessage,
  firstName,
  type FollowupCandidate,
} from "@/lib/prospect-followup";
import { prospectFollowupCopy } from "@/lib/prospects";

/**
 * Envoi des relances de prospects.
 *
 * Ce module fait le travail que `prospect-followup` a décidé : il lit la base,
 * expédie, et note ce qui est parti. La séparation permet de tester tout le
 * calendrier et tous les textes sans base ni serveur d'e-mail.
 *
 * Deux principes non négociables. Le coach doit avoir activé la séquence : on
 * n'écrit jamais en son nom sans qu'il l'ait demandé. Et le compteur est
 * incrémenté même quand l'envoi échoue, pour qu'un serveur SMTP en panne ne
 * fasse pas repartir la même relance chaque nuit jusqu'à ce qu'il revienne.
 */

/** Signature du lien de désabonnement. */
function signatureKey(): string {
  // On réutilise le secret des crons, déjà présent en production. À défaut, on
  // se rabat sur la clé de service : les liens restent valides et infalsifiables.
  return process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

/**
 * Jeton de désabonnement : l'identifiant du prospect et sa signature.
 * Sans signature, il suffirait de deviner un identifiant pour désabonner
 * quelqu'un d'autre, ou d'énumérer la table.
 */
export function unsubscribeToken(prospectId: string): string {
  const sig = createHmac("sha256", signatureKey()).update(prospectId).digest("base64url").slice(0, 24);
  return `${prospectId}.${sig}`;
}

/** Vérifie un jeton et renvoie l'identifiant du prospect, ou null. */
export function readUnsubscribeToken(token: string): string | null {
  const dot = (token ?? "").lastIndexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = createHmac("sha256", signatureKey()).update(id).digest("base64url").slice(0, 24);
  // Comparaison à durée constante : une comparaison naïve laisse deviner la
  // signature octet par octet.
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

/** Enregistre un désabonnement. Idempotent, et sans retour en arrière. */
export async function unsubscribeProspect(token: string): Promise<boolean> {
  const id = readUnsubscribeToken(token);
  if (!id) return false;
  const admin = createAdminClient();
  const { error } = await admin
    .from("prospects")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

export interface FollowupRunResult {
  /** Coachs ayant activé la séquence. */
  tenants: number;
  /** Relances dues sur l'ensemble. */
  due: number;
  /** Relances réellement parties. */
  sent: number;
}

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  language: string | null;
};

type ProspectRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  followup_sent: number;
  followup_at: string | null;
  status: string;
  unsubscribed_at: string | null;
};

/** Adresse publique de la page d'un coach. */
function landingUrl(slug: string): string {
  const base = SITE_URL || "https://myfitnessapp.fit";
  return `${base}/c/${slug}`;
}

/**
 * Passe en revue les prospects de tous les coachs ayant activé la séquence et
 * envoie ce qui est dû. Appelé par le cron quotidien.
 */
export async function runProspectFollowups(now: Date = new Date()): Promise<FollowupRunResult> {
  const out: FollowupRunResult = { tenants: 0, due: 0, sent: 0 };
  const admin = createAdminClient();

  const { data: configs } = await admin
    .from("coach_config")
    .select("tenant_id")
    .eq("prospect_followup_enabled", true)
    .returns<{ tenant_id: string }[]>();
  const tenantIds = (configs ?? []).map((c) => c.tenant_id);
  if (tenantIds.length === 0) return out;

  const { data: tenants } = await admin
    .from("tenants")
    .select("id, name, slug, language")
    .in("id", tenantIds)
    .returns<TenantRow[]>();

  for (const tenant of tenants ?? []) {
    out.tenants += 1;

    // Une lecture par coach, pas par prospect : les trois textes sont les
    // mêmes pour tout le monde.
    const textes = await prospectFollowupCopy(tenant.id);

    const { data: rows } = await admin
      .from("prospects")
      .select("id, name, email, created_at, followup_sent, followup_at, status, unsubscribed_at")
      .eq("tenant_id", tenant.id)
      .returns<ProspectRow[]>();

    const candidates: FollowupCandidate[] = (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      createdAt: r.created_at,
      followupSent: r.followup_sent ?? 0,
      followupAt: r.followup_at,
      status: r.status,
      unsubscribedAt: r.unsubscribed_at,
    }));

    const due = dueFollowups(candidates, now);
    out.due += due.length;

    for (const { prospect, step } of due) {
      const msg = followupMessage(
        step.step,
        {
          firstName: firstName(prospect.name),
          brand: tenant.name,
          landingUrl: landingUrl(tenant.slug),
          unsubscribeUrl: `${SITE_URL || "https://myfitnessapp.fit"}/desabonnement?t=${unsubscribeToken(prospect.id)}`,
          locale: asLocale(tenant.language),
        },
        textes,
      );

      // Envoyé depuis le serveur SMTP du coach s'il en a un : en marque
      // blanche, un message signé de sa marque ne doit pas partir de la nôtre.
      const ok = await sendEmail(
        { to: [prospect.email], subject: msg.subject, text: msg.text },
        tenant.id,
      );
      if (ok) out.sent += 1;

      // Le compteur avance même en cas d'échec : sinon une panne SMTP fait
      // repartir la même relance chaque nuit, et le jour où le serveur revient
      // la personne reçoit tout d'un coup.
      await admin
        .from("prospects")
        .update({ followup_sent: step.step, followup_at: now.toISOString() })
        .eq("id", prospect.id)
        .eq("tenant_id", tenant.id);
    }
  }

  return out;
}
