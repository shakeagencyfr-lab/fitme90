import { unsubscribeProspect } from "@/lib/prospect-followup-send";
import { Card } from "@/components/ui";

export const metadata = { title: "Désabonnement" };
export const dynamic = "force-dynamic";

/**
 * Désabonnement des relances, en un clic depuis le lien de chaque e-mail.
 *
 * Sans compte ni mot de passe : le jeton signé du lien suffit à identifier la
 * personne. Demander une connexion pour arrêter de recevoir des messages est
 * le meilleur moyen de récolter des plaintes pour spam à la place.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const ok = t ? await unsubscribeProspect(t) : false;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-16">
      <Card className="flex w-full max-w-[460px] flex-col gap-3 text-center">
        <h1 className="font-archivo text-[22px] font-extrabold tracking-[-0.02em] text-ink">
          {ok ? "C'est fait" : "Lien invalide"}
        </h1>
        <p className="text-[14.5px] leading-[1.6] text-muted">
          {ok
            ? "Tu ne recevras plus de relance. Le mini-programme que tu as déjà reçu reste valable, et rien d'autre n'a changé."
            : "Ce lien de désabonnement n'est plus valable. Réponds simplement au dernier e-mail reçu, ta demande sera prise en compte."}
        </p>
      </Card>
    </main>
  );
}
