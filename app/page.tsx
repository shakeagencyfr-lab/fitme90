import Link from "next/link";
import { Container, ButtonLink, MonoLabel } from "@/components/ui";
import { Wordmark } from "@/components/brand";
import { PRICE_EUR, PROGRAM_DAYS, GRACE_DAYS, COACH_CREDENTIAL } from "@/lib/config";

export const metadata = {
  title: "FitMe90 — Transforme ton corps en 90 jours",
  description:
    "90 jours pour transformer ton corps : programme d'entraînement périodisé sur ta salle et accompagnement nutritionnel personnalisés, conçus par un coach diplômé BPJEPS. Paiement unique, sans abonnement.",
};

// Repères factuels (rien d'inventé : ce sont des caractéristiques du produit).
const stats = [
  { value: "90", label: "jours", sub: "de programme périodisé, jour par jour" },
  { value: "100 %", label: "sur-mesure", sub: "ta salle, ta santé, tes contraintes" },
  { value: "0", label: "abonnement", sub: "un seul paiement, aucune reconduction" },
  { value: "BPJEPS", label: "diplômé", sub: "coach certifié AGFF" },
];

// Agitation : pourquoi un plan générique ne transforme personne.
const problems = [
  {
    title: "Un programme trouvé en ligne ignore ta salle",
    body: "Il te demande des machines que tu n'as pas. Tu improvises, tu perds le fil, tu arrêtes.",
  },
  {
    title: "Aucune progression pensée sur la durée",
    body: "Les mêmes charges, les mêmes séries, semaine après semaine. Le corps s'habitue et ne change plus.",
  },
  {
    title: "La nutrition est déconnectée de l'effort",
    body: "Des menus copiés-collés qui ne tiennent compte ni de tes allergies, ni de ton régime, ni de tes journées.",
  },
  {
    title: "Personne pour ajuster quand la vie s'en mêle",
    body: "Une blessure, un imprévu, une semaine chargée — et tout le plan tombe à l'eau.",
  },
];

// Cœur de l'angle transformation : les trois cycles + la lecture seule.
const phases = [
  {
    tag: "J1 → J30",
    title: "Adaptation",
    body: "On installe la technique, la base et l'habitude. Charges maîtrisées, gestes propres, régularité qui s'ancre.",
  },
  {
    tag: "J31 → J60",
    title: "Intensification",
    body: "On monte le volume et les charges. Le corps encaisse davantage, la composition commence à bouger visiblement.",
  },
  {
    tag: "J61 → J90",
    title: "Spécialisation",
    body: "On concentre l'effort sur ton objectif : pic de forme, densité, définition. Le résultat des 90 jours se lit ici.",
  },
];

const features = [
  {
    n: "01",
    title: "Un programme périodisé sur TA salle",
    body: "Tu photographies tes machines : le programme n'utilise que ce que tu as vraiment sous la main, et progresse en trois cycles expliqués.",
  },
  {
    n: "02",
    title: "Une nutrition qui suit, jour par jour",
    body: "Menus, macros et liste de courses calés sur tes journées d'entraînement — allergies, régime et cadre religieux filtrés en amont.",
  },
  {
    n: "03",
    title: "Chaque séance, guidée",
    body: "Minuteur de repos intégré, journal série par série (kg × reps), coches et barre de progression. Tu sais toujours quoi faire, et où tu en es.",
  },
  {
    n: "04",
    title: "Un coach IA qui adapte tout seul",
    body: "Tu te blesses au genou, tu passes à 3 séances, tu détestes un aliment ? Dis-le au coach : le programme et la diète se réajustent automatiquement.",
  },
  {
    n: "05",
    title: "Ton suivi, visible",
    body: "Courbe de poids qui se construit à chaque pesée, mensurations, IMC et zones cardio. La transformation devient mesurable, pas ressentie au doigt mouillé.",
  },
];

const steps = [
  { k: "01", title: "Questionnaire", body: "Profil, objectif, niveau, santé, allergies, cadre religieux, jours disponibles." },
  { k: "02", title: "Photos de ta salle", body: "Le matériel est lu sur tes images, puis validé par toi." },
  { k: "03", title: "Compte & génération", body: "Ton programme 90 jours et ta nutrition, écrits sur mesure." },
  { k: "04", title: "Espace client", body: "Séance guidée, minuteur, journal, calendrier et coach IA au quotidien." },
];

