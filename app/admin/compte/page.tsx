import { redirect } from "next/navigation";

// Fusionné dans « Intégrations » (Anthropic + Stripe au même endroit).
export default function AdminComptePage() {
  redirect("/admin/integrations");
}
