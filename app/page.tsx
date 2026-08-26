import Link from "next/link";
import { PRICE_EUR, PROGRAM_DAYS, GRACE_DAYS, COACH_CREDENTIAL, COACH_ORIGIN } from "@/lib/config";
import { GridScan, AppPreview, MacroOrbit } from "@/components/landing-visuals";

export const metadata = {
  title: "FitMe90 — Ta transformation en 90 jours, ultra-personnalisée",
  description:
    "90 jours pour transformer ton corps : programme d'entraînement périodisé sur ta salle et accompagnement nutritionnel personnalisés, conçus par un coach professionnel diplômé d'État. Paiement unique, sans abonnement.",
};

/* ------------------------------------------------------------------ *
 * Landing de vente — thème sombre « sport premium », autonome.
 * Emplacements photo : fond en dégradé + photo optionnelle superposée
 * (public/img/hero.jpg, public/img/salle.jpg). Si le fichier manque,
 * le dégradé s'affiche seul — aucune image cassée.
 * ------------------------------------------------------------------ */

// — Icônes (stroke, currentColor) ---------------------------------------
type IconProps = { className?: string };
const S = {
  ai: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M12 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 9 17a3 3 0 0 0 6 0 3 3 0 0 0 2-5.8A3 3 0 0 0 15 6a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3v18M9 6h.01M17 11.2h.01M7 11.2H7M15 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  camera: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  shield: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M12 3l7 2.5V11c0 4.6-3 8-7 9.5C8 19 5 15.6 5 11V5.5L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  dumbbell: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M6.5 8v8M4 9.5v5M17.5 8v8M20 9.5v5M6.5 12h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  heart: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.6 12 20 12 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 12.5h3l1.5-2.5 2 4 1.5-3 1 1.5H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  grid: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  timer: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <circle cx="12" cy="14" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 14V10M9.5 2.5h5M12 7V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  chat: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16.5H9l-4 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 10.5h8M8 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M5 12.5l4 4 10-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrow: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spark: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15l-1.6-4.4L5.5 9l4.9-1.1L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  chevron: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const features = [
  { icon: S.ai, title: "IA de dernière génération", body: "Le programme complet — exercices, séries, charges, progressions, menus et macros — écrit sur mesure à partir de ton profil." },
  { icon: S.camera, title: "Analyse de ta salle", body: "Tu photographies tes machines : le plan n'utilise que le matériel réellement disponible, rien d'inaccessible." },
  { icon: S.shield, title: "100 % personnalisé", body: "Pathologies, allergies, régime, cadre religieux : chaque contrainte est prise en compte pour un programme sûr." },
  { icon: S.dumbbell, title: "3 cycles périodisés", body: "Adaptation, intensification, spécialisation — 90 jours structurés, charges progressives et logique expliquée." },
  { icon: S.heart, title: "Zones cardiaques Karvonen", body: "Tes zones d'intensité calculées précisément pour tirer le meilleur de chaque séance de cardio." },
  { icon: S.grid, title: "Espace client complet", body: "Séances interactives, calendrier, journal, courbe de poids — tout ton suivi au quotidien, au même endroit." },
  { icon: S.timer, title: "Outils d'entraînement", body: "Minuteur de repos intégré, journal série par série (kg × reps), coches et progression pour rester focus." },
  { icon: S.chat, title: "Coach IA personnel", body: "Disponible en continu, formé sur ton profil. Il répond, motive, et adapte le plan et la diète tout seul." },
];

const salleBullets = [
  "Haltères, barres, câbles, machines guidées",
  "Home-gym au matériel limité",
  "Salle communautaire ou hôtel",
  "Entraînement au poids du corps uniquement",
];

const steps = [
  { k: "01", title: "Réponds au questionnaire", body: "Objectifs, niveau, disponibilités, santé, allergies, préférences alimentaires et cadre religieux." },
  { k: "02", title: "Photographie ta salle", body: "L'IA lit le matériel disponible sur tes images pour adapter chaque exercice à ce que tu as." },
  { k: "03", title: "Accède à ton espace", body: "Ton plan de 90 jours t'attend dans ton espace client. Tu le suis séance par séance, jour après jour." },
];

const phases = [
  { tag: "J1 → J30", title: "Adaptation", body: "On installe la technique, la base et l'habitude. Gestes propres, charges maîtrisées, régularité qui s'ancre." },
  { tag: "J31 → J60", title: "Intensification", body: "On monte le volume et les charges. Le corps encaisse davantage, la composition commence à bouger visiblement." },
  { tag: "J61 → J90", title: "Spécialisation", body: "On concentre l'effort sur ton objectif : pic de forme, densité, définition. Le résultat des 90 jours se lit ici." },
];

const forWho = [
  { title: "Débutant complet", body: "On part de ta technique, sans te jeter dans le grand bain." },
  { title: "Une blessure ou une pathologie", body: "Écran santé au départ, exercices adaptés, validation médecin au besoin." },
  { title: "Allergies, végé, halal, casher", body: "Tes contraintes alimentaires respectées dans toute la nutrition." },
  { title: "Peu de temps", body: "Tu choisis tes jours ; les séances sont calibrées pour ta réalité." },
  { title: "Salle ou maison", body: "On n'utilise que ton matériel, où que tu t'entraînes." },
  { title: "Repris après une pause", body: "Le cycle d'adaptation te remet en route sans te cramer." },
];

const includes = [
  "Programme d'entraînement périodisé sur 90 jours, calé sur ta salle",
  "Accompagnement nutritionnel jour par jour (menus, macros, liste de courses)",
  "Séance guidée : minuteur, journal série par série, progression",
  "Coach IA inclus toute la durée — il adapte le plan et la diète en autonomie",
  "Suivi visuel : courbe de poids, mensurations, IMC, zones cardio",
  `Plan consultable ${GRACE_DAYS} jours de plus après la fin (lecture seule)`,
];

const faqs = [
  { q: "Faut-il une salle ou du matériel particulier ?", a: "Non. Tu photographies ce que tu as — salle complète, home-gym ou quelques haltères — et le programme se construit uniquement avec ce matériel." },
  { q: "Je suis débutant, est-ce que c'est adapté ?", a: "Oui. Le premier cycle (J1 → J30) est dédié à la technique et à l'installation de l'habitude. On progresse ensuite graduellement, sans brûler les étapes." },
  { q: "Le coach IA remplace-t-il un vrai coach ?", a: `Le programme est conçu par un ${COACH_CREDENTIAL.toLowerCase()}. Le coach IA prolonge cet accompagnement au quotidien : il répond, motive et ajuste le plan. C'est un accompagnement sportif et de bien-être, sans visée thérapeutique.` },
  { q: "Et la nutrition, tu es diététicien ?", a: "Non, et je ne prétends pas l'être. FitMe90 propose un accompagnement nutritionnel et une aide au choix des repas adaptée à ton profil — ce n'est pas une prescription diététique ni le traitement d'une pathologie. Pour tout suivi médical ou nutritionnel thérapeutique, adresse-toi à un professionnel de santé." },
  { q: "Que se passe-t-il après les 90 jours ?", a: `Le coach IA se désactive à la fin du programme, mais ton plan d'entraînement reste consultable ${GRACE_DAYS} jours de plus en lecture seule.` },
  { q: "J'ai une blessure, une pathologie ou une grossesse ?", a: "Un écran santé au démarrage repère les situations à risque. Selon les cas, le programme est adapté ou mis en pause en attendant l'avis de ton médecin. FitMe90 ne remplace jamais un avis médical." },
  { q: "Y a-t-il un abonnement ?", a: `Aucun. C'est un paiement unique de ${PRICE_EUR} €, sans reconduction ni prélèvement caché. Le paiement est sécurisé par Stripe.` },
  { q: "Puis-je l'offrir à quelqu'un ?", a: "Oui. FitMe90 peut être offert : un code cadeau débloque le programme complet de 90 jours, sans passer par le paiement." },
];

const espaceBullets = [
  "Séances interactives",
  "Checklist des exercices",
  "Chronomètre & minuteur",
  "Nutrition du jour",
  "Suivi de progression",
  "Coach IA en un tap",
];

const nutritionBullets = [
  "Halal / casher",
  "Végétarien / végétalien",
  "Allergies personnalisées",
  "Intolérances (lactose, gluten…)",
  "Recettes par semaine",
  "Macros journaliers",
];

// Section « preuve » — arguments FACTUELS et vérifiables (aucun faux avis :
// publier des témoignages inventés serait une pratique commerciale trompeuse).
const proofPoints = [
  { icon: S.shield, title: "Coach diplômé d'État", body: "Programmes conçus par un coach professionnel diplômé d'État et de l'université des sports." },
  { icon: S.dumbbell, title: "Méthode périodisée", body: "Trois cycles structurés — adaptation, intensification, spécialisation — pas des séances au hasard." },
  { icon: S.camera, title: "Vraiment sur-mesure", body: "Ta salle scannée, tes pathologies, tes allergies et tes jours pris en compte. Rien de générique." },
  { icon: S.chat, title: "Coach IA inclus 90 jours", body: "Un accompagnement au quotidien qui répond, motive et adapte le plan et la diète en autonomie." },
  { icon: S.spark, title: "Sans abonnement", body: "Un paiement unique. Aucune reconduction, aucun prélèvement caché, paiement sécurisé Stripe." },
  { icon: S.grid, title: "Données protégées (RGPD)", body: "Tes données sont hébergées dans l'Union européenne et traitées conformément au RGPD." },
];

const NAV = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#methode", label: "Comment ça marche" },
  { href: "#garanties", label: "Garanties" },
  { href: "#tarifs", label: "Tarifs" },
];

