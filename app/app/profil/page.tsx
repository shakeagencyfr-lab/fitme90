import Link from "next/link";
import { getSessionContext } from "@/lib/guard";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accessLabel } from "@/lib/access";
import { Card, MonoLabel, Stat } from "@/components/ui";
import { PasswordChange, AccountActions } from "@/components/profil-actions";
import { ProfileMeasures } from "@/components/profile-measures";
import { StartDateSetting } from "@/components/start-date-setting";
import { NotificationSetting } from "@/components/notification-setting";
import { ThemeToggle } from "@/components/theme-toggle";
import { RestartOnboarding } from "@/components/onboarding-tour";
import { BillingCard, type BillingKind } from "@/components/billing-card";
import { userOrders } from "@/lib/orders";
import { clientOffer } from "@/lib/offers";
import { confirmCardUpdate } from "@/lib/card-update";
import { addMonthsUnix, scheduleFor, type Schedule } from "@/lib/installments";
import { isAdminEmail } from "@/lib/admin";
import { COACH_CREDENTIAL } from "@/lib/config";
import { LangSwitch } from "@/components/lang-switch";
import { getT, userLocale } from "@/lib/i18n/server";

export const metadata = { title: "Profil" };

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ carte_session_id?: string; carte_annule?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/profil");
  const sp = await searchParams;

  // Retour du changement de carte : on pose la nouvelle carte AVANT de lire
  // l'état, pour que la page reflète ce qui vient d'être fait.
  let notice: "card_updated" | "card_failed" | null = null;
  if (sp.carte_session_id) {
    notice = (await confirmCardUpdate(ctx.userId, sp.carte_session_id)) ? "card_updated" : "card_failed";
  }

  const supabase = await createClient();
  const [{ data: prof }, { data: lastWeight }, orders, offer] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "name, age, height_cm, rest_hr, start_date, sex, paid, managed_by_coach, stripe_customer_id, subscription_id, subscription_status, subscription_interval, subscription_current_period_end, subscription_cancel_at_period_end, subscription_cancel_at, subscription_installments, subscription_paid_in_full",
      )
      .eq("id", ctx.userId)
      .maybeSingle<{
        name: string | null;
        age: number | null;
        height_cm: number | null;
        rest_hr: number | null;
        start_date: string | null;
        sex: string | null;
        paid: boolean | null;
        managed_by_coach: boolean | null;
        stripe_customer_id: string | null;
        subscription_id: string | null;
        subscription_status: string | null;
        subscription_interval: string | null;
        subscription_current_period_end: string | null;
        subscription_cancel_at_period_end: boolean | null;
        subscription_cancel_at: string | null;
        subscription_installments: number | null;
        subscription_paid_in_full: boolean | null;
      }>(),
    supabase
      .from("weights")
      .select("kg")
      .eq("user_id", ctx.userId)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ kg: number }>(),
    userOrders(ctx.userId),
    clientOffer(ctx.userId),
  ]);
  const str = (v: number | null | undefined) => (v != null ? String(v) : "");

  // « Ma facturation » : ce qui va être prélevé, et quand. Un compte tenu par
  // le coach n'a rien à venir ; un paiement en une fois non plus ; les
  // mensualités ont un échéancier, reconstitué depuis le premier encaissement.
  const firstSubOrder = [...orders].reverse().find((o) => o.kind === "subscription" && o.status === "paid");
  const onceOrder = orders.find((o) => o.kind === "one_time" && o.status === "paid");
  const installments = prof?.subscription_installments ?? null;
  let billing: BillingKind = "none";
  let schedule: Schedule | null = null;
  if (prof?.subscription_id && installments) {
    billing = "installments";
    const monthly = offer?.price_month_cents ?? firstSubOrder?.amount_cents ?? 0;
    const start =
      firstSubOrder?.paid_at ??
      (prof.subscription_cancel_at
        ? new Date(addMonthsUnix(Math.floor(new Date(prof.subscription_cancel_at).getTime() / 1000), -installments) * 1000).toISOString()
        : new Date().toISOString());
    schedule = scheduleFor(start, monthly, installments);
  } else if (prof?.subscription_id) {
    billing = "legacy";
  } else if (prof?.managed_by_coach) {
    billing = "internal";
  } else if (onceOrder || prof?.paid) {
    billing = "once";
  }
  const showBilling = billing !== "none" || ctx.access.phase !== "not_paid";
  const { locale, t } = await getT(await userLocale(ctx.userId));

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {prof?.name?.trim() || t("nav.profile")}
        </h1>
        {prof?.name?.trim() ? <MonoLabel>{t("profile.title")}</MonoLabel> : null}
      </div>

      <ProfileMeasures
        age={str(prof?.age)}
        weight={str(lastWeight?.kg)}
        height={str(prof?.height_cm)}
        rest={str(prof?.rest_hr)}
        sex={prof?.sex ?? ""}
      />

      {["scheduled", "active", "grace"].includes(ctx.access.phase) ? (
        <StartDateSetting current={prof?.start_date ?? ""} />
      ) : null}

      {showBilling ? (
        <BillingCard
          kind={billing}
          paidAt={onceOrder?.paid_at ?? null}
          schedule={schedule}
          status={prof?.subscription_status ?? null}
          interval={prof?.subscription_interval ?? null}
          periodEnd={prof?.subscription_current_period_end ?? null}
          cancelAtPeriodEnd={!!prof?.subscription_cancel_at_period_end}
          paidInFull={!!prof?.subscription_paid_in_full}
          canChangeCard={!!prof?.stripe_customer_id}
          notice={notice}
        />
      ) : null}

      <NotificationSetting />

      <Card className="flex flex-col gap-3">
        <MonoLabel>{t("profile.account")}</MonoLabel>
        <div className="text-[15px] text-ink">{ctx.email}</div>
        <Stat label={t("profile.access")} value={accessLabel(ctx.access, locale)} />
        <p className="text-[12.5px] text-muted-2">{t("profile.designedBy", { credential: COACH_CREDENTIAL.toLowerCase() })}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <MonoLabel>{t("common.language")}</MonoLabel>
        <LangSwitch className="self-start" />
        <p className="text-[12.5px] text-muted-2">{t("profile.languageHint")}</p>
        <div className="h-px bg-line-2" />
        <MonoLabel>{t("profile.appearance")}</MonoLabel>
        <ThemeToggle className="self-start" />
        <div className="h-px bg-line-2" />
        <MonoLabel>{t("profile.onboarding")}</MonoLabel>
        <RestartOnboarding className="self-start" />
      </Card>

      {isAdminEmail(ctx.email) ? (
        <Card className="flex flex-col gap-2">
          <MonoLabel className="text-brand">Espace coach</MonoLabel>
          <Link href="/admin" className="font-archivo font-semibold text-[16px] text-ink hover:text-brand">
            Ouvrir le dashboard admin →
          </Link>
          <p className="text-[12.5px] text-muted-2">Clients inscrits et configuration de l&apos;IA de génération.</p>
        </Card>
      ) : null}

      <PasswordChange />
      <AccountActions />

      <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-2">
        <Link href="/mentions-legales" className="hover:text-ink">{t("profile.legal")}</Link>
        <Link href="/confidentialite" className="hover:text-ink">{t("profile.privacy")}</Link>
        <Link href="/cgv" className="hover:text-ink">CGV</Link>
      </nav>
    </div>
  );
}
