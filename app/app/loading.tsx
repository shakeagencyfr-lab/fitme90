// Squelette affiché INSTANTANÉMENT pendant que la page se charge côté serveur.
// Comme le layout (barre de navigation) reste monté, changer d'onglet paraît
// immédiat : le contenu bascule sur ce squelette au lieu d'attendre la page.
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[880px] animate-pulse flex-col gap-5" aria-hidden>
      <div className="h-9 w-1/2 rounded-control bg-line-2" />
      <div className="h-4 w-3/4 rounded bg-line-2" />
      <div className="h-32 rounded-card bg-line-2" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-card bg-line-2" />
        <div className="h-24 rounded-card bg-line-2" />
      </div>
      <div className="h-40 rounded-card bg-line-2" />
    </div>
  );
}
