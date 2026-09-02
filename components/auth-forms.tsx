"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, Button, Field } from "@/components/ui";
import { useT } from "@/components/locale-provider";
import {
  signInAction,
  signUpAction,
  signUpCoachAction,
  signUpResellerAction,
  requestResetAction,
  updatePasswordAction,
  type AuthState,
} from "@/app/(auth)/actions";

const initial: AuthState = {};

/** Case CGV + confidentialité (texte dans la langue de la page). */
function TermsCheckbox() {
  const t = useT();
  return (
    <label className="flex items-start gap-2.5 text-[13px] text-body leading-relaxed">
      <input type="checkbox" name="cgv" className="mt-0.5 size-4 accent-brand shrink-0" required />
      <span>
        {t("auth.acceptPrefix")}{" "}
        <Link href="/cgv" className="text-brand" target="_blank">
          {t("auth.terms")}
        </Link>{" "}
        {t("auth.acceptAnd")}{" "}
        <Link href="/confidentialite" className="text-brand" target="_blank">
          {t("auth.privacyPolicy")}
        </Link>
        .
      </span>
    </label>
  );
}

function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <h1 className="font-archivo font-extrabold text-[28px] leading-[1.05] tracking-[-0.03em] text-ink">
        {children}
      </h1>
      {sub ? <p className="text-[15px] text-muted leading-relaxed">{sub}</p> : null}
    </div>
  );
}

/** Suffixe de marque (?c=coach ou ?r=revendeur) pour que les liens croisés restent aux couleurs du bon compte. */
function brandQuery(coachSlug?: string, resellerSlug?: string): string {
  if (resellerSlug) return `?r=${encodeURIComponent(resellerSlug)}`;
  if (coachSlug) return `?c=${encodeURIComponent(coachSlug)}`;
  return "";
}

export function LoginForm({ suite, coachSlug, resellerSlug }: { suite?: string; coachSlug?: string; resellerSlug?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);
  const t = useT();
  const q = brandQuery(coachSlug, resellerSlug);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title>{t("auth.login")}</Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {suite ? <input type="hidden" name="suite" value={suite} /> : null}
      <Field
        id="email"
        name="email"
        type="email"
        label={t("auth.email")}
        autoComplete="email"
        inputMode="email"
        required
        placeholder="lea@exemple.fr"
      />
      <Field
        id="password"
        name="password"
        type="password"
        label={t("auth.password")}
        autoComplete="current-password"
        required
      />
      <div className="-mt-1">
        <Link href="/mot-de-passe-oublie" className="text-[13px] text-muted hover:text-ink">
          {t("auth.forgot")}
        </Link>
      </div>
      <Button type="submit" full loading={pending}>
        {t("auth.loginCta")}
      </Button>
      <p className="text-[14px] text-muted text-center">
        {t("auth.noAccount")}{" "}
        <Link href={`/inscription${q}`} className="text-brand font-medium">
          {t("auth.createAccount")}
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ coachSlug, offerId, interval, refCode }: { coachSlug?: string; offerId?: string; interval?: string; refCode?: string }) {
  const [state, action, pending] = useActionState(signUpAction, initial);
  const t = useT();
  const q = brandQuery(coachSlug);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title sub={t("auth.signupSub")}>{t("auth.signupTitle")}</Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {coachSlug ? <input type="hidden" name="coach_slug" value={coachSlug} /> : null}
      {offerId ? <input type="hidden" name="offer_id" value={offerId} /> : null}
      {interval === "month" || interval === "year" ? <input type="hidden" name="interval" value={interval} /> : null}
      {refCode ? <input type="hidden" name="ref" value={refCode} /> : null}
      <Field
        id="email"
        name="email"
        type="email"
        label={t("auth.email")}
        autoComplete="email"
        inputMode="email"
        required
        placeholder="lea@exemple.fr"
      />
      <Field
        id="password"
        name="password"
        type="password"
        label={t("auth.password")}
        autoComplete="new-password"
        required
        help={t("auth.passwordHint")}
      />
      <Field
        id="confirm"
        name="confirm"
        type="password"
        label={t("auth.confirmPassword")}
        autoComplete="new-password"
        required
      />
      <TermsCheckbox />
      <Button type="submit" full loading={pending}>
        {t("auth.signupCta")}
      </Button>
      <p className="text-[14px] text-muted text-center">
        {t("auth.haveAccount")}{" "}
        <Link href={`/connexion${q}`} className="text-brand font-medium">
          {t("auth.loginCta")}
        </Link>
      </p>
    </form>
  );
}

