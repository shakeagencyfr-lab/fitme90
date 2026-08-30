"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, Button, Field } from "@/components/ui";
import {
  signInAction,
  signUpAction,
  signUpCoachAction,
  requestResetAction,
  updatePasswordAction,
  type AuthState,
} from "@/app/(auth)/actions";

const initial: AuthState = {};

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

export function LoginForm({ suite }: { suite?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title>Connexion</Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {suite ? <input type="hidden" name="suite" value={suite} /> : null}
      <Field
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="lea@exemple.fr"
      />
      <Field
        id="password"
        name="password"
        type="password"
        label="Mot de passe"
        autoComplete="current-password"
        required
      />
      <div className="-mt-1">
        <Link href="/mot-de-passe-oublie" className="text-[13px] text-muted hover:text-ink">
          Mot de passe oublié ?
        </Link>
      </div>
      <Button type="submit" full loading={pending}>
        Se connecter
      </Button>
      <p className="text-[14px] text-muted text-center">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-brand font-medium">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ coachSlug, offerId, interval }: { coachSlug?: string; offerId?: string; interval?: string }) {
  const [state, action, pending] = useActionState(signUpAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title sub="Un e-mail de confirmation te sera envoyé.">Créer ton compte</Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {coachSlug ? <input type="hidden" name="coach_slug" value={coachSlug} /> : null}
      {offerId ? <input type="hidden" name="offer_id" value={offerId} /> : null}
      {interval === "month" || interval === "year" ? <input type="hidden" name="interval" value={interval} /> : null}
      <Field
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="lea@exemple.fr"
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
        <input
          type="checkbox"
          name="cgv"
          className="mt-0.5 size-4 accent-brand shrink-0"
          required
        />
        <span>
          J'accepte les{" "}
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
        Créer mon compte
      </Button>
      <p className="text-[14px] text-muted text-center">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-brand font-medium">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

export function CoachSignupForm() {
  const [state, action, pending] = useActionState(signUpCoachAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title sub="Crée ton espace coach. Un e-mail de confirmation te sera envoyé.">
        Créer mon espace coach
      </Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field
        id="tenant_name"
        name="tenant_name"
        type="text"
        label="Nom de ta marque / salle"
        required
        placeholder="Ex : Studio Forme, Coach Léa…"
        help="C'est le nom que verront tes clients (marque blanche)."
      />
      <Field
        id="coach_name"
        name="coach_name"
        type="text"
        label="Ton prénom (coach)"
        placeholder="Ex : Léa"
        help="Le prénom sous lequel l'assistant IA s'adressera à tes clients."
      />
      <Field
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="lea@exemple.fr"
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
        Créer mon espace
      </Button>
      <p className="text-center text-[14px] text-muted">
        Déjà un espace coach ?{" "}
        <Link href="/connexion" className="font-medium text-brand">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestResetAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title sub="On t'envoie un lien pour choisir un nouveau mot de passe.">
        Mot de passe oublié
      </Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.notice ? <Alert tone="info">{state.notice}</Alert> : null}
      <Field
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        inputMode="email"
        required
      />
      <Button type="submit" full loading={pending}>
        Envoyer le lien
      </Button>
      <p className="text-[14px] text-muted text-center">
        <Link href="/connexion" className="text-brand font-medium">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Title>Nouveau mot de passe</Title>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field
        id="password"
        name="password"
        type="password"
        label="Nouveau mot de passe"
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
      <Button type="submit" full loading={pending}>
        Enregistrer
      </Button>
    </form>
  );
}
