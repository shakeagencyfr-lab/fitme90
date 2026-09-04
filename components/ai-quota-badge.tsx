"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/locale-provider";

/**
 * Ce qu'il reste au client pour aujourd'hui, là où il dépense.
 *
 * Le solde n'existait que dans le chat. Or les trois actions puisent dans le
 * même compteur : régénérer une recette ou demander une alternative faisait
 * baisser un nombre que le client ne voyait qu'ailleurs, et il découvrait le
 * mur sans l'avoir vu approcher. Le badge est donc posé à côté de CHAQUE
 * bouton qui consomme.
 *
 * Il se rafraîchit après chaque action grâce à `refreshKey` : c'est l'appelant
 * qui incrémente ce nombre quand il vient de dépenser. Sans ce signal, le
 * badge afficherait le solde d'avant l'action, ce qui est pire que rien.
 */
export function AiQuotaBadge({
  refreshKey = 0,
  className = "",
}: {
  /** Change de valeur après chaque action IA de l'appelant. */
  refreshKey?: number;
  className?: string;
}) {
  const t = useT();
  const [quota, setQuota] = useState<{ remaining: number | null; limit: number } | null>(null);

  useEffect(() => {
    // Le drapeau évite d'écrire dans un composant démonté, ou d'écraser une
    // lecture plus récente quand deux actions s'enchaînent vite.
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch("/api/coach/quota");
        if (!res.ok || !vivant) return;
        const q = (await res.json()) as { remaining: number | null; limit: number };
        if (vivant) setQuota(q);
      } catch {
        // Silencieux : un solde qu'on n'a pas pu lire ne doit pas alarmer le
        // client ni bloquer le bouton qu'il s'apprête à presser.
      }
    })();
    return () => {
      vivant = false;
    };
  }, [refreshKey]);

  // Rien à dire tant qu'on ne sait pas, et rien à dire non plus quand le coach
  // n'a posé aucune limite : afficher « illimité » attirerait l'attention sur
  // un compteur qui n'existe pas.
  if (!quota || quota.limit <= 0 || quota.remaining == null) return null;

  const reste = quota.remaining;
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em]",
        reste === 0 ? "bg-alert text-alert-ink" : "bg-surface-2 text-muted-2",
        className,
      ].filter(Boolean).join(" ")}
    >
      <span className={`size-1.5 rounded-full ${reste === 0 ? "bg-alert-ink" : "bg-brand"}`} />
      {reste === 0
        ? t("quota.none")
        : t("quota.left", { n: reste, total: quota.limit })}
    </span>
  );
}