const forWho = [
  { title: "Débutant complet", body: "On part de ta technique, sans te jeter dans le grand bain." },
  { title: "Une blessure ou une pathologie", body: "Écran santé au départ, exercices adaptés, validation médecin quand il le faut." },
  { title: "Allergies, végé, halal, casher", body: "Tes contraintes alimentaires sont respectées dans toute la nutrition." },
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
  {
    q: "Faut-il une salle ou du matériel particulier ?",
    a: "Non. Tu photographies ce que tu as — salle complète, home-gym ou quelques haltères — et le programme se construit uniquement avec ce matériel.",
  },
  {
    q: "Je suis débutant, est-ce que c'est adapté ?",
    a: "Oui. Le premier cycle (J1 → J30) est dédié à la technique et à l'installation de l'habitude. On progresse ensuite graduellement, sans brûler les étapes.",
  },
  {
    q: "Le coach IA remplace-t-il un vrai coach ?",
    a: `Le programme est conçu par un ${COACH_CREDENTIAL.toLowerCase()}. Le coach IA prolonge cet accompagnement au quotidien : il répond, motive et ajuste le plan. C'est un accompagnement sportif et de bien-être, sans visée thérapeutique.`,
  },
  {
    q: "Et la nutrition, tu es diététicien ?",
    a: "Non, et je ne prétends pas l'être. FitMe90 propose un accompagnement nutritionnel et une aide au choix des repas adaptée à ton profil — ce n'est pas une prescription diététique ni un traitement d'une pathologie. Pour tout suivi médical ou nutritionnel thérapeutique, adresse-toi à un professionnel de santé.",
  },
  {
    q: "Que se passe-t-il après les 90 jours ?",
    a: `Le coach IA se désactive à la fin du programme, mais ton plan d'entraînement reste consultable ${GRACE_DAYS} jours de plus en lecture seule. Tu gardes tout sous les yeux le temps de décider de la suite.`,
  },
  {
    q: "J'ai une blessure, une pathologie ou une grossesse ?",
    a: "Un écran santé au démarrage repère les situations à risque. Selon les cas, le programme est adapté ou mis en pause en attendant l'avis de ton médecin. FitMe90 ne remplace jamais un avis médical.",
  },
  {
    q: "Y a-t-il un abonnement ?",
    a: `Aucun. C'est un paiement unique de ${PRICE_EUR} €, sans reconduction ni prélèvement caché. Le paiement est sécurisé par Stripe.`,
  },
  {
    q: "Puis-je l'offrir à quelqu'un ?",
    a: "Oui. FitMe90 peut être offert : un code cadeau débloque le programme complet de 90 jours, sans passer par le paiement.",
  },
  {
    q: "Mes données sont-elles protégées ?",
    a: "Oui. Tes données sont hébergées dans l'Union européenne et traitées conformément au RGPD. Tu peux consulter notre politique de confidentialité à tout moment.",
  },
];

function Chevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-paper">
      {/* En-tête */}
      <Container className="flex items-center justify-between gap-4 pt-6 safe-top">
        <Wordmark size={20} />
        <Link
          href="/connexion"
          className="text-[14px] font-semibold text-body-2 hover:text-ink"
        >
          J'ai déjà un compte
        </Link>
      </Container>

      <Container className="flex flex-col gap-[clamp(64px,9vw,104px)] pb-20 pt-[clamp(40px,7vw,72px)]">
        {/* Hero */}
        <section className="flex flex-col gap-[26px]">
          <MonoLabel className="tracking-[0.16em] text-brand text-[11px]">
            90 jours · sport + nutrition sur-mesure
          </MonoLabel>
          <h1 className="font-archivo font-extrabold text-[clamp(40px,9vw,86px)] leading-[0.95] tracking-[-0.04em] max-w-[16ch] text-balance text-ink">
            Ton corps change en 90 jours. Pour de vrai, pas sur le papier.
          </h1>
          <p className="max-w-[56ch] text-[clamp(16px,2.2vw,19px)] leading-[1.6] text-body-2">
            Tu réponds à un questionnaire sérieux, tu photographies ta salle, et
            tu reçois un programme d'entraînement périodisé et une nutrition qui
            suit — jour par jour, avec tes pathologies, tes allergies et tes
            contraintes respectées. Un coach IA t'accompagne du premier au
            dernier jour.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink
              href="/inscription"
              variant="primary"
              className="h-[54px] px-[30px] text-[16px] w-full sm:w-auto"
            >
              Démarrer mon programme
            </ButtonLink>
            <ButtonLink
              href="/connexion"
              variant="outline"
              className="h-[54px] px-[30px] text-[16px] w-full sm:w-auto"
            >
              J'ai déjà un compte
            </ButtonLink>
          </div>
          <div className="flex flex-wrap items-center gap-x-[22px] gap-y-2 pt-1">
            {[
              `${PRICE_EUR} € — paiement unique`,
              "Sans abonnement",
              "Coach IA inclus 90 jours",
            ].map((t) => (
              <MonoLabel key={t} className="tracking-[0.1em] text-[11px] text-muted-2">
                {t}
              </MonoLabel>
            ))}
          </div>
        </section>

        {/* Repères */}
        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5 bg-surface p-5 sm:p-6">
              <div className="font-archivo font-extrabold text-[clamp(30px,5vw,40px)] leading-none tracking-[-0.03em] text-ink">
                {s.value}
              </div>
              <MonoLabel className="text-brand text-[11px] tracking-[0.12em]">
                {s.label}
              </MonoLabel>
              <div className="text-[13px] leading-[1.5] text-muted">{s.sub}</div>
            </div>
          ))}
        </section>

        {/* Problème / agitation */}
        <section className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-3">
            <MonoLabel className="text-brand text-[11px] tracking-[0.14em]">
              Le vrai problème
            </MonoLabel>
            <h2 className="font-archivo font-bold text-[clamp(26px,4.5vw,38px)] leading-[1.08] tracking-[-0.02em] max-w-[20ch] text-ink">
              Ce n'est pas ta motivation le problème. C'est le plan.
            </h2>
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
            {problems.map((p) => (
              <div
                key={p.title}
                className="flex flex-col gap-2 rounded-card border border-line bg-surface p-[22px]"
              >
                <div className="font-archivo font-semibold text-[16px] leading-snug text-ink">
                  {p.title}
                </div>
                <div className="text-[14px] leading-[1.6] text-muted">{p.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Transformation — les 3 cycles */}
        <section className="flex flex-col gap-[26px]">
          <div className="flex flex-col gap-3">
            <MonoLabel className="text-brand text-[11px] tracking-[0.14em]">
              Ton corps sur 90 jours
            </MonoLabel>
            <h2 className="font-archivo font-bold text-[clamp(26px,4.5vw,38px)] leading-[1.08] tracking-[-0.02em] max-w-[22ch] text-ink">
              Trois cycles pensés pour que le changement tienne.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {phases.map((p, i) => (
              <div
                key={p.title}
                className="relative flex flex-col gap-3 rounded-card border border-line bg-surface p-[26px]"
              >
                <div className="font-archivo font-extrabold text-[28px] leading-none tracking-[-0.03em] text-line-4">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <MonoLabel className="text-brand text-[11px] tracking-[0.12em]">
                  {p.tag}
                </MonoLabel>
                <div className="font-archivo font-bold text-[20px] tracking-[-0.02em] text-ink">
                  {p.title}
                </div>
                <div className="text-[14px] leading-[1.6] text-muted">{p.body}</div>
              </div>
            ))}
          </div>
          <p className="text-[14px] leading-[1.6] text-muted max-w-[62ch]">
            À la fin des 90 jours, le coach IA se désactive, mais ton plan
            d'entraînement reste consultable {GRACE_DAYS} jours de plus, en
            lecture seule.
          </p>
        </section>

        {/* Ce que tu reçois */}
        <section className="flex flex-col gap-[22px]">
          <h2 className="font-archivo font-bold text-[clamp(26px,4.5vw,38px)] leading-[1.08] tracking-[-0.02em] text-ink">
            Ce que tu reçois
          </h2>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {features.map((f) => (
              <div
                key={f.n}
                className="flex flex-col gap-[11px] rounded-card border border-line bg-surface p-[26px]"
              >
                <div className="font-archivo font-extrabold text-[34px] leading-none tracking-[-0.03em] text-brand">
                  {f.n}
                </div>
                <div className="font-archivo font-semibold text-[17px] leading-snug text-ink">
                  {f.title}
                </div>
                <div className="text-[14px] leading-[1.6] text-muted">{f.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="flex flex-col gap-[22px]">
          <h2 className="font-archivo font-bold text-[clamp(26px,4.5vw,38px)] leading-[1.08] tracking-[-0.02em] text-ink">
            Comment ça marche
          </h2>
          <div className="grid gap-x-6 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] border-t border-line-3">
            {steps.map((s) => (
              <div key={s.k} className="flex flex-col gap-2 border-b border-line-2 py-5">
                <MonoLabel className="text-brand text-[11px] tracking-[0.1em]">
                  {s.k}
                </MonoLabel>
                <div className="font-archivo font-semibold text-[16px] text-ink">
                  {s.title}
                </div>
                <div className="text-[14px] leading-[1.6] text-muted">{s.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Est-ce pour toi */}
        <section className="flex flex-col gap-[22px]">
          <h2 className="font-archivo font-bold text-[clamp(26px,4.5vw,38px)] leading-[1.08] tracking-[-0.02em] text-ink">
            Est-ce pour toi ?
          </h2>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {forWho.map((w) => (
              <div
                key={w.title}
                className="flex items-start gap-3 rounded-card border border-line bg-surface p-[18px]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-brand"
                >
                  <path
                    d="M5 12.5l4 4 10-10"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex flex-col gap-1">
                  <div className="font-archivo font-semibold text-[15px] leading-snug text-ink">
                    {w.title}
                  </div>
                  <div className="text-[13.5px] leading-[1.55] text-muted">{w.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Offre */}
        <section className="flex flex-col gap-6 rounded-card-lg bg-ink p-[clamp(28px,5vw,48px)] text-paper">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <MonoLabel className="tracking-[0.16em] text-[11px] text-[#9E9C95]">
                Programme complet
              </MonoLabel>
              <div className="flex items-end gap-3">
                <span className="font-archivo font-extrabold text-[clamp(44px,8vw,60px)] leading-none tracking-[-0.03em]">
                  {PRICE_EUR} €
                </span>
                <span className="pb-1.5 text-[14px] text-[#C6C4BD]">
                  paiement unique
                </span>
              </div>
              <div className="max-w-[46ch] text-[15px] leading-[1.6] text-[#C6C4BD]">
                {PROGRAM_DAYS} jours d'entraînement et de nutrition sur mesure,
                coach IA inclus toute la durée. Sans abonnement, sans reconduction.
              </div>
            </div>
            <ButtonLink
              href="/inscription"
              variant="primary"
              className="h-[54px] w-full px-[30px] text-[16px] sm:w-auto"
            >
              Commencer mon programme
            </ButtonLink>
          </div>

          <ul className="grid gap-x-6 gap-y-2.5 border-t border-white/10 pt-6 sm:grid-cols-2">
            {includes.map((it) => (
              <li key={it} className="flex items-start gap-2.5 text-[14px] leading-[1.55] text-[#E7E5E0]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-brand"
                >
                  <path
                    d="M5 12.5l4 4 10-10"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {it}
              </li>
            ))}
          </ul>

          <p className="text-[13px] leading-[1.55] text-[#9E9C95]">
            On t'a offert FitMe90 ? Un code cadeau débloque le programme complet
            à l'inscription, sans paiement.
          </p>
        </section>

        {/* FAQ */}
        <section className="flex flex-col gap-[22px]">
          <h2 className="font-archivo font-bold text-[clamp(26px,4.5vw,38px)] leading-[1.08] tracking-[-0.02em] text-ink">
            Questions fréquentes
          </h2>
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            {faqs.map((f, i) => (
              <details
                key={f.q}
                className={`group ${i > 0 ? "border-t border-line-2" : ""}`}
              >
                <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-[18px] font-archivo font-semibold text-[15.5px] leading-snug text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Chevron />
                </summary>
                <div className="px-5 pb-5 text-[14px] leading-[1.65] text-muted">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="flex flex-col items-start gap-5">
          <h2 className="font-archivo font-extrabold text-[clamp(28px,5vw,44px)] leading-[1.02] tracking-[-0.03em] max-w-[18ch] text-balance text-ink">
            90 jours à partir d'aujourd'hui, ou dans un an au même point ?
          </h2>
          <ButtonLink
            href="/inscription"
            variant="primary"
            className="h-[54px] w-full px-[30px] text-[16px] sm:w-auto"
          >
            Démarrer mon programme
          </ButtonLink>
        </section>

        {/* Positionnement coach + avertissement médical */}
        <div className="flex flex-col gap-3 border-t border-line-2 pt-8">
          <p className="text-[13px] text-muted">
            Programme conçu par un{" "}
            <span className="text-body">{COACH_CREDENTIAL}</span>. Accompagnement
            sportif et de bien-être, sans visée thérapeutique. L'accompagnement
            nutritionnel est une aide au choix des repas, pas une prescription
            diététique.
          </p>
          <p className="text-[12.5px] leading-relaxed text-muted-2">
            FitMe90 ne remplace pas un avis médical. En cas de pathologie, de
            grossesse ou de blessure, valide le programme avec ton médecin avant
            de commencer.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 pt-2 text-[13px] text-muted-2">
            <Link href="/mentions-legales" className="hover:text-ink">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-ink">
              Confidentialité
            </Link>
            <Link href="/cgv" className="hover:text-ink">
              CGV
            </Link>
          </nav>
        </div>
      </Container>
    </div>
  );
}