// Classes réutilisées
const chip =
  "inline-flex items-center gap-2 rounded-pill border border-brand/40 bg-brand/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brand";
const sectionTitle =
  "font-archivo font-extrabold tracking-[-0.03em] text-white text-[clamp(30px,5.5vw,52px)] leading-[1.02] text-balance";

export default function LandingPage() {
  return (
    <div className="min-h-dvh scroll-smooth bg-[#0a0b0c] text-white [scrollbar-color:#333_#0a0b0c]">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0b0c]/85 backdrop-blur-md safe-top">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="#top" className="font-archivo text-[21px] font-extrabold tracking-[-0.02em] text-white">
            FitMe<span className="text-brand">90</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-[14px] font-medium text-white/70 transition-colors hover:text-white">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/connexion" className="hidden text-[14px] font-medium text-white/70 transition-colors hover:text-white sm:inline">
              Connexion
            </Link>
            <Link
              href="/inscription"
              className="tap inline-flex items-center gap-1.5 rounded-btn bg-brand px-4 py-2.5 text-[14px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
            >
              Commencer
              <S.arrow className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[#0a0b0c]" />
          {/* Grille animée en perspective (côté droit), masquée derrière le texte */}
          <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[62%] overflow-hidden opacity-60 [mask-image:linear-gradient(to_left,#000,transparent)]">
            <div className="lv-grid-plane" />
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#0a0b0c] via-[#0a0b0c]/85 to-transparent" />
          {/* Halo orange */}
          <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-brand/25 blur-[130px]" />
          {/* Filigrane 90 */}
          <div className="pointer-events-none absolute bottom-2 right-3 -z-10 select-none font-archivo text-[clamp(120px,26vw,320px)] font-extrabold leading-none tracking-[-0.05em] text-white/[0.04]">
            90
          </div>

          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-5 pb-24 pt-[clamp(48px,9vw,96px)] sm:px-8">
            <span className={chip}>
              <S.spark className="h-3.5 w-3.5" />
              Propulsé par IA de dernière génération
            </span>
            <h1 className="max-w-[15ch] font-archivo text-[clamp(46px,10vw,104px)] font-extrabold leading-[0.92] tracking-[-0.045em] text-balance text-white">
              Ta transformation <span className="text-brand">en 90 jours.</span> Ultra-personnalisée.
            </h1>
            <p className="max-w-[54ch] text-[clamp(16px,2.2vw,20px)] leading-[1.55] text-white/70">
              Sport + nutrition générés par IA selon ton profil, ta salle, tes
              contraintes de santé et tes préférences. Un programme complet de 3
              mois, suivi au quotidien depuis ton espace client, avec un coach IA
              à tes côtés.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
              <Link
                href="/inscription"
                className="tap inline-flex h-[54px] items-center justify-center gap-2 rounded-btn bg-brand px-8 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
              >
                Créer mon programme
                <S.arrow className="h-4.5 w-4.5" />
              </Link>
              <a
                href="#methode"
                className="tap inline-flex h-[54px] items-center justify-center rounded-btn border border-white/20 bg-white/5 px-8 text-[16px] font-semibold text-white transition-colors duration-150 hover:border-white/40 hover:bg-white/10"
              >
                Comment ça marche
              </a>
            </div>
            <div className="flex flex-wrap gap-x-7 gap-y-3 pt-3">
              {["Pathologies prises en compte", "Allergies & régimes", "Coach IA inclus"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2 text-[13.5px] text-white/65">
                  <S.check className="h-4 w-4 text-brand" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Bandeau repères */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="mx-auto grid w-full max-w-[1120px] grid-cols-2 gap-y-6 px-5 py-8 sm:px-8 lg:grid-cols-4">
            {[
              { v: "90", l: "jours de programme périodisé" },
              { v: "100 %", l: "adapté à ta salle & ta santé" },
              { v: `${PRICE_EUR} €`, l: "paiement unique, sans abonnement" },
              { v: "D.E.", l: "coach professionnel diplômé d'État" },
            ].map((s) => (
              <div key={s.l} className="flex flex-col gap-1 px-2">
                <div className="font-archivo text-[clamp(26px,4vw,36px)] font-extrabold leading-none tracking-[-0.03em] text-white">
                  {s.v}
                </div>
                <div className="text-[13px] leading-[1.4] text-white/55">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className={chip}>Fonctionnalités</span>
              <h2 className={sectionTitle}>Tout ce qu'il faut pour réussir</h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.6] text-white/60">
                Chaque détail est pensé pour rendre ta transformation aussi
                efficace et simple que possible.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`flex flex-col gap-4 rounded-card border p-6 transition-colors ${
                    i === 2 ? "border-brand/50 bg-brand/[0.06]" : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-brand/30 bg-brand/10 text-brand">
                    <f.icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-archivo text-[18px] font-bold leading-snug tracking-[-0.01em] text-white">
                    {f.title}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-white/60">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Analyse de la salle */}
        <section className="border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(56px,8vw,96px)] sm:px-8 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <span className={chip}>
                <S.camera className="h-3.5 w-3.5" />
                Analyse IA de ta salle
              </span>
              <h2 className="font-archivo text-[clamp(28px,4.5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
                Ta salle analysée. Ton programme adapté.
              </h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.65] text-white/65">
                Photographie ta salle de sport — qu'il s'agisse d'une salle
                commerciale, d'un home-gym ou d'une salle communautaire. L'IA
                identifie le matériel disponible et s'assure que chaque exercice
                de ton programme est réalisable avec ce que tu as.
              </p>
              <ul className="flex flex-col gap-2.5 pt-1">
                {salleBullets.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-[15px] text-white/75">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            {/* Visuel animé : scan de la salle */}
            <GridScan label="IA en cours d'analyse — matériel détecté" />
          </div>
        </section>

        {/* Espace client */}
        <section id="espace" className="scroll-mt-24">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(56px,8vw,96px)] sm:px-8 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <AppPreview />
            </div>
            <div className="order-1 flex flex-col gap-5 lg:order-2">
              <span className={chip}>
                <S.grid className="h-3.5 w-3.5" />
                Espace client
              </span>
              <h2 className="font-archivo text-[clamp(28px,4.5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
                Ton programme, vivant au quotidien.
              </h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.65] text-white/65">
                Plus qu'un document — ton programme est interactif. Coche tes
                exercices, lance ton chronomètre, consulte ta nutrition du jour
                et dialogue avec ton coach IA, directement depuis ton espace.
              </p>
              <ul className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                {espaceBullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-[14.5px] text-white/75">
                    <S.check className="h-4.5 w-4.5 shrink-0 text-brand" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Nutrition */}
        <section id="nutrition" className="scroll-mt-24 border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(56px,8vw,96px)] sm:px-8 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <span className={chip}>Nutrition</span>
              <h2 className="font-archivo text-[clamp(28px,4.5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
                Une nutrition aussi précise que ton entraînement.
              </h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.65] text-white/65">
                Calories, macros, timing des repas et recettes adaptées — et
                surtout, tes allergies, tes intolérances et ton cadre religieux
                (halal, casher, végétarien…) pris en compte. C'est une aide au
                choix des repas, pas une prescription diététique.
              </p>
              <ul className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                {nutritionBullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-[14.5px] text-white/75">
                    <S.check className="h-4.5 w-4.5 shrink-0 text-brand" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <MacroOrbit />
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="methode" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className={chip}>Comment ça marche</span>
              <h2 className={sectionTitle}>3 étapes vers ta transformation</h2>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.k} className="flex flex-col gap-3">
                  <div className="font-archivo text-[64px] font-extrabold leading-none tracking-[-0.04em] text-white/10">
                    {s.k}
                  </div>
                  <h3 className="font-archivo text-[20px] font-bold tracking-[-0.02em] text-white">
                    {s.title}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-white/60">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Programme — les 3 cycles */}
        <section id="programme" className="scroll-mt-24 border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col gap-4">
              <span className={chip}>Ton corps sur 90 jours</span>
              <h2 className="max-w-[22ch] font-archivo text-[clamp(28px,4.5vw,46px)] font-extrabold leading-[1.04] tracking-[-0.03em] text-white">
                Trois cycles pensés pour que le changement tienne.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {phases.map((p, i) => (
                <div key={p.title} className="flex flex-col gap-3 rounded-card border border-white/10 bg-white/[0.03] p-7">
                  <div className="font-archivo text-[30px] font-extrabold leading-none tracking-[-0.03em] text-white/12">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand">{p.tag}</span>
                  <h3 className="font-archivo text-[22px] font-bold tracking-[-0.02em] text-white">{p.title}</h3>
                  <p className="text-[14.5px] leading-[1.6] text-white/60">{p.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-[64ch] text-[14px] leading-[1.6] text-white/50">
              À la fin des 90 jours, le coach IA se désactive, mais ton plan
              d'entraînement reste consultable {GRACE_DAYS} jours de plus, en
              lecture seule.
            </p>
          </div>
        </section>

        {/* Est-ce pour toi */}
        <section className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <h2 className={`${sectionTitle} max-w-[16ch]`}>Est-ce pour toi ?</h2>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {forWho.map((w) => (
                <div key={w.title} className="flex items-start gap-3 rounded-card border border-white/10 bg-white/[0.03] p-5">
                  <S.check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div className="flex flex-col gap-1">
                    <div className="font-archivo text-[15.5px] font-semibold leading-snug text-white">{w.title}</div>
                    <div className="text-[13.5px] leading-[1.55] text-white/55">{w.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Garanties / preuve (arguments factuels, pas de faux avis) */}
        <section id="garanties" className="scroll-mt-24 border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className={chip}>Garanties</span>
              <h2 className={sectionTitle}>Pourquoi tu peux t'y fier</h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.6] text-white/60">
                Pas de promesse en l'air : des engagements concrets et vérifiables.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {proofPoints.map((p) => (
                <div key={p.title} className="flex flex-col gap-4 rounded-card border border-white/10 bg-white/[0.03] p-6">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-brand/30 bg-brand/10 text-brand">
                    <p.icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-archivo text-[18px] font-bold leading-snug tracking-[-0.01em] text-white">
                    {p.title}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-white/60">{p.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-[12.5px] text-white/40">
              Les premiers témoignages clients enrichiront cette page au fil des
              accompagnements.
            </p>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[1120px] px-5 pb-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className={chip}>Tarifs</span>
              <h2 className={sectionTitle}>Un seul paiement. Tout inclus.</h2>
            </div>
            <div className="mx-auto mt-12 w-full max-w-[760px] overflow-hidden rounded-card-lg border border-white/12 bg-gradient-to-b from-white/[0.06] to-white/[0.02]">
              <div className="flex flex-col gap-6 p-[clamp(28px,5vw,44px)]">
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/45">Programme complet</span>
                    <div className="flex items-end gap-3">
                      <span className="font-archivo text-[clamp(48px,9vw,68px)] font-extrabold leading-none tracking-[-0.03em] text-white">
                        {PRICE_EUR} €
                      </span>
                      <span className="pb-2 text-[14px] text-white/55">paiement unique</span>
                    </div>
                    <span className="text-[14px] text-white/55">{PROGRAM_DAYS} jours · coach IA inclus · sans abonnement</span>
                  </div>
                  <Link
                    href="/inscription"
                    className="tap inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-btn bg-brand px-8 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98] sm:w-auto"
                  >
                    Créer mon programme
                    <S.arrow className="h-4.5 w-4.5" />
                  </Link>
                </div>
                <ul className="grid gap-x-6 gap-y-3 border-t border-white/10 pt-6 sm:grid-cols-2">
                  {includes.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-white/75">
                      <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
                      {it}
                    </li>
                  ))}
                </ul>
                <p className="text-[13px] leading-[1.55] text-white/45">
                  On t'a offert FitMe90 ? Un code cadeau débloque le programme
                  complet à l'inscription, sans paiement. Paiement sécurisé par
                  Stripe.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto w-full max-w-[820px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className={chip}>FAQ</span>
              <h2 className={sectionTitle}>Questions fréquentes</h2>
            </div>
            <div className="mt-10 overflow-hidden rounded-card border border-white/10 bg-white/[0.03]">
              {faqs.map((f, i) => (
                <details key={f.q} className={`group ${i > 0 ? "border-t border-white/10" : ""}`}>
                  <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-[18px] font-archivo text-[15.5px] font-semibold leading-snug text-white [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <S.chevron className="h-4.5 w-4.5 shrink-0 text-white/50 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-5 text-[14px] leading-[1.65] text-white/60">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-brand/20 blur-[140px]" />
          <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-7 px-5 py-[clamp(72px,11vw,130px)] text-center sm:px-8">
            <h2 className="max-w-[18ch] font-archivo text-[clamp(32px,6vw,60px)] font-extrabold leading-[1.0] tracking-[-0.035em] text-balance text-white">
              90 jours à partir d'aujourd'hui, ou dans un an au même point ?
            </h2>
            <Link
              href="/inscription"
              className="tap inline-flex h-[56px] items-center justify-center gap-2 rounded-btn bg-brand px-9 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
            >
              Créer mon programme
              <S.arrow className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-5 py-12 sm:px-8">
          <Link href="#top" className="font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-white">
            FitMe<span className="text-brand">90</span>
          </Link>
          <p className="max-w-[70ch] text-[13px] leading-[1.6] text-white/50">
            Application et programmes conçus par un {COACH_ORIGIN}.
            Accompagnement sportif et de bien-être, sans visée thérapeutique.
            L'accompagnement nutritionnel est une aide au choix des repas, pas
            une prescription diététique.
          </p>
          <p className="max-w-[70ch] text-[12.5px] leading-[1.6] text-white/40">
            FitMe90 ne remplace pas un avis médical. En cas de pathologie, de
            grossesse ou de blessure, valide le programme avec ton médecin avant
            de commencer.
          </p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-[13px] text-white/50">
            <Link href="/connexion" className="transition-colors hover:text-white">Connexion</Link>
            <Link href="/mentions-legales" className="transition-colors hover:text-white">Mentions légales</Link>
            <Link href="/confidentialite" className="transition-colors hover:text-white">Confidentialité</Link>
            <Link href="/cgv" className="transition-colors hover:text-white">CGV</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
