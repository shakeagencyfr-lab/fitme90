import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { Card, MonoLabel } from "@/components/ui";
import { CheckoutButton } from "@/components/checkout-button";
import { PRICE_EUR, COACH_CREDENTIAL } from "@/lib/config";

export const metadata = { title: "Débloquer mon programme — FitMe90" };

export default async function PaiementPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/paiement");
  // Déjà payé : inutile de repasser à la caisse.
  if (ctx.access.phase !== "not_paid") redirect("/app");

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-6 py-4">
      <header className="flex flex-col gap-2">
        <MonoLabel className="text-brand">Programme complet</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {PRICE_EUR} €, une fois
        </h1>
        <p className="text-[15px] leading-[1.6] text-muted">
          Sans abonnement. Programme d'entraînement et accompagnement nutritionnel
          sur 90 jours, conçus par un {COACH_CREDENTIAL.toLowerCase()}.
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        {[
          "Programme d'entraînement périodisé, adapté à ta salle",
          "Nutrition jour par jour, allergènes et régime respectés",
          "Coach IA disponible pendant tes 90 jours",
          "Plan consultable 30 jours de plus après la fin",
          "Export PDF complet",
        ].map((t) => (
          <div key={t} className="flex items-start gap-2.5 text-[14.5px] text-body">
            <span className="text-brand mt-0.5" aria-hidden>✓</span>
            <span>{t}</span>
          </div>
        ))}
      </Card>

      <CheckoutButton />

      <p className="text-[12px] text-muted-2 leading-relaxed">
        Accompagnement sportif et de bien-être, sans visée médicale. En cas de
        pathologie, de grossesse ou de blessure, l'accès peut être suspendu et un
        avis médical demandé.
      </p>
    </div>
  );
}
