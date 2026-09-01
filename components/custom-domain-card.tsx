import { Card } from "@/components/ui";

// Domaine 100% personnalisé (white label total) : fonctionnalité premium à venir.
// La tuyauterie est en place (colonne tenants.custom_domain + résolution par le
// proxy) ; l'activation en libre-service arrivera avec les abonnements premium.
// Si un domaine a déjà été branché (réglé côté plateforme), on l'affiche.
export function CustomDomainCard({ domain }: { domain: string | null }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-archivo font-bold text-[17px] text-ink">Domaine personnalisé</div>
        <span className="rounded-pill bg-brand/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
          Premium
        </span>
        {domain ? (
          <span className="rounded-pill border border-line-4 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
            Actif
          </span>
        ) : null}
      </div>

      {domain ? (
        <p className="text-[13.5px] leading-[1.6] text-muted">
          Ta page publique est servie sur ton propre domaine :{" "}
          <span className="font-mono text-body">{domain}</span> (marque blanche totale, aucune mention My Fitness App dans l&apos;URL).
        </p>
      ) : (
        <p className="text-[13.5px] leading-[1.6] text-muted">
          Bientôt : branche ton <span className="font-medium text-body">propre nom de domaine</span> (ex{" "}
          <span className="font-mono text-body">coaching-tonnom.com</span>) pour une marque blanche totale,
          sans <span className="font-mono text-body">myfitnessapp.fit</span> dans l&apos;adresse. Réservé aux
          abonnements premium ; disponible prochainement.
        </p>
      )}
    </Card>
  );
}
