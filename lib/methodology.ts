import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Méthodologie d'entraînement injectée dans le prompt de génération. Une BASE
// evidence-based par défaut ; le coach peut la compléter/remplacer depuis le
// dashboard admin (table coach_config). C'est LE levier qualité principal.

export const BASE_METHODOLOGY = `MÉTHODOLOGIE D'ENTRAÎNEMENT — à appliquer rigoureusement.

Périodisation (3 cycles de 4 semaines, progression logique) :
- Cycle 1 — Adaptation : technique, amplitude complète, charges modérées (RPE 6-7), 2-3 séries/exercice, tempo contrôlé. Ancrer la régularité.
- Cycle 2 — Intensification / hypertrophie : montée du volume et des charges (RPE 7-8), 3-4 séries, densité accrue.
- Cycle 3 — Spécialisation : pic sur l'objectif (force, densité ou définition), intensité maximale maîtrisée (RPE 8-9) ; dernière semaine en décharge (-30 à -50 % de volume).
- Surcharge progressive : augmenter la charge OU les répétitions OU les séries d'une semaine à l'autre — jamais tout en même temps.

Volume et répétitions selon l'objectif :
- Hypertrophie : 6-12 reps, 10-20 séries/semaine par groupe musculaire, repos 60-120 s.
- Force : 3-6 reps, charges lourdes, repos 2-3 min, priorité aux mouvements composés.
- Perte de masse grasse / recomposition : conserver les charges pour préserver le muscle, 8-15 reps, densité (repos courts), cardio complémentaire.
- Endurance / santé : 12-20 reps, format circuits, repos courts.
- Débutant : fourchette haute de reps, priorité technique, format full-body. Confirmé : split possible, intensité plus élevée.

Sélection des exercices :
- Prioriser les mouvements composés (squat/fente, charnière de hanche, poussée horizontale et verticale, tirage horizontal et vertical) avant l'isolation.
- Équilibrer poussée/tirage et haut/bas du corps sur la semaine ; ne jamais négliger dos, ischio-jambiers et gainage.
- N'utiliser QUE le matériel déclaré ; si un mouvement est impossible, proposer une alternative équivalente.
- Contraintes/blessures : exclure ou régresser tout exercice contre-indiqué, sur les mêmes groupes musculaires.

Structure de séance : échauffement 5-10 min (mobilité + montée en charge), gros composés en premier à froid, isolation ensuite, gainage/finisher en fin. Tempo maîtrisé, amplitude complète.

Cardio : en fin de séance ou sur jours dédiés — intervalles courts en semaine, sortie continue plus longue le week-end si pertinent. Intensités via les zones de Karvonen.

Autorégulation : charges au ressenti (RPE), jamais imposées ; ajuster selon la forme, le sommeil et la récupération.

Nutrition (hygiène alimentaire, pas de prescription médicale) :
- Protéines 1,6-2,2 g/kg de poids de corps.
- Perte de gras : déficit modéré (-15 à -20 %). Prise de muscle : léger surplus (+5 à +10 %). Recomposition/maintien : autour de l'équilibre.
- Répartir sur les repas déclarés ; respecter STRICTEMENT allergies, régime et cadre religieux.

Sécurité : accompagnement sportif et de bien-être, sans visée thérapeutique. Toute douleur ou pathologie renvoie vers un professionnel de santé.`;

export interface CoachConfig {
  generation_mode: "auto" | "custom";
  custom_methodology: string;
}

/** Lit la config coach (service role). Renvoie des valeurs sûres si absente. */
export async function readCoachConfig(): Promise<CoachConfig> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_config")
      .select("generation_mode, custom_methodology")
      .eq("id", true)
      .maybeSingle<CoachConfig>();
    return {
      generation_mode: data?.generation_mode === "custom" ? "custom" : "auto",
      custom_methodology: data?.custom_methodology ?? "",
    };
  } catch {
    return { generation_mode: "auto", custom_methodology: "" };
  }
}

/**
 * Méthodologie effective pour la génération :
 * - mode "auto" → base evidence-based seule ;
 * - mode "custom" → base + consignes du coach (qui priment).
 */
export async function effectiveMethodology(): Promise<string> {
  const cfg = await readCoachConfig();
  const custom = cfg.custom_methodology.trim();
  if (cfg.generation_mode === "custom" && custom) {
    return `${BASE_METHODOLOGY}\n\nCONSIGNES SPÉCIFIQUES DU COACH (prioritaires sur la base ci-dessus) :\n${custom}`;
  }
  return BASE_METHODOLOGY;
}
