import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

// ------------------------------------------------------------------ *
// Kit UI FitMe90 — composants primitifs partagés (README : Card, Stat,
// NavItem, MonoLabel, Button…). Sans ombre : bordures et fonds seulement.
// Mobile-first : cibles 44px, texte lisible, plein largeur par défaut.
// ------------------------------------------------------------------ */

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Conteneur centré, largeur de lecture maîtrisée. */
export function Container({
  children,
  className,
  max = "max-w-[1040px]",
}: {
  children: ReactNode;
  className?: string;
  max?: string;
}) {
  return (
    <div className={cx("mx-auto w-full px-5 sm:px-8", max, className)}>
      {children}
    </div>
  );
}

/** Surtitre / étiquette en Plex Mono majuscules. */
export function MonoLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "font-mono uppercase tracking-[0.12em] text-[10px] text-muted-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={cx(
        "bg-surface border border-line rounded-card p-5 sm:p-[22px]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Chiffre-clé + libellé (README : Stat). */
export function Stat({
  value,
  label,
  sub,
}: {
  value: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <MonoLabel>{label}</MonoLabel>
      <div className="font-archivo font-extrabold text-[28px] leading-none tracking-[-0.03em] text-ink">
        {value}
      </div>
      {sub ? <div className="text-[13px] text-muted">{sub}</div> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

const buttonBase =
  "tap inline-flex items-center justify-center gap-2 rounded-btn px-5 font-plex font-semibold text-[15px] leading-none transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 select-none";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-hover disabled:bg-disabled disabled:text-white/90",
  outline:
    "border border-line-4 text-ink bg-surface hover:border-ink disabled:text-disabled disabled:border-line",
  ghost: "text-body hover:text-ink disabled:text-disabled",
  danger:
    "border border-alert-line text-alert-ink bg-alert hover:border-brand disabled:opacity-60",
};

export function Button({
  variant = "primary",
  full,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  full?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      className={cx(buttonBase, buttonVariants[variant], full && "w-full", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? "…" : children}
    </button>
  );
}

/** Bouton d'apparence identique mais rendu comme lien (navigation). */
export function ButtonLink({
  href,
  variant = "primary",
  full,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(buttonBase, buttonVariants[variant], full && "w-full", className)}
    >
      {children}
    </Link>
  );
}

/** Encadré d'alerte / d'ereur en français (README : fond #FFF4EE). */
export function Alert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "info";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-control border px-4 py-3 text-[14px] leading-relaxed",
        tone === "error"
          ? "bg-alert border-alert-line text-alert-ink"
          : "bg-surface-2 border-line text-body",
      )}
    >
      {children}
    </div>
  );
}

/** Champ texte avec label. Input à 16px (anti-zoom iOS) hérité du CSS global. */
export function Field({
  label,
  help,
  id,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium text-body-2">{label}</span>
      <input
        id={id}
        className={cx(
          "tap w-full rounded-control border border-line-4 bg-surface px-3.5 text-ink placeholder:text-disabled outline-none focus:border-ink",
          className,
        )}
        {...rest}
      />
      {help ? <span className="text-[12px] text-muted-2">{help}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  help,
  id,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  help?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium text-body-2">{label}</span>
      <textarea
        id={id}
        className={cx(
          "w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-ink placeholder:text-disabled outline-none focus:border-ink min-h-[88px]",
          className,
        )}
        {...rest}
      />
      {help ? <span className="text-[12px] text-muted-2">{help}</span> : null}
    </label>
  );
}
