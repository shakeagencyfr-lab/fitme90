"use server";

import { redirect } from "next/navigation";
import { publicLeadMagnetBySlug, createProspect } from "@/lib/prospects";
import { isGoal, isLevel, isEquipment } from "@/lib/lead-magnet";

export interface LeadState {
  error?: string;
}

/** Soumission publique du mini-programme gratuit (lead magnet). */
export async function submitLeadMagnet(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const lm = await publicLeadMagnetBySlug(slug);
  if (!lm) return { error: "Ce mini-programme n'est plus disponible." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const goal = String(formData.get("goal") ?? "");
  const level = String(formData.get("level") ?? "");
  const equipment = String(formData.get("equipment") ?? "");
  const days = Number(formData.get("days") ?? 3);
  // Poids facultatif. Hors bornes ou vide : on ne transmet rien, et le document
  // n'annonce pas de cible protéines plutôt que d'en inventer une.
  const rawWeight = Number(formData.get("weight"));
  const weight = Number.isFinite(rawWeight) && rawWeight >= 35 && rawWeight <= 250 ? Math.round(rawWeight) : null;

  if (!name) return { error: "Indique ton prénom." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Indique une adresse e-mail valide." };
  if (!isGoal(goal) || !isLevel(level) || !isEquipment(equipment)) return { error: "Complète toutes les questions." };
  if (formData.get("consent") !== "on") return { error: "Accepte de recevoir ton programme par e-mail pour continuer." };

  await createProspect(lm.tenantId, { name, email, goal, level, days, equipment });

  const q = new URLSearchParams({ n: name.slice(0, 40), g: goal, l: level, e: equipment, d: String(Math.max(2, Math.min(4, days))) });
  if (weight) q.set("w", String(weight));
  redirect(`/c/${lm.slug}/decouverte/resultat?${q.toString()}`);
}
