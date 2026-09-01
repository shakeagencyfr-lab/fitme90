// Logotype My Fitness App : typographique, minimaliste. « App » prend la couleur
// principale (celle du tenant en marque blanche, l'orange par défaut).
export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-baseline whitespace-nowrap font-archivo font-extrabold tracking-[-0.03em] text-ink"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      My&nbsp;Fitness&nbsp;<span className="text-brand">App</span>
    </span>
  );
}

// Marque affichée en marque blanche : le logo du coach s'il en a un, sinon son
// nom, sinon le wordmark My Fitness App par défaut. `imgClass` fixe la hauteur du logo.
export function CoachMark({
  brand,
  size = 20,
  imgClass = "h-8",
}: {
  brand?: { name: string; logoUrl: string | null } | null;
  size?: number;
  imgClass?: string;
}) {
  if (brand?.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logoUrl} alt={brand.name} className={`${imgClass} w-auto max-w-[200px] object-contain`} />;
  }
  if (brand?.name) {
    return (
      <span className="whitespace-nowrap font-archivo font-extrabold tracking-[-0.02em] text-ink" style={{ fontSize: size, lineHeight: 1 }}>
        {brand.name}
      </span>
    );
  }
  return <Wordmark size={size} />;
}
