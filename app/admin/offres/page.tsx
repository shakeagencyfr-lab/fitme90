import { redirect } from "next/navigation";

// Les offres à paiement unique et les abonnements sont désormais gérés au même
// endroit, dans l'onglet « Plans ».
export default function LegacyOffersRedirect() {
  redirect("/admin/plans");
}
