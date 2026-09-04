import { notFound } from "next/navigation";
import Link from "next/link";
import { publicLeadMagnetBySlug } from "@/lib/prospects";
import { LeadMagnetForm } from "@/components/lead-magnet-form";
import { themeProps } from "@/components/tenant-theme";
import { Reveal, RevealGroup } from "@/components/reveal";
import { ScrollMarquee } from "@/components/landing-templates/scroll-fx";
import { ThemeSwitch } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lm = await publicLeadMagnetBySlug(slug);
  if (!lm) return { title: "Mini-programme gratuit" };
  return {
    title: `Mini-programme gratuit, ${lm.name}`,
    description: "Reçois ta semaine découverte gratuite, calibrée pour ton objectif.",
    icons: lm.faviconUrl ? { icon: lm.faviconUrl } : undefined,
  };
}

/**
 * Ce que le document contient VRAIMENT.
 *
 * Ce qui fait la différence entre un lead magnet qu'on garde et un PDF qu'on
 * ferme, ce sont ces détails : l'échauffement, la charge à viser, quoi faire
 * quand la machine est prise. « Une semaine d'entraînement » ne convainc
 * personne, parce que tout le monde promet ça.
 */
const BENEFITS = [
  {
    titre: "Une semaine qui tient dans ton créneau",
    detail: "Jour par jour, repos compris, et un nombre d'exercices calculé pour finir à l'heure que tu as annoncée.",
  },
  {
    titre: "L'échauffement et la charge",
    detail: "Pour chaque exercice : par quoi commencer, quelle charge viser, et la consigne technique qui compte.",
  },
  {
    titre: "Adapté à tes articulations",
    detail: "Dos, genoux ou épaules sensibles : les mouvements qui chargent la zone sont écartés et remplacés, pas simplement supprimés.",
  },
  {
    titre: "Le plan des quatre semaines",
    detail: "Ce qu'il faut augmenter, de combien, et à quel moment, semaine par semaine. C'est là que la plupart des gens s'arrêtent.",
  },
  {
    titre: "Tes calories et tes macros, calculées",
    detail: "Calories du jour, protéines, glucides, lipides et eau, à partir de ton sexe, ton âge, ta taille et ton poids. Pas d'une moyenne.",
  },
  {
    titre: "Un tableau de suivi à imprimer",
    detail: "Les charges notées séance après séance : c'est ce qui rend la progression visible.",
  },
];

