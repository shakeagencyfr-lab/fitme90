import { redirect } from "next/navigation";

// Fusionné dans l'onglet « Plans » (paiement unique + abonnement au même endroit).
export default function LegacySubscriptionsRedirect() {
  redirect("/admin/plans");
}
