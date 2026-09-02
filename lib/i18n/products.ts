import type { TFn } from "./index";

// Textes de vente des deux produits (3 mois / 12 mois) dans la langue de la
// page. La source des durées et des prix reste lib/config.ts (PRODUCTS).
export interface ProductCopy {
  name: string;
  promise: string;
  pitch: string;
  bullets: string[];
}

export function productCopy(months: number, t: TFn): ProductCopy | null {
  if (months === 3) {
    return {
      name: t("products.threeName"),
      promise: t("products.threePromise"),
      pitch: t("products.threePitch"),
      bullets: [t("products.threeBullets.a"), t("products.threeBullets.b"), t("products.threeBullets.c")],
    };
  }
  if (months === 12) {
    return {
      name: t("products.twelveName"),
      promise: t("products.twelvePromise"),
      pitch: t("products.twelvePitch"),
      bullets: [
        t("products.twelveBullets.a"),
        t("products.twelveBullets.b"),
        t("products.twelveBullets.c"),
        t("products.twelveBullets.d"),
      ],
    };
  }
  return null;
}

/** « 3 mois » / « 1 an » selon la langue. */
export function durationLabel(months: number, t: TFn): string {
  return months === 12 ? t("common.year") : t("products.monthsShort", { n: months });
}
