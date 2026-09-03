import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminOrNull } from "@/lib/admin";
import { tx } from "@/lib/i18n/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantNode } from "@/lib/hierarchy";
import { Alert, Card, MonoLabel } from "@/components/ui";
import { BrandNameForm, FullNameForm, PasswordForm } from "@/components/account-forms";

export const metadata = { title: "Mon compte" };
export const dynamic = "force-dynamic";

// Réglages du compte.
//
// Cette page redirigeait vers « Intégrations » depuis une fusion précédente :
// le nom de la plateforme, choisi une fois à la création, n'était donc plus
// modifiable nulle part une fois la landing en ligne. Elle redevient un vrai
// écran, et « Intégrations » garde ce qui la concerne (clés Anthropic, Stripe).
export default async function AdminAccountPage() {
  const ctx = await getAdminOrNull();
  if (!ctx) redirect("/connexion");
  const tenantId = ctx.profile?.tenant_id ?? null;

  const admin = createAdminClient();
  const [{ data: tenant }, node] = await Promise.all([
    tenantId
      ? admin.from("tenants").select("name, slug").eq("id", tenantId).maybeSingle<{ name: string; slug: string | null }>()
      : Promise.resolve({ data: null }),
    tenantId ? tenantNode(tenantId) : Promise.resolve(null),
  ]);

  const kind = node?.kind ?? "coach";
  const email = ctx.email ?? "";
  const fullName = ctx.profile?.name ?? "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Mon compte")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {tx("Tes informations, le nom de ta plateforme et ton mot de passe. Les réglages visuels de ta page publique sont dans Marque blanche, les clés dans Intégrations.")}</p>
      </div>

      {!tenantId ? (
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      ) : (
        <>
          <FullNameForm current={fullName} email={email} />
          <BrandNameForm current={tenant?.name ?? ""} />
          <PasswordForm />

          {/* Repères : ce qui identifie le compte mais ne se modifie pas ici. */}
          <Card className="flex flex-col gap-3">
            <MonoLabel>{tx("Repères du compte")}</MonoLabel>
            <dl className="flex flex-col divide-y divide-line-2 text-[13.5px]">
              <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
                <dt className="text-muted">{tx("Type de compte")}</dt>
                <dd className="font-semibold text-ink">
                  {kind === "platform" ? tx("Plateforme") : kind === "reseller" ? tx("Revendeur") : tx("Coach")}
                </dd>
              </div>
              {tenant?.slug ? (
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-muted">{tx("Identifiant public")}</dt>
                  <dd className="font-mono text-[12.5px] text-body">{tenant.slug}</dd>
                </div>
              ) : null}
            </dl>
            <p className="text-[12.5px] leading-[1.55] text-muted-2">
              {tx("Le logo, les couleurs, l'adresse personnalisée et le domaine se règlent dans")}{" "}
              <Link href="/admin/marque-blanche" className="font-semibold text-brand underline underline-offset-2">
                {tx("Marque blanche")}</Link>
              {tx(". Les clés Anthropic et Stripe sont dans")}{" "}
              <Link href="/admin/integrations" className="font-semibold text-brand underline underline-offset-2">
                {tx("Intégrations")}</Link>.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
