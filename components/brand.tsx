// Logotype My Fitness App (Archivo 800, le mot « App » en accent).
export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span
      className="font-archivo font-extrabold tracking-[-0.02em] text-ink"
      style={{ fontSize: size }}
    >
      My Fitness <span className="text-brand">App</span>
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
      <span className="font-archivo font-extrabold tracking-[-0.02em] text-ink" style={{ fontSize: size }}>
        {brand.name}
      </span>
    );
  }
  return <Wordmark size={size} />;
}
