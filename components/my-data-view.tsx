import Link from "next/link";
import { Card, MonoLabel } from "@/components/ui";
import { ConsentRow } from "@/components/consent-row";
import type { ConsentRow as ConsentRecord } from "@/lib/consents";
import type { DataHolding } from "@/lib/my-data";
import {
  CONSENT_EXPLAINER,
  CONSENT_LABEL,
  CONSENT_TEXT_VERSION,
  LEGAL_BASIS_LABEL,
  RETENTION,
  WITHDRAWABLE,
  WITHDRAWAL_EFFECT,
  type ConsentKind,
} from "@/lib/gdpr";

// L'écran « Mes données » : les articles 13, 15 et 7.3 réunis en un endroit.
//
// CE QUI MANQUAIT. Les droits existaient, éparpillés : un bouton d'export dans
// le profil, un texte juridique sur une page publique, et des consentements
// qu'on recueillait sans jamais les rendre à la personne. Résultat, personne ne
// pouvait répondre à « qu'est-ce que vous avez sur moi, et qu'est-ce que j'ai
// accepté ? » sans écrire au coach.
//
// LES CHIFFRES SONT RÉELS. Chaque ligne compte les enregistrements de CETTE
// personne, pas ce que la politique de confidentialité autorise à collecter.
// C'est ce qui fait la différence entre informer et prétendre informer.
//
// SÉPARÉ DE LA PAGE pour qu'un bac à sable puisse le rendre sans session ni
// base : autrement, cet écran ne se regarde qu'en se connectant vraiment au
// compte de quelqu'un, ce qui est exactement ce qu'on cherche à éviter.

// L'ordre où la personne s'attend à les lire : le contrat, l'information,
// puis ce qu'elle a explicitement autorisé.
const ORDRE: ConsentKind[] = ["cgv", "confidentialite", "sante", "prospection"];

export function MyDataView({
  consents,
  unavailable,
  holdings,
}: {
  consents: ConsentRecord[];
  unavailable: boolean;
  holdings: DataHolding[];
}) {
  // La ligne la plus récente de chaque type fait l'état courant ; les
  // précédentes restent en base pour l'historique.
  const dernier = new Map<string, ConsentRecord>();
  for (const c of consents) if (!dernier.has(c.kind)) dernier.set(c.kind, c);

  const avecDonnees = holdings.filter((h) => (h.rows ?? 0) > 0);
  const total = avecDonnees.reduce((n, h) => n + (h.rows ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <MonoLabel>
          <Link href="/app/profil" className="hover:text-ink">
            Profil
          </Link>
        </MonoLabel>
        <h1 className="font-archivo text-[clamp(28px,6vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
          Mes données
        </h1>
        <p className="max-w-[62ch] text-[14.5px] leading-relaxed text-muted">
          Ce que l&apos;application détient sur toi, ce que tu as accepté, et comment revenir sur
          chacun de ces accords. Le détail juridique est dans la{" "}
          <Link href="/confidentialite" className="text-brand">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>

      <Card as="section" className="flex flex-col gap-3">
        <MonoLabel>Mes accords</MonoLabel>
        {unavailable ? (
          <p className="text-[13.5px] leading-relaxed text-muted">
            Le journal des accords n&apos;est pas encore en service sur cet espace. Tes accords ont
            bien été demandés à l&apos;inscription et au questionnaire ; ils apparaîtront ici dès que
            ton professionnel aura terminé la mise à jour.
          </p>
        ) : (
          <div className="flex flex-col">
            {ORDRE.map((kind) => {
              const row = dernier.get(kind);
              return (
                <ConsentRow
                  key={kind}
                  kind={kind}
                  label={CONSENT_LABEL[kind]}
                  explainer={CONSENT_EXPLAINER[kind]}
                  grantedAt={row?.granted_at ?? null}
                  withdrawnAt={row?.withdrawn_at ?? null}
                  version={row?.text_version ?? null}
                  effect={WITHDRAWAL_EFFECT[kind]}
                  withdrawable={WITHDRAWABLE.includes(kind)}
                />
              );
            })}
          </div>
        )}
        <p className="text-[12.5px] leading-relaxed text-muted-2">
          Version courante des textes : {CONSENT_TEXT_VERSION}. Les conditions de vente et la
          politique de confidentialité ne se retirent pas case par case : elles sont la base du
          service, et on en sort en supprimant son compte. Un retrait ne remet pas en cause ce qui a
          été fait avant, et la preuve de ton accord est gardée {RETENTION.consentProofMonths} mois
          après son retrait, pour pouvoir montrer à partir de quelle date on a cessé.
        </p>
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <MonoLabel>Ce qui est enregistré sur toi</MonoLabel>
        {total === 0 ? (
          <p className="text-[13.5px] text-muted">
            Rien pour l&apos;instant, en dehors de ton compte.
          </p>
        ) : (
          <div className="flex flex-col">
            {avecDonnees.map((h) => (
              <div
                key={h.entry.table}
                className="flex items-start justify-between gap-3 border-t border-line-2 py-3 first:border-t-0 first:pt-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[14.5px] font-semibold text-ink">{h.entry.label}</span>
                    {h.entry.health ? (
                      <span className="rounded-pill bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-semibold text-muted">
                        santé
                      </span>
                    ) : null}
                  </span>
                  <span className="max-w-[54ch] text-[12.5px] leading-relaxed text-muted-2">
                    {h.entry.purpose} {LEGAL_BASIS_LABEL[h.entry.basis]}. {h.entry.retention}
                  </span>
                </div>
                <span className="shrink-0 font-archivo text-[17px] font-extrabold tabular-nums text-ink">
                  {h.rows}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[12.5px] leading-relaxed text-muted-2">
          Les catégories sans aucun enregistrement ne sont pas listées. La liste complète de ce qui
          PEUT être collecté, avec les bases légales et les durées, est dans la politique de
          confidentialité.
        </p>
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <MonoLabel>Emporter ou effacer</MonoLabel>
        <a
          href="/api/export"
          className="tap inline-flex w-fit items-center rounded-btn border border-line-4 bg-surface px-5 py-2.5 text-[15px] font-semibold text-ink hover:border-ink"
        >
          Exporter tout mon dossier
        </a>
        <p className="max-w-[62ch] text-[12.5px] leading-relaxed text-muted-2">
          Un fichier JSON avec l&apos;intégralité de ce qui précède, y compris les notes que ton
          coach a écrites à ton sujet (articles 15 et 20). La suppression définitive du compte se
          fait depuis le{" "}
          <Link href="/app/profil" className="text-brand">
            profil
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
