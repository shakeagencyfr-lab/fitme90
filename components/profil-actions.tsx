"use client";

import { useActionState, useState } from "react";
import { useT } from "@/components/locale-provider";
import { changePassword, deleteAccount, type ProfilState } from "@/app/app/profil/actions";
import { signOutAction } from "@/app/(auth)/actions";
import { Button, Field, Alert, Card, MonoLabel } from "@/components/ui";

export function PasswordChange() {
  const [state, action, pending] = useActionState(changePassword, {} as ProfilState);
  const t = useT();
  return (
    <Card as="section">
      <form action={action} className="flex flex-col gap-3">
        <MonoLabel>{t("profile.password")}</MonoLabel>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{t("profile.passwordUpdated")}</Alert> : null}
        <Field id="password" name="password" type="password" label={t("profile.newPassword")} autoComplete="new-password" />
        <Field id="confirm" name="confirm" type="password" label={t("profile.confirm")} autoComplete="new-password" />
        <Button type="submit" loading={pending} className="self-start h-11">{t("profile.change")}</Button>
      </form>
    </Card>
  );
}

export function AccountActions() {
  const [confirming, setConfirming] = useState(false);
  const t = useT();
  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <MonoLabel>{t("profile.myData")}</MonoLabel>
        <a
          href="/api/export"
          className="tap inline-flex w-fit items-center rounded-btn border border-line-4 bg-surface px-5 text-[15px] font-semibold text-ink hover:border-ink"
        >
          {t("profile.exportData")}
        </a>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="h-11">{t("profile.logout")}</Button>
        </form>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <MonoLabel>{t("profile.danger")}</MonoLabel>
        {!confirming ? (
          <Button variant="danger" onClick={() => setConfirming(true)} className="self-start h-11">
            {t("profile.deleteAccount")}
          </Button>
        ) : (
          <form action={deleteAccount} className="flex flex-col gap-3">
            <Alert>
              {t("profile.deleteWarning")}
            </Alert>
            <div className="flex gap-2">
              <Button type="submit" variant="danger" className="h-11">{t("profile.confirmDelete")}</Button>
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)} className="h-11">{t("common.cancel")}</Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
