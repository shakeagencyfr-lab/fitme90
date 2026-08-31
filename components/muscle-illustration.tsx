// Illustration abstraite d'une silhouette avec le groupe musculaire ciblé mis en
// avant (couleur de marque). Sert de visuel de repli quand un exercice n'a pas
// de photo (fiche IA), pour qu'AUCUN exercice ne reste sans visuel.

type Region =
  | "chest" | "back" | "shoulders" | "arms" | "forearms"
  | "abs" | "thighs" | "glutes" | "calves" | "full";

// Mappe un libellé de muscle (FR/EN, libre) vers les zones à mettre en avant.
function regionsFor(muscle: string | null | undefined): Set<Region> {
  const m = (muscle || "").toLowerCase();
  const has = (...w: string[]) => w.some((x) => m.includes(x));
  const set = new Set<Region>();
  if (has("pect", "poitrine", "chest")) set.add("chest");
  if (has("dos", "dorsa", "lat", "back", "trapèze", "trapeze", "traps", "rhombo")) set.add("back");
  if (has("épaule", "epaule", "deltoï", "deltoi", "shoulder", "delt")) set.add("shoulders");
  if (has("biceps", "triceps", "bras", "arm")) set.add("arms");
  if (has("avant-bras", "avant bras", "forearm")) set.add("forearms");
  if (has("abdo", "gainage", "core", "oblique", "ventre", "ab ")) set.add("abs");
  if (has("quadri", "cuisse", "ischio", "jambe", "leg", "thigh", "hamstring")) set.add("thighs");
  if (has("fessier", "glute", "hanche", "hip")) set.add("glutes");
  if (has("mollet", "calf", "calve", "soléaire", "soleaire")) set.add("calves");
  if (has("cardio", "full", "corps", "body", "pliom")) set.add("full");
  if (set.size === 0) set.add("full");
  return set;
}

export function MuscleIllustration({ muscle, className }: { muscle: string | null; className?: string }) {
  const on = regionsFor(muscle);
  const active = (r: Region) => on.has(r) || on.has("full");
  const ACC = "var(--color-brand)";
  const base = "currentColor";
  const fill = (r: Region) => (active(r) ? ACC : base);
  const op = (r: Region) => (active(r) ? 0.92 : 0.14);

  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden="true">
      <g stroke="none">
        {/* Tête */}
        <circle cx="60" cy="17" r="10" fill={base} opacity={0.14} />
        {/* Cou */}
        <rect x="55" y="26" width="10" height="7" rx="3" fill={base} opacity={0.14} />
        {/* Épaules */}
        <circle cx="38" cy="40" r="9" fill={fill("shoulders")} opacity={op("shoulders")} />
        <circle cx="82" cy="40" r="9" fill={fill("shoulders")} opacity={op("shoulders")} />
        {/* Pectoraux / haut du torse (dos highlight partage cette zone) */}
        <path d="M42 36 h36 a6 6 0 0 1 6 6 v10 a10 10 0 0 1 -10 8 h-28 a10 10 0 0 1 -10 -8 v-10 a6 6 0 0 1 6 -6 z"
          fill={fill(on.has("back") && !on.has("chest") ? "back" : "chest")}
          opacity={active("chest") || active("back") ? 0.92 : 0.14} />
        {/* Bras (haut) */}
        <rect x="24" y="42" width="9" height="30" rx="4.5" fill={fill("arms")} opacity={op("arms")} />
        <rect x="87" y="42" width="9" height="30" rx="4.5" fill={fill("arms")} opacity={op("arms")} />
        {/* Avant-bras */}
        <rect x="23" y="72" width="8" height="24" rx="4" fill={fill("forearms")} opacity={op("forearms")} />
        <rect x="89" y="72" width="8" height="24" rx="4" fill={fill("forearms")} opacity={op("forearms")} />
        {/* Abdominaux */}
        <rect x="47" y="62" width="26" height="24" rx="5" fill={fill("abs")} opacity={op("abs")} />
        {/* Bassin / fessiers */}
        <path d="M45 86 h30 v8 a10 10 0 0 1 -10 8 h-10 a10 10 0 0 1 -10 -8 z" fill={fill("glutes")} opacity={op("glutes")} />
        {/* Cuisses */}
        <rect x="46" y="100" width="12" height="30" rx="6" fill={fill("thighs")} opacity={op("thighs")} />
        <rect x="62" y="100" width="12" height="30" rx="6" fill={fill("thighs")} opacity={op("thighs")} />
        {/* Mollets */}
        <rect x="47" y="130" width="10" height="18" rx="5" fill={fill("calves")} opacity={op("calves")} />
        <rect x="63" y="130" width="10" height="18" rx="5" fill={fill("calves")} opacity={op("calves")} />
      </g>
    </svg>
  );
}
