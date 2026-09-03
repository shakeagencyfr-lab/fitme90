"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

// Effets pilotés par le défilement, sans aucune dépendance.
//
// Trois règles tenues partout dans ce fichier :
//
// 1. On ne lit la position qu'UNE fois par frame. Chaque effet s'abonne à une
//    boucle unique (voir useScrollTick) au lieu de poser son propre listener :
//    six effets sur une page, c'est six lectures de layout par pixel scrollé
//    sinon, et la page se met à saccader sur un portable.
// 2. On n'écrit que des variables CSS et des transform. Jamais de top/left,
//    jamais de width : ce sont les seules propriétés que le compositeur traite
//    sans recalculer la mise en page.
// 3. Rien ne bouge si le visiteur a demandé moins de mouvement. Les effets ne
//    se contentent pas de ralentir : ils rendent le contenu dans son état
//    final, tout de suite. Un bloc figé à mi-animation serait pire que pas
//    d'animation du tout.

/** Le visiteur a-t-il demandé moins de mouvement ? */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    queueMicrotask(() => setReduced(mq.matches));
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

// ── Boucle de défilement partagée ───────────────────────────────────────────
type Tick = () => void;
const subscribers = new Set<Tick>();
let running = false;
let frame = 0;

function pump() {
  frame = 0;
  for (const fn of subscribers) fn();
}

function onScrollOrResize() {
  if (frame) return; // déjà une frame en vol : on ne réordonne pas la file
  frame = requestAnimationFrame(pump);
}

