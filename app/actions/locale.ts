"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { getSessionContext } from "@/lib/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Bascule de langue : cookie (1 an) pour tout visiteur, et mémorisée sur le
// profil de la personne connectée pour que l'IA (y compris le cron des blocs)
// écrive dans sa langue même sans cookie.
export async function setLocaleAction(raw: string): Promise<{ ok: boolean; locale?: Locale }> {
  if (!isLocale(raw)) return { ok: false };
  const store = await cookies();
  store.set(LOCALE_COOKIE, raw, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  try {
    const ctx = await getSessionContext();
    if (ctx?.userId) {
      await createAdminClient().from("profiles").update({ language: raw }).eq("id", ctx.userId);
    }
  } catch {
    /* pas connecté ou base injoignable : le cookie suffit */
  }
  revalidatePath("/", "layout");
  return { ok: true, locale: raw };
}
