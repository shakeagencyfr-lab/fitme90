import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Mémoire longue du coach IA. Elle est rendue dans le PRÉFIXE MIS EN CACHE du
// prompt, où un token coûte 10 % du tarif d'entrée. C'est ce qui la rend
// abordable : rallonger l'historique de messages aurait coûté 33 % de plus,
// parce que le cache est réécrit plusieurs fois par jour à 125 % du tarif.
//
// Deux écrivains complémentaires :
//   `notes`  : faits durables mémorisés par le coach lui-même (outil
//              `memoriser`), immédiats et ciblés.
//   `digest` : résumé cumulatif produit chaque nuit par le cron, qui garantit
//              qu'aucun échange ne se perd.

/** Plafonds : la mémoire vit dans le préfixe caché, elle doit rester bornée. */
export const MAX_NOTES = 40;
export const MAX_NOTE_CHARS = 200;
export const MAX_DIGEST_CHARS = 1000;

export interface CoachMemory {
  notes: string[];
  digest: string;
  digestThrough: string | null;
}

const EMPTY: CoachMemory = { notes: [], digest: "", digestThrough: null };

export async function readMemory(userId: string): Promise<CoachMemory> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_memory")
    .select("notes, digest, digest_through")
    .eq("user_id", userId)
    .maybeSingle<{ notes: unknown; digest: string | null; digest_through: string | null }>();
  if (!data) return EMPTY;
  return {
    notes: Array.isArray(data.notes) ? (data.notes as unknown[]).map(String) : [],
    digest: data.digest ?? "",
    digestThrough: data.digest_through,
  };
}

/**
 * Ajoute un fait durable. Les doublons sont ignorés (le coach peut réapprendre
 * la même chose) et les plus anciens sortent quand le plafond est atteint.
 */
export async function addMemoryNote(userId: string, fait: string): Promise<string> {
  const clean = fait.trim().slice(0, MAX_NOTE_CHARS);
  if (clean.length < 3) return "Note vide, rien mémorisé.";

  const current = await readMemory(userId);
  const already = current.notes.some((n) => n.toLowerCase() === clean.toLowerCase());
  if (already) return `Déjà mémorisé : « ${clean} ».`;

  const notes = [...current.notes, clean].slice(-MAX_NOTES);
  const admin = createAdminClient();
  await admin
    .from("client_memory")
    .upsert(
      { user_id: userId, notes, digest: current.digest, digest_through: current.digestThrough, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  return `Mémorisé : « ${clean} ». Tu t'en souviendras dans toutes tes prochaines conversations.`;
}

/** Écrit le résumé cumulatif (cron de nuit). */
export async function saveDigest(userId: string, digest: string, through: string): Promise<void> {
  const current = await readMemory(userId);
  const admin = createAdminClient();
  await admin.from("client_memory").upsert(
    {
      user_id: userId,
      notes: current.notes,
      digest: digest.trim().slice(0, MAX_DIGEST_CHARS),
      digest_through: through,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

/**
 * Bloc à insérer dans la partie STABLE du prompt. Chaîne vide si le client n'a
 * encore aucune mémoire, pour ne pas alourdir le préfixe inutilement.
 */
export function renderMemory(m: CoachMemory): string {
  const parts: string[] = [];
  if (m.notes.length) {
    parts.push(`Ce que tu as retenu de lui :\n${m.notes.map((n) => `- ${n}`).join("\n")}`);
  }
  if (m.digest.trim()) {
    parts.push(`Résumé de vos échanges passés :\n${m.digest.trim()}`);
  }
  if (!parts.length) return "";
  return `MÉMOIRE DU CLIENT (elle traverse toutes les conversations ; appuie-toi dessus sans la réciter) :\n${parts.join("\n\n")}`;
}
