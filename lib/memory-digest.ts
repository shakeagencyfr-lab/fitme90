import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODELS, textOf, effortConfig, anthropic } from "@/lib/anthropic";
import { anthropicKeyForBilling } from "@/lib/tenant";
import { recordCall } from "@/lib/ratelimit";
import { MAX_DIGEST_CHARS, readMemory, saveDigest } from "@/lib/coach-memory";

// Résumé cumulatif des échanges coach, produit chaque nuit. Complète l'outil
// `memoriser` : celui-ci retient ce que le coach juge notable sur le moment,
// le résumé garantit que rien ne se perd quand la fenêtre de 24 messages
// défile.
//
// Garde-fous de coût, dans cet ordre :
//   1. Seuls les clients ayant de NOUVEAUX messages depuis le dernier résumé
//      sont traités : un client inactif ne coûte rien.
//   2. Le résumé précédent est réinjecté et réécrit, jamais l'historique
//      complet : l'entrée reste bornée quelle que soit l'ancienneté du client.
//   3. Modèle Haiku, sortie plafonnée, longueur du résumé plafonnée.
// Facturation BYOK : la clé du coach du client, jamais celle de la plateforme.

/** Nombre de messages relus par client et par nuit (borne l'entrée). */
const MAX_NEW_MESSAGES = 60;
/** Sortie du modèle : le résumé est court par construction. */
const MAX_OUTPUT_TOKENS = 400;

export interface DigestRun {
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
}

interface Row {
  user_id: string;
  role: string;
  content: string;
  created_at: string;
}

/**
 * Met à jour le résumé de chaque client ayant échangé depuis son dernier
 * résumé. Renvoie un compte-rendu pour le journal du cron.
 */
export async function refreshMemoryDigests(): Promise<DigestRun> {
  const admin = createAdminClient();
  const out: DigestRun = { scanned: 0, updated: 0, skipped: 0, failed: 0 };

  // Clients ayant parlé au coach dans les dernières 48 h : au delà, il n'y a
  // rien de neuf à résumer (le cron tourne chaque nuit).
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: recent } = await admin
    .from("coach_messages")
    .select("user_id")
    .gte("created_at", since)
    .limit(5000)
    .returns<{ user_id: string }[]>();

  const userIds = [...new Set((recent ?? []).map((r) => r.user_id))];
  out.scanned = userIds.length;

  for (const userId of userIds) {
    try {
      const memory = await readMemory(userId);
      // Messages postérieurs au dernier résumé : jamais repayés deux fois.
      let q = admin
        .from("coach_messages")
        .select("user_id, role, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(MAX_NEW_MESSAGES);
      if (memory.digestThrough) q = q.gt("created_at", memory.digestThrough);

      const { data: msgs } = await q.returns<Row[]>();
      if (!msgs || msgs.length < 2) {
        out.skipped++;
        continue;
      }

      // BYOK strict : sans clé configurée côté coach, on ne facture personne.
      const billing = await anthropicKeyForBilling(userId);
      if (billing.missing) {
        out.skipped++;
        continue;
      }

      const transcript = msgs
        .map((m) => `${m.role === "user" ? "Client" : "Coach"} : ${m.content}`)
        .join("\n")
        .slice(0, 12000);

      const system = `Tu tiens la mémoire d'un coach sportif sur un client. À partir du résumé existant et des nouveaux échanges, produis un résumé MIS À JOUR, en français, de ${MAX_DIGEST_CHARS} caractères maximum.
Garde uniquement ce qui reste utile dans la durée : préférences, contraintes de vie, ressentis récurrents, objectifs personnels, engagements pris. Écris à la troisième personne, en phrases courtes, sans puces.
Jette ce qui est passager (météo, humeur d'un jour, question ponctuelle déjà résolue) et ne répète pas ce qui est déjà évident dans un profil (âge, poids, objectif principal). Si les nouveaux échanges n'apportent rien de durable, renvoie le résumé existant inchangé. Ne réponds QUE par le résumé, sans introduction. N'utilise jamais de tiret cadratin.`;

      const user = `RÉSUMÉ EXISTANT :\n${memory.digest || "(aucun)"}\n\nNOUVEAUX ÉCHANGES :\n${transcript}`;

      const message = await anthropic(billing.key).messages.create({
        model: MODELS.coach,
        max_tokens: MAX_OUTPUT_TOKENS,
        ...effortConfig(MODELS.coach, "low"),
        system,
        messages: [{ role: "user", content: user }],
      });

      const digest = textOf(message).trim();
      if (digest) {
        await saveDigest(userId, digest, msgs[msgs.length - 1].created_at);
        out.updated++;
      } else {
        out.skipped++;
      }

      await recordCall(userId, "coach", {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        cache_read_tokens: message.usage.cache_read_input_tokens ?? 0,
        cache_write_tokens: message.usage.cache_creation_input_tokens ?? 0,
      });
    } catch {
      // Un client en échec ne doit pas interrompre la tournée.
      out.failed++;
    }
  }

  return out;
}
