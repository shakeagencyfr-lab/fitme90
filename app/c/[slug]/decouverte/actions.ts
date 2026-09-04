"use server";

import { redirect } from "next/navigation";
import { publicLeadMagnetBySlug, createProspect } from "@/lib/prospects";
import {
  isActivity, isConcern, isDuration, isEquipment, isFocus, isGoal, isLevel, isSex,
} from "@/lib/lead-magnet-types";

export interface LeadState {
  error?: string;
}

/**
 * Une mesure numérique bornée, ou null.
 *
 * Hors bornes ou vide, on ne transmet RIEN : le document n'annoncera alors
 * aucun chiffre plutôt qu'un chiffre bâti sur une saisie douteuse. Une faute
 * de frappe sur la taille (17 au lieu de 170) donnerait des calories absurdes
 * qui seraient pourtant suivies.
 */
function mesure(raw: FormDataEntryValue | null, min: number, max: number): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
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
  const focus = String(formData.get("focus") ?? "");
  const concern = String(formData.get("concern") ?? "");
  const sex = String(formData.get("sex") ?? "");
  const activity = String(formData.get("activity") ?? "");
  const days = Math.max(2, Math.min(6, Number(formData.get("days") ?? 3) || 3));
  const durationRaw = Number(formData.get("duration") ?? 45);

  const age = mesure(formData.get("age"), 14, 99);
  const height = mesure(formData.get("height"), 120, 230);
  const weight = mesure(formData.get("weight"), 35, 250);

  if (!name) return { error: "Indique ton prénom." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Indique une adresse e-mail valide." };
  if (!isGoal(goal) || !isLevel(level) || !isEquipment(equipment) || !isFocus(focus) || !isConcern(concern)) {
    return { error: "Complète toutes les questions." };
  }
  if (formData.get("consent") !== "on") return { error: "Accepte de recevoir ton programme par e-mail pour continuer." };

  // Le CRM du coach ne stocke que les quatre réponses historiques : le reste
  // sert au document et n'a pas à peupler une fiche prospect.
  await createProspect(lm.tenantId, { name, email, goal, level, days, equipment });

  const q = new URLSearchParams({
    n: name.slice(0, 40),
    g: goal,
    l: level,
    e: equipment,
    d: String(days),
    du: String(isDuration(durationRaw) ? durationRaw : 45),
    f: focus,
    c: concern,
  });
  if (isSex(sex) && sex !== "nsp") q.set("s", sex);
  if (isActivity(activity)) q.set("a", activity);
  if (age) q.set("ag", String(age));
  if (height) q.set("h", String(height));
  if (weight) q.set("w", String(weight));

  redirect(`/c/${lm.slug}/decouverte/resultat?${q.toString()}`);
}
