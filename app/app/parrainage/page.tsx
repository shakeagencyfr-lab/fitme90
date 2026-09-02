import { redirect } from "next/navigation";
import { getT, userLocale } from "@/lib/i18n/server";
import { dateLocale, type Locale } from "@/lib/i18n";
import { getSessionContext } from "@/lib/guard";
import { clientAffiliation } from "@/lib/affiliation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/config";
import { ReferralLink } from "@/components/referral-link";

export const metadata = { title: "Parrainage" };
export const dynamic = "force-dynamic";

const fmtDate = (iso: string, locale: Locale) =>
  new Date(iso).toLocaleDateString(dateLocale(locale), { day: "2-digit", month: "short", year: "numeric" });

export default async function ClientReferralPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/parrainage");

  const tenantId = ctx.profile?.tenant_id ?? null;
  const aff = await clientAffiliation(ctx.userId, tenantId);
  if (!aff.enabled) redirect("/app");
  const { locale, t } = await getT(await userLocale(ctx.userId));

  // Slug du coach pour construire le lien d'inscription brandé.
  let slug: string | null = null;
  if (tenantId) {
    const admin = createAdminClient();
    const { data } = await admin.from("tenants").select("slug").eq("id", tenantId).maybeSingle<{ slug: string }>();
    slug = data?.slug ?? null;
  }

  const base = SITE_URL || "";
  const link = aff.code && slug ? `${base}/inscription?c=${slug}&ref=${aff.code}` : null;
  const convertedCount = aff.referrals.filter((r) => r.converted).length;

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[clamp(24px,5vw,32px)] leading-[1.05] tracking-[-0.03em] text-ink">{t("referral.title")}</h1>
        <p className="text-[14px] leading-[1.6] text-muted">
          {t("referral.intro")}
        </p>
      </div>

      {/* Récompense */}
      {aff.reward ? (
        <div className="flex items-start gap-3 rounded-card border border-brand/30 bg-brand/[0.06] p-4">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-archivo font-bold text-[15px] text-ink">{t("referral.reward")}</span>
            <span className="text-[13.5px] leading-[1.5] text-body">{aff.reward}</span>
          </div>
        </div>
      ) : null}

      {/* Lien */}
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <div className="font-archivo font-bold text-[16px] text-ink">{t("referral.link")}</div>
        {link ? (
          <ReferralLink url={link} />
        ) : (
          <p className="text-[13.5px] text-muted">{t("referral.linkSoon")}</p>
        )}
      </div>

      {/* Filleuls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="font-archivo font-bold text-[16px] text-ink">{t("referral.referred")}</div>
          <span className="text-[12.5px] text-muted-2">
            {aff.referrals.length} inscrit{aff.referrals.length > 1 ? "s" : ""} · {convertedCount} abonné{convertedCount > 1 ? "s" : ""}
          </span>
        </div>
        {aff.referrals.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-4 bg-surface-2 px-5 py-6 text-center text-[13.5px] text-muted-2">
            {t("referral.nobody")}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {aff.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-ink">{r.name || t("referral.newMember")}</span>
                  <span className="text-[12px] text-muted-2">{t("referral.joinedOn")} {fmtDate(r.joinedAt, locale)}</span>
                </div>
                <span className={`rounded-pill px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${r.converted ? "bg-brand/10 text-brand" : "border border-line-4 text-muted-2"}`}>
                  {r.converted ? t("referral.subscribed") : t("referral.signedUp")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