/** Le parcours, en trois temps. Une vraie séquence, d'où la numérotation. */
const ETAPES = [
  { n: "01", titre: "Trois écrans", detail: "Ton entraînement, ta pratique, tes mesures. Une minute, montre en main." },
  { n: "02", titre: "Le document arrive", detail: "Calculé tout de suite à partir de tes réponses, prêt à imprimer." },
  { n: "03", titre: "Tu t'entraînes", detail: "Une semaine calibrée pour toi, et le plan des trois suivantes." },
];

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default async function DecouvertePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lm = await publicLeadMagnetBySlug(slug);
  if (!lm) notFound();

  // Le bandeau défilant a besoin de deux copies collées pour boucler sans
  // couture ; on le nourrit des titres, qui sont courts.
  const bandeau = BENEFITS.map((b) => b.titre);

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper" {...themeProps(lm.theme)}>
      {/* ─────────────────────────── en-tête ─────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-[10px]">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href={`/c/${lm.slug}`} className="flex items-center gap-2.5">
            {lm.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lm.logoUrl} alt={lm.name} className="w-auto max-w-[180px] object-contain" style={{ height: "var(--wl-logo-h)" }} />
            ) : (
              <span className="font-archivo text-[18px] font-extrabold tracking-[-0.02em] text-ink">{lm.name}</span>
            )}
          </Link>
          <span className="flex items-center gap-2">
            {/* La page suit déjà le thème du visiteur ; encore faut-il qu'il
                puisse en changer sans quitter la page. */}
            <ThemeSwitch />
            <Link href={`/c/${lm.slug}`} className="underline-grow text-[13.5px] font-semibold text-muted hover:text-ink">
              Voir la page ↗
            </Link>
          </span>
        </div>
      </header>

      {/* ──────────────────────────── héros ──────────────────────────── */}
      {/* Pleine largeur : la lueur touche les deux bords de l'écran, et la
          colonne de contenu s'arrête où le texte redevient lisible. */}
      <section className="lm-aurora relative isolate overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_minmax(400px,0.95fr)] lg:items-start lg:gap-14 lg:py-20">
          <div className="flex flex-col gap-6">
            <Reveal>
              <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-brand/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
                <span className="lm-pulse size-1.5 rounded-full bg-brand" />
                Offert par {lm.name}
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="font-archivo text-[clamp(34px,6.4vw,68px)] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink text-balance">
                Ton mini-programme <span className="lm-souligne">gratuit</span>
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="max-w-[52ch] text-[clamp(16px,1.6vw,19px)] leading-[1.55] text-muted">
                Réponds à quelques questions et reçois immédiatement un document complet, prêt à imprimer.
                Pas une liste d&apos;exercices : une semaine calibrée sur ton créneau, ton matériel et tes articulations,
                avec tes calories et tes macros calculées.
              </p>
            </Reveal>

            {/* La semaine, en sept pastilles. Elles montent l'une après
                l'autre : c'est la promesse du document, montrée plutôt
                qu'écrite. */}
            <Reveal delay={200}>
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-2">Ta semaine</span>
                <div className="flex flex-wrap gap-1.5">
                  {JOURS.map((j, i) => (
                    <span
                      key={j}
                      style={{ animationDelay: `${300 + i * 70}ms` }}
                      className={[
                        "lm-jour flex h-11 min-w-[52px] items-center justify-center rounded-control border px-3 font-archivo text-[13.5px] font-bold",
                        i === 2 || i === 5
                          ? "border-line-4 bg-surface-2 text-muted-2"
                          : "border-transparent bg-brand text-white",
                      ].join(" ")}
                    >
                      {j}
                    </span>
                  ))}
                </div>
                <span className="text-[12.5px] text-muted-2">
                  Séances et repos placés selon le nombre de jours que tu indiques.
                </span>
              </div>
            </Reveal>
          </div>

          {/* Pas de `sticky` ici : un élément collant est borné par la boîte de
              son parent, et ce parent est la grille du héros. Il ne tiendrait
              donc pas pendant la lecture de la suite, ce que promettait le
              mot. Le retour au formulaire passe par le bouton de fin de page
              et, sur téléphone, par la barre du bas. */}
          <Reveal direction="scale" delay={120}>
            <div id="formulaire" className="scroll-mt-24">
              <LeadMagnetForm slug={lm.slug} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── bandeau défilant ───────────────────── */}
      {/* Le même composant que les landings : deux pistes identiques côte à
          côte, chacune translatée de sa propre largeur, donc pas de couture. */}
      <div className="border-y border-line bg-surface py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-2">
        <ScrollMarquee items={bandeau} seconds={42} />
      </div>

      {/* ────────────────────────── ce que tu reçois ──────────────────── */}
      <section className="mx-auto w-full max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20">
        <Reveal>
          <h2 className="max-w-[22ch] font-archivo text-[clamp(24px,3.4vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
            Ce qu&apos;il y a vraiment dedans
          </h2>
        </Reveal>
        <Reveal delay={70}>
          <p className="mt-3 max-w-[58ch] text-[15.5px] leading-[1.6] text-muted">
            Tout le monde promet « une semaine d&apos;entraînement ». Voilà les six choses qui font qu&apos;on
            la suit jusqu&apos;au bout au lieu de refermer le fichier.
          </p>
        </Reveal>

        <RevealGroup className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" step={80}>
          {BENEFITS.map((b, i) => (
            <article
              key={b.titre}
              className="lift group flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-5 transition-colors hover:border-ink/30"
            >
              <span className="flex size-9 items-center justify-center rounded-control bg-brand/10 font-mono text-[12px] font-bold text-brand">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-archivo text-[16.5px] font-bold leading-tight tracking-[-0.01em] text-ink">{b.titre}</h3>
              <p className="text-[14px] leading-[1.6] text-muted">{b.detail}</p>
            </article>
          ))}
        </RevealGroup>
      </section>

      {/* ─────────────────────────── comment ça marche ────────────────── */}
      <section className="border-y border-line bg-surface-2">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20">
          <Reveal>
            <h2 className="font-archivo text-[clamp(24px,3.4vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
              Trois étapes, aucune carte bancaire
            </h2>
          </Reveal>
          <RevealGroup className="mt-8 grid gap-3 md:grid-cols-3" step={110} direction="left">
            {ETAPES.map((e) => (
              <div key={e.n} className="flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-6">
                <span className="font-archivo text-[34px] font-extrabold leading-none tracking-[-0.04em] text-brand/25">{e.n}</span>
                <h3 className="font-archivo text-[17px] font-bold tracking-[-0.01em] text-ink">{e.titre}</h3>
                <p className="text-[14px] leading-[1.6] text-muted">{e.detail}</p>
              </div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ─────────────────────────── dernier appel ────────────────────── */}
      <section className="mx-auto w-full max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20">
        <Reveal direction="scale">
          <div className="lm-aurora relative isolate overflow-hidden rounded-card-lg border border-line bg-surface px-6 py-12 text-center sm:px-10 sm:py-16">
            <h2 className="mx-auto max-w-[20ch] font-archivo text-[clamp(24px,3.6vw,42px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
              La première séance est celle que personne ne fait
            </h2>
            <p className="mx-auto mt-3 max-w-[52ch] text-[15.5px] leading-[1.6] text-muted">
              Ce document existe pour lever le seul vrai obstacle : ne pas savoir par quoi commencer.
            </p>
            <a
              href="#formulaire"
              className="tap press mt-7 inline-flex h-12 items-center justify-center rounded-btn-lg bg-brand px-7 font-archivo text-[15px] font-bold text-white hover:bg-brand-hover"
            >
              Recevoir mon programme gratuit
            </a>
            <p className="mt-3 text-[12.5px] text-muted-2">
              Aucun paiement, aucun compte à créer. Désabonnement en un clic.
            </p>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line px-5 py-8 text-center sm:px-8">
        <p className="text-[12.5px] text-muted-2">
          Mini-programme offert par {lm.name}.{" "}
          <Link href={`/c/${lm.slug}`} className="text-brand hover:underline">
            Voir l&apos;accompagnement complet
          </Link>
        </p>
      </footer>

      {/* Barre d'action mobile : sur téléphone, le formulaire sort de l'écran
          dès qu'on commence à lire, et il faut remonter pour le retrouver. */}
      <div className="sticky bottom-0 z-20 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur-[10px] lg:hidden">
        <a
          href="#formulaire"
          className="tap press flex h-12 items-center justify-center rounded-btn bg-brand px-5 font-archivo text-[15px] font-bold text-white"
        >
          Recevoir mon programme gratuit
        </a>
      </div>
    </div>
  );
}
