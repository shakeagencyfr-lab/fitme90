import { notFound } from "next/navigation";
import { EquipmentPickerPreview } from "@/components/equipment-picker-preview";

// Bac à sable du sélecteur de machines, sur le même principe que /dev/shell :
// il ouvre le menu avec une sélection fictive, sans session ni base, pour
// pouvoir le regarder dans un vrai navigateur (photos, grille, filtres).
// Désactivé sauf si LANDING_PREVIEW=1, donc jamais en production.
export const dynamic = "force-dynamic";

export default function DevMaterielPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  return <EquipmentPickerPreview />;
}
