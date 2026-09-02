"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { makeT, DICTS, type Locale, type TFn } from "@/lib/i18n";

// Locale des composants client : posée par le layout (serveur), lue par
// `useT()`. Sans provider (page hors layout), on retombe sur le français.
// Un layout imbriqué (espace client, page d'un coach) peut fournir sa propre
// locale : l'attribut lang du document suit alors la plus proche.

const LocaleContext = createContext<Locale>("fr");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    if (document.documentElement.lang !== locale) document.documentElement.lang = locale;
  }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): TFn {
  const locale = useLocale();
  return useMemo(() => makeT(locale), [locale]);
}

/** Dictionnaire complet de la locale courante (pour les listes, ex. jours). */
export function useDict() {
  return DICTS[useLocale()];
}