function subscribe(fn: Tick): () => void {
  subscribers.add(fn);
  if (!running) {
    running = true;
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
  }
  fn();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) {
      running = false;
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/**
 * Abonne une fonction à la boucle partagée, tant que `active` est vrai.
 *
 * La référence est mise à jour DANS un effet, pas pendant le rendu : écrire
 * une ref en cours de rendu casse le rendu concurrent, où React peut préparer
 * un arbre puis l'abandonner.
 */
function useScrollTick(fn: Tick, active = true) {
  const ref = useRef<Tick>(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  useEffect(() => {
    if (!active) return;
    return subscribe(() => ref.current());
  }, [active]);
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ── Barre de progression de lecture ─────────────────────────────────────────
export function ScrollProgress({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useScrollTick(() => {
    const el = ref.current;
    if (!el) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    el.style.transform = `scaleX(${max > 0 ? clamp01(window.scrollY / max) : 0})`;
  });
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] ${className}`}>
      <div ref={ref} className="h-full origin-left bg-brand" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}

// ── Section épinglée qui défile latéralement ────────────────────────────────
/**
 * On descend, la section reste collée, et le contenu part sur le côté.
 *
 * La hauteur réservée vaut `panels × 100vh` : c'est ce qui donne la « course »
 * verticale à convertir en déplacement horizontal. Trop courte, la traversée
 * est brutale ; trop longue, on a l'impression que la page s'est bloquée.
 *
 * Sur mobile (et sans pointeur fin), tout ceci est remplacé par un rail que
 * l'on fait glisser au doigt : détourner le défilement vertical d'un téléphone
 * est le plus sûr moyen de faire fuir un visiteur.
 */
export function HorizontalPin({
  children,
  panels,
  className = "",
  hint,
  heading,
}: {
  children: ReactNode;
  /** Nombre de vues côte à côte. Sert à calculer la course verticale. */
  panels: number;
  className?: string;
  hint?: string;
  /**
   * Titre rendu DANS le cadre épinglé. Un titre laissé au-dessus de la section
   * disparaît dès que l'épinglage commence : on se retrouve à regarder des
   * cartes glisser dans une fenêtre vide, sans savoir de quoi elles parlent.
   */
  heading?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const [pinnable, setPinnable] = useState(false);

  // L'épinglage n'a de sens qu'avec un pointeur fin et une fenêtre large.
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover)");
    const on = () => setPinnable(mq.matches);
    queueMicrotask(on);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const active = pinnable && !reduced;

  useScrollTick(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    const rect = wrap.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    const p = travel > 0 ? clamp01(-rect.top / travel) : 0;
    // scrollWidth - clientWidth : la distance réelle à parcourir, quel que
    // soit le nombre de cartes ou leur largeur.
    const dist = track.scrollWidth - track.clientWidth;
    track.style.transform = `translate3d(${-p * dist}px,0,0)`;
    if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
  }, active);

  if (!active) {
    // Repli : un rail horizontal classique, glissé au doigt.
    return (
      <div className={className}>
        {heading ? <div className="px-5 pb-8 sm:px-8">{heading}</div> : null}
        <div className="rail-x rail-fade gap-5 px-5 pb-4 sm:px-8">{children}</div>
        {hint ? (
          <div className="mt-1 flex items-center gap-2 px-5 font-mono text-[11px] uppercase tracking-[0.14em] opacity-50 sm:px-8">
            <span className="h-px w-8 bg-current opacity-40" aria-hidden />
            {hint}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={className} style={{ height: `${panels * 100}vh` }}>
      <div className="sticky top-0 flex h-dvh flex-col justify-center gap-10 overflow-hidden pt-24">
        {heading ? <div className="shrink-0 px-[8vw]">{heading}</div> : null}
        <div ref={trackRef} data-hpin-track className="flex gap-8 px-[8vw] will-change-transform">
          {children}
        </div>
        <div aria-hidden className="mx-[8vw] h-px shrink-0 bg-current opacity-15">
          <div ref={barRef} className="h-px origin-left bg-brand" style={{ transform: "scaleX(0)" }} />
        </div>
        {hint ? (
          <div className="flex shrink-0 items-center gap-2 px-[8vw] font-mono text-[11px] uppercase tracking-[0.14em] opacity-40">
            <span className="h-px w-8 bg-current opacity-50" aria-hidden />
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Parallaxe ───────────────────────────────────────────────────────────────
/** Décale l'élément à contre-sens du défilement. `speed` en fraction de vue. */
export function Parallax({
  children,
  speed = 0.12,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  useScrollTick(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Position du centre de l'élément dans la fenêtre, de -1 à 1.
    const c = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
    el.style.transform = `translate3d(0, ${-c * speed * 100}px, 0)`;
  }, !reduced);
  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}

// ── Révélation mot à mot ────────────────────────────────────────────────────
/**
 * Le texte s'assemble mot par mot à l'entrée. Les mots restent des mots :
 * on n'insère pas de <span> par lettre, sinon un lecteur d'écran épelle.
 */
export function SplitWords({
  text,
  className = "",
  step = 45,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  step?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (reduced || typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setShown(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { setShown(true); io.disconnect(); }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, reduced]);

  const words = text.split(" ");
  return (
    <Tag ref={ref as never} className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden align-bottom">
          <span
            className="inline-block will-change-transform"
            style={
              {
                transform: shown ? "none" : "translateY(105%)",
                opacity: shown ? 1 : 0,
                transition: `transform 720ms cubic-bezier(.22,1,.36,1) ${i * step}ms, opacity 520ms linear ${i * step}ms`,
              } as CSSProperties
            }
          >
            {w}
          </span>
          {i < words.length - 1 ? <span>&nbsp;</span> : null}
        </span>
      ))}
    </Tag>
  );
}

// ── Compteur ────────────────────────────────────────────────────────────────
/** Compte jusqu'à `to` quand l'élément entre dans la vue. */
export function Counter({
  to,
  suffix = "",
  duration = 1400,
  className = "",
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [v, setV] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced || typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setV(to));
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const p = clamp01((t - t0) / duration);
          // easeOutCubic : le chiffre ralentit en arrivant, comme un compteur
          // mécanique. Une progression linéaire fait mécanique bon marché.
          setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to, duration, reduced]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {v}
      {suffix}
    </span>
  );
}

// ── Halo qui suit le curseur ────────────────────────────────────────────────
/** Halo doux sous le pointeur. Purement décoratif, coupé au tactile. */
export function Spotlight({ className = "", size = 520 }: { className?: string; size?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  const move = useCallback((e: PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--x", `${e.clientX}px`);
    el.style.setProperty("--y", `${e.clientY}px`);
    el.style.opacity = "1";
  }, []);

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [move, reduced]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 opacity-0 transition-opacity duration-500 ${className}`}
      style={{
        background: `radial-gradient(${size}px circle at var(--x, 50%) var(--y, 30%), color-mix(in srgb, var(--color-brand) 16%, transparent), transparent 65%)`,
      }}
    />
  );
}

// ── Carte qui s'incline sous le pointeur ────────────────────────────────────
export function Tilt({
  children,
  className = "",
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  /** Inclinaison maximale, en degrés. Au-delà de 8, ça devient un gadget. */
  max?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || reduced) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateZ(0)`;
  }
  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}

// ── Bandeau défilant piloté par le scroll ───────────────────────────────────
/** Le texte glisse d'autant plus qu'on descend : le mouvement suit la lecture. */
export function ScrollMarquee({
  items,
  className = "",
  seconds = 34,
  reverse = false,
}: {
  items: string[];
  className?: string;
  seconds?: number;
  reverse?: boolean;
}) {
  // Deux pistes identiques côte à côte, chacune translatée de -100 % de sa
  // propre largeur : quand la première a fini de sortir, la seconde occupe
  // exactement sa place et la boucle ne se voit pas.
  const track = (prefix: string) => (
    <div
      className={`auto-marquee ${reverse ? "auto-marquee-rev" : ""} flex shrink-0 items-center gap-10 whitespace-nowrap pr-10`}
      style={{ ["--marquee-dur" as string]: `${seconds}s` }}
    >
      {items.map((t, i) => (
        <span key={`${prefix}-${t}-${i}`} className="inline-flex items-center gap-10">
          {t}
          <span className="inline-block size-1.5 rounded-full bg-brand" />
        </span>
      ))}
    </div>
  );
  return (
    <div aria-hidden className={`flex overflow-hidden ${className}`}>
      {track("a")}
      {track("b")}
    </div>
  );
}
