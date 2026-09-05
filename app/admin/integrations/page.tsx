import Link from "next/link";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { tenantKeyStatus } from "@/lib/tenant";
import { resellerBilling } from "@/lib/credits";
import { supplyDisplay } from "@/lib/ai-supply";
import { costViewOf } from "@/lib/cost-view";
import { tenantNode } from "@/lib/hierarchy";
import { tenantStripeStatus } from "@/lib/coach-payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { ByokForm } from "@/components/byok-form";
import { StripeKeyForm } from "@/components/stripe-key-form";
import { Alert } from "@/components/ui";

export const metadata = { title: "Intégrations, Admin My Fitness App" };

export default async function AdminIntegrationsPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  const empty = { configured: false, hint: null, encryptionReady: false };
  const anthropic = tenantId ? await tenantKeyStatus(tenantId) : empty;
  const stripe = tenantId ? await tenantStripeStatus(tenantId) : empty;

  let slug: string | null = null;
  // Une clé peut être enregistrée sans jamais servir : quand le revendeur
  // fournit l'IA, c'est SA chaîne qui tourne. Sans le dire, le coach voit une
  // clé « configurée » et un compteur de dépense à zéro, et croit à une panne.
  let fourniture: "credits" | "supplied" | "own_key" = "own_key";
  let kind: "platform" | "reseller" | "coach" = "coach";
  let view: "usd" | "credits" | "included" = "usd";
  if (tenantId) {
    const admin = createAdminClient();
    const [{ data }, node, v] = await Promise.all([
      admin
        .from("tenants")
        .select("slug, parent_id")
        .eq("id", tenantId)
        .maybeSingle<{ slug: string; parent_id: string | null }>(),
      tenantNode(tenantId),
      costViewOf(tenantId),
    ]);
    slug = data?.slug ?? null;
    kind = node?.kind ?? "coach";
    view = v;
    if (kind === "coach" && data?.parent_id) fourniture = supplyDisplay(await resellerBilling(data.parent_id));
  }
  const cleDormante = fourniture !== "own_key";
  // La clé Anthropic ne se propose qu'à qui règle Anthropic lui-même. Un
  // compte en crédits ou dont l'IA est comprise n'a rien à brancher : le
  // formulaire disparaît, il revient si son fournisseur le dispense.
  const cleProposee = view === "usd";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Intégrations")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {cleProposee ? (
            <>
              {tx("Tes deux clés indispensables :")} <span className="text-body">{tx("Anthropic")}</span> {tx("(l'IA de tes clients) et")} <span className="text-body">{tx("Stripe")}</span> {tx("(l'encaissement de tes offres). Sans elles, ton espace ne peut pas fonctionner.")}
            </>
          ) : (
            <>
              {tx("Ta clé")} <span className="text-body">{tx("Stripe")}</span> {tx("(l'encaissement de tes offres). L'IA t'est fournie : aucune clé Anthropic à brancher.")}
            </>
          )}
        </p>
      </div>

      {!tenantId ? (
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      ) : (
        <>
          {/* Aperçu de la page publique */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-5">
            <div className="flex flex-col gap-0.5">
              <div className="font-archivo font-bold text-[16px] text-ink">{tx("Ta page publique")}</div>
              <p className="text-[13px] text-muted">
                {slug ? (
                  <>{tx("C'est là que tes clients découvrent et achètent tes offres.")}</>
                ) : (
                  <>{tx("Slug de compte introuvable.")}</>
                )}
              </p>
            </div>
            {slug ? (
              <Link
                href={`/c/${slug}`}
                target="_blank"
                className="tap inline-flex h-11 items-center rounded-btn bg-brand px-5 font-plex font-semibold text-[15px] text-white hover:bg-brand-hover"
              >
                {tx("Voir ma page publique ↗")}</Link>
            ) : null}
          </div>

          {cleDormante ? (
            <Alert tone="info">
              {tx("Ton revendeur fournit l'IA de tes clients : elle tourne sur sa chaîne, pas sur une clé à toi.")}{" "}
              {fourniture === "credits"
                ? tx("Chaque action débite ton solde de crédits, que tu suis dans « Crédits IA ».")
                : tx("Elle est comprise dans ton abonnement : tu n'as rien à avancer.")}{" "}
              {anthropic.configured
                ? tx("Une clé enregistrée auparavant reste inutilisée tant que cette fourniture dure ; tu la retrouveras si ton revendeur te dispense.")
                : null}
            </Alert>
          ) : null}
          {kind === "reseller" && !cleProposee ? (
            <Alert tone="info">
              {tx("L'IA de ton réseau tourne sur les crédits que tu achètes à la plateforme : aucune clé Anthropic à brancher. Ton solde et tes recharges sont dans « Mes crédits ».")}
            </Alert>
          ) : null}

          {cleProposee ? (
            <ByokForm
              configured={anthropic.configured}
              hint={anthropic.hint}
              encryptionReady={anthropic.encryptionReady}
            />
          ) : null}

          <StripeKeyForm
            configured={stripe.configured}
            hint={stripe.hint}
            encryptionReady={stripe.encryptionReady}
          />
        </>
      )}
    </div>
  );
}