export function CoachSignupForm({ resellerSlug }: { resellerSlug?: string }) {
  const [state, action, pending] = useActionState(signUpCoachAction, initial);
  const t = useT();
  const q = brandQuery(undefined, resellerSlug);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title sub={t("auth.coachSignupSub")}>{t("auth.coachSignupTitle")}</Title>
      {resellerSlug ? <input type="hidden" name="reseller_slug" value={resellerSlug} /> : null}
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field
        id="tenant_name"
        name="tenant_name"
        type="text"
        label={t("auth.brandName")}
        required
        placeholder="Studio Forme, Coach Léa…"
        help={t("auth.brandNameHint")}
      />
      <Field
        id="coach_name"
        name="coach_name"
        type="text"
        label={t("auth.coachFirstName")}
        placeholder="Léa"
        help={t("auth.coachFirstNameHint")}
      />
      <Field
        id="email"
        name="email"
        type="email"
        label={t("auth.email")}
        autoComplete="email"
        inputMode="email"
        required
        placeholder="lea@exemple.fr"
      />
      <Field
        id="password"
        name="password"
        type="password"
        label={t("auth.password")}
        autoComplete="new-password"
        required
        help={t("auth.passwordHint")}
      />
      <Field
        id="confirm"
        name="confirm"
        type="password"
        label={t("auth.confirmPassword")}
        autoComplete="new-password"
        required
      />
      <TermsCheckbox />
      <Button type="submit" full loading={pending}>
        {t("auth.createSpace")}
      </Button>
      <p className="text-center text-[14px] text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href={`/connexion${q}`} className="font-medium text-brand">
          {t("auth.loginCta")}
        </Link>
      </p>
    </form>
  );
}

export function ResellerSignupForm() {
  const [state, action, pending] = useActionState(signUpResellerAction, initial);
  const t = useT();
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title sub="Crée ton espace revendeur : héberge tes coachs et salles, fixe tes prix, encaisse sur ton Stripe.">
        Créer mon espace revendeur
      </Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field
        id="tenant_name"
        name="tenant_name"
        type="text"
        label="Nom de ton réseau / enseigne"
        required
        placeholder="Ex : NordFit Distribution"
        help="Le nom sous lequel tu proposes My Fitness App à tes coachs / salles."
      />
      <Field
        id="contact_name"
        name="contact_name"
        type="text"
        label="Ton nom (contact)"
        placeholder="Ex : Camille"
      />
      <Field
        id="email"
        name="email"
        type="email"
        label={t("auth.email")}
        autoComplete="email"
        inputMode="email"
        required
        placeholder="camille@exemple.fr"
      />
      <Field
        id="password"
        name="password"
        type="password"
        label="Mot de passe"
        autoComplete="new-password"
        required
        help="8 caractères minimum."
      />
      <Field
        id="confirm"
        name="confirm"
        type="password"
        label="Confirme le mot de passe"
        autoComplete="new-password"
        required
      />
      <label className="flex items-start gap-2.5 text-[13px] text-body leading-relaxed">
        <input type="checkbox" name="cgv" className="mt-0.5 size-4 accent-brand shrink-0" required />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgv" className="text-brand" target="_blank">
            CGV
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" className="text-brand" target="_blank">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      <Button type="submit" full loading={pending}>
        Créer mon espace revendeur
      </Button>
      <p className="text-center text-[14px] text-muted">
        Déjà un espace ?{" "}
        <Link href="/connexion" className="font-medium text-brand">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestResetAction, initial);
  const t = useT();
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title sub={t("auth.resetSub")}>{t("auth.resetTitle")}</Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.notice ? <Alert tone="info">{state.notice}</Alert> : null}
      <Field
        id="email"
        name="email"
        type="email"
        label={t("auth.email")}
        autoComplete="email"
        inputMode="email"
        required
      />
      <Button type="submit" full loading={pending}>
        {t("auth.resetCta")}
      </Button>
      <p className="text-[14px] text-muted text-center">
        <Link href="/connexion" className="text-brand font-medium">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  const t = useT();
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title>{t("auth.newPasswordTitle")}</Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field
        id="password"
        name="password"
        type="password"
        label={t("auth.newPassword")}
        autoComplete="new-password"
        required
        help={t("auth.passwordHint")}
      />
      <Field
        id="confirm"
        name="confirm"
        type="password"
        label={t("auth.confirmPassword")}
        autoComplete="new-password"
        required
      />
      <Button type="submit" full loading={pending}>
        {t("common.save")}
      </Button>
    </form>
  );
}
