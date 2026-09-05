import "server-only";
import { aiLanguageInstruction, type Locale } from "@/lib/i18n";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropic, MODELS, textOf, parseJsonLoose, effortConfig, apiCallOf, type ApiCall } from "@/lib/anthropic";
import { tenantAnthropicKey, tenantIdForUser } from "@/lib/tenant";
import { recordCalls } from "@/lib/ratelimit";
import {
  matchLibraryExercise,
  normalizeExerciseName,
  libraryFrames,
} from "@/lib/exercise-library";

// Résolveur de fiche exercice, en trois couches de priorité :
//   1) média du coach (override marque blanche, table exercise_media),
//   2) bibliothèque intégrée (images + consignes, lib/exercise-library),
//   3) IA (BYOK) mise en cache globale (table exercise_guides).

export type GuideSource = "coach" | "library" | "ai" | "none";

export interface ResolvedGuide {
  name: string;
  muscle: string | null;
  frames: string[]; // images (bibliothèque) ou image unique (coach)
  steps: string[];
  cues: string[];
  mistakes: string[];
  note: string | null; // texte libre (consignes du coach)
  source: GuideSource;
}

/** Fiche depuis le média du coach, ou null. */
async function coachOverride(key: string, tenantId: string | null): Promise<ResolvedGuide | null> {
  if (!tenantId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("exercise_media")
    .select("name, muscle, image_url, instructions")
    .eq("tenant_id", tenantId)
    .eq("exercise_key", key)
    .maybeSingle<{ name: string; muscle: string | null; image_url: string | null; instructions: string | null }>();
  if (!data) return null;
  return {
    name: data.name,
    muscle: data.muscle,
    frames: data.image_url ? [data.image_url] : [],
    steps: [],
    cues: [],
    mistakes: [],
    note: data.instructions,
    source: "coach",
  };
}

/** Fiche depuis la bibliothèque intégrée, ou null. */
function libraryGuide(name: string): ResolvedGuide | null {
  const entry = matchLibraryExercise(name);
  if (!entry) return null;
  return {
    name: entry.name,
    muscle: entry.muscle,
    frames: entry.noPhoto ? [] : libraryFrames(entry.key),
    steps: entry.guide.steps,
    cues: entry.guide.cues,
    mistakes: entry.guide.mistakes,
    note: null,
    source: "library",
  };
}

/** Clé de cache : les fiches anglaises sont rangées à part. */
function cacheKey(key: string, locale: Locale): string {
  return locale === "en" ? `${key}|en` : key;
}

/** Fiche depuis le cache IA, ou null. */
export async function cachedAiGuide(key: string, locale: Locale = "fr"): Promise<ResolvedGuide | null> {
  key = cacheKey(key, locale);
  const admin = createAdminClient();
  const { data } = await admin
    .from("exercise_guides")
    .select("name, muscle, steps, cues, mistakes")
    .eq("exercise_key", key)
    .maybeSingle<{ name: string; muscle: string | null; steps: string[]; cues: string[]; mistakes: string[] }>();
  if (!data) return null;
  return {
    name: data.name,
    muscle: data.muscle,
    frames: [],
    steps: data.steps ?? [],
    cues: data.cues ?? [],
    mistakes: data.mistakes ?? [],
    note: null,
    source: "ai",
  };
}

/**
 * Résout une fiche sans appel IA (couches coach + bibliothèque + cache).
 * Retourne null si rien n'est trouvé (le caller peut alors générer via l'IA).
 */
export async function resolveGuide(name: string, tenantId: string | null): Promise<ResolvedGuide | null> {
  const key = normalizeExerciseName(name);
  if (!key) return null;
  return (await coachOverride(key, tenantId)) ?? libraryGuide(name) ?? (await cachedAiGuide(key));
}

const aiSchema = z.object({
  muscle: z.string().default(""),
  steps: z.array(z.string()).default([]),
  cues: z.array(z.string()).default([]),
  mistakes: z.array(z.string()).default([]),
});

const GUIDE_SYSTEM = `Tu es un coach sportif. On te donne le NOM d'un exercice de musculation ou de cardio en français. Tu réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec ces clés :
- "muscle" : groupe(s) musculaire(s) principal(aux) travaillé(s) (court, ex "Pectoraux").
- "steps" : 3 à 5 étapes d'exécution claires pour un DÉBUTANT (phrases courtes).
- "cues" : 2 à 3 conseils clés (posture, sécurité).
- "mistakes" : 2 à 3 erreurs fréquentes à éviter.
N'utilise JAMAIS de tiret cadratin (—) ni demi-cadratin (–). Si le nom est ambigu, choisis l'interprétation la plus courante en salle.`;

/**
 * Génère la fiche via l'IA (clé BYOK du coach du client), la met en cache global,
 * et la renvoie. Retourne null si aucune clé n'est disponible ou en cas d'échec.
 */
export async function generateGuide(name: string, userId: string, locale: Locale = "fr"): Promise<ResolvedGuide | null> {
  const key = normalizeExerciseName(name);
  if (!key) return null;

  const apiKey = await tenantAnthropicKey(userId);
  if (!apiKey) return null;

  // Journalisé hors du bloc utile : l'appel est facturé par Anthropic dès qu'il
  // répond, même si sa réponse se révèle ensuite inexploitable.
  let call: ApiCall | null = null;
  try {
    const client = anthropic(apiKey);
    const message = await client.messages.create({
      model: MODELS.assist,
      max_tokens: 1024,
      ...effortConfig(MODELS.assist, "low"),
      system: `${GUIDE_SYSTEM}\n${aiLanguageInstruction(locale)}`,
      messages: [{ role: "user", content: `Exercice : ${name}\n\nRends le JSON.` }],
    });
    call = apiCallOf(message);
    const parsed = aiSchema.parse(parseJsonLoose(textOf(message)));
    // Le route reste « coach » : la fiche compte dans le plafond journalier du
    // coach, comme avant. Seule l'action précise ce qui a été fait.
    await recordCalls(userId, "coach", [call], {
      tenantId: await tenantIdForUser(userId),
      action: "fiche-exercice",
      credits: 0,
    });

    const admin = createAdminClient();
    await admin.from("exercise_guides").upsert(
      {
        exercise_key: cacheKey(key, locale),
        name,
        muscle: parsed.muscle || null,
        steps: parsed.steps,
        cues: parsed.cues,
        mistakes: parsed.mistakes,
        source: "ai",
      },
      { onConflict: "exercise_key" },
    );

    return {
      name,
      muscle: parsed.muscle || null,
      frames: [],
      steps: parsed.steps,
      cues: parsed.cues,
      mistakes: parsed.mistakes,
      note: null,
      source: "ai",
    };
  } catch {
    // Réponse inexploitable : Anthropic l'a quand même facturée, elle figure au
    // journal, sans crédit ni quota.
    if (call) {
      await recordCalls(userId, "coach", [call], {
        tenantId: await tenantIdForUser(userId),
        action: "fiche-exercice",
        credits: 0,
        countsForQuota: false,
      }).catch(() => {});
    }
    return null;
  }
}

export interface CoachExerciseMedia {
  id: string;
  exercise_key: string;
  name: string;
  muscle: string | null;
  image_url: string | null;
  instructions: string | null;
}

/** Liste les médias d'exercices d'un coach (dashboard). */
export async function listCoachExerciseMedia(tenantId: string): Promise<CoachExerciseMedia[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("exercise_media")
    .select("id, exercise_key, name, muscle, image_url, instructions")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .returns<CoachExerciseMedia[]>();
  return data ?? [];
}

/** Supprime un média d'exercice du coach. */
export async function deleteCoachExerciseMedia(tenantId: string, id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("exercise_media").delete().eq("tenant_id", tenantId).eq("id", id);
}

const EX_IMG_TYPES = new Set(["image/webp", "image/jpeg", "image/png", "image/gif"]);
const EX_IMG_MAX = 8 * 1024 * 1024; // 8 Mo (gif inclus)

/** Téléverse l'image/gif d'un exercice (bucket public exercise-media). */
export async function uploadExerciseImage(tenantId: string, key: string, file: File): Promise<{ url?: string; error?: string }> {
  if (!file || file.size === 0) return { error: "Aucun fichier." };
  if (!EX_IMG_TYPES.has(file.type)) return { error: "Image ou GIF uniquement (JPG, PNG, WEBP, GIF)." };
  if (file.size > EX_IMG_MAX) return { error: "Fichier trop lourd (8 Mo max)." };
  const ext = file.type.includes("gif") ? "gif" : file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
  const admin = createAdminClient();
  const path = `${tenantId}/${key || "ex"}-${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from("exercise-media").upload(path, buf, { contentType: file.type, upsert: false });
  if (error) return { error: "Téléversement impossible." };
  return { url: admin.storage.from("exercise-media").getPublicUrl(path).data.publicUrl };
}

/** Sauvegarde / met à jour le média d'un coach pour un exercice. */
export async function saveCoachExerciseMedia(input: {
  tenantId: string;
  name: string;
  muscle: string | null;
  imageUrl: string | null;
  instructions: string | null;
}): Promise<void> {
  const key = normalizeExerciseName(input.name);
  if (!key) return;
  const admin = createAdminClient();
  await admin.from("exercise_media").upsert(
    {
      tenant_id: input.tenantId,
      exercise_key: key,
      name: input.name,
      muscle: input.muscle,
      image_url: input.imageUrl,
      instructions: input.instructions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,exercise_key" },
  );
}
