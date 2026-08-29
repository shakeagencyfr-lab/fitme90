import { redirect } from "next/navigation";

// Fusionné dans « Intégrations » (Anthropic + Stripe au même endroit).
export default function AdminPaiementsPage() {
  redirect("/admin/integrations");
}
