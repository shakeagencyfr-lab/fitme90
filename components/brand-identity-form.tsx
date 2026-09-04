"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePhrase } from "@/components/locale-provider";
import { Alert, Button, Card, MonoLabel } from "@/components/ui";
import { saveIdentity, type BrandingState } from "@/app/admin/actions";
import type { BrandIdentity } from "@/lib/branding";

/**
 * Identité écrite de la marque.
 *
 * Ces champs sortent de l'écran : ils partent dans les e-mails, les
 * métadonnées de la page publique et les mentions légales. D'où la séparation
 * d'avec le thème, et d'où les explications à côté de chaque champ : un coach
 * doit comprendre où atterrit ce qu'il tape avant de le taper.
 */
export function BrandIdentityForm({
  identity,
  namePlaceholder,
}: {
  identity: BrandIdentity;
  namePlaceholder: string;
}) {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveIdentity, {} as BrandingState);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const input =
    "w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink";

  const field = (
    name: string,
    label: string,
    value: string | null,
    hint: string,
    extra: Record<string, unknown> = {},
  ) => (
    <label className="flex flex-col gap-1.5">
      <MonoLabel>{label}</MonoLabel>
      <input name={name} defaultValue={value ?? ""} className={input} {...extra} />
      <span className="text-[12px] leading-[1.5] text-muted-2">{hint}</span>
    </label>
  );

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Marque")}</div>
        <p className="text-[13px] leading-[1.55] text-muted">
          {tx("Les noms, l'adresse de contact et les liens légaux affichés à tes clients.")}
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("app_name", tx("Nom de l'application"), identity.appName, tx("Affiché dans les en-têtes, les e-mails et l'onglet du navigateur."), {
            maxLength: 60,
            placeholder: namePlaceholder,
          })}
          {field("legal_name", tx("Nom de l'entreprise"), identity.legalName, tx("Raison sociale, pour les pieds de page et les mentions légales."), {
            maxLength: 120,
          })}
        </div>

        {field("support_email", tx("E-mail de support"), identity.supportEmail, tx("Adresse à laquelle tes clients peuvent répondre."), {
          type: "email",
          maxLength: 190,
          placeholder: "contact@ta-marque.fr",
        })}

        <div className="grid gap-4 sm:grid-cols-2">
          {field("terms_url", tx("Lien des conditions d'utilisation"), identity.termsUrl, tx("Doit commencer par https://"), {
            type: "url",
            placeholder: "https://",
          })}
          {field("privacy_url", tx("Lien de la politique de confidentialité"), identity.privacyUrl, tx("Doit commencer par https://"), {
            type: "url",
            placeholder: "https://",
          })}
        </div>

        <div className="flex flex-col gap-4 rounded-control border border-line-4 bg-surface-2 p-4">
          <div className="flex flex-col gap-0.5">
            <MonoLabel>{tx("Référencement")}</MonoLabel>
            <span className="text-[12px] leading-[1.5] text-muted-2">
              {tx("Ce que Google et les réseaux sociaux affichent quand quelqu'un partage ta page. Laissé vide, on reprend ton titre et ton accroche.")}
            </span>
          </div>
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Titre SEO")}</MonoLabel>
            <input name="seo_title" defaultValue={identity.seoTitle ?? ""} maxLength={70} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Description SEO")}</MonoLabel>
            <textarea
              name="seo_description"
              defaultValue={identity.seoDescription ?? ""}
              maxLength={180}
              rows={2}
              className={`${input} leading-relaxed`}
            />
          </label>
        </div>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Marque enregistrée.")}</Alert> : null}

        <Button type="submit" loading={pending} className="h-11 self-start">
          {tx("Enregistrer")}
        </Button>
      </form>
    </Card>
  );
}
