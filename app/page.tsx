import Link from "next/link";
import { Container, ButtonLink, MonoLabel } from "@/components/ui";
import { Wordmark } from "@/components/brand";
import { PRICE_EUR, COACH_CREDENTIAL } from "@/lib/config";

export const metadata = {
  title: "FitMe90 — Ton corps change en 90 jours",
  description:
    "Programme d'entraînement périodisé et accompagnement nutritionnel personnalisés sur 90 jours, conçus par un coach diplômé BPJEPS.",
};

const pillars = [
  {
    n: "01",
    title: "Un questionnaire qui va au fond",
    body: "Sept sections : profil, objectif, niveau, jours d'entraînement, santé, alimentation, quotidien.",
  },
  {
    n: "02",
    title: "Ta salle, pas une salle type",
    body: "Tu photographies les machines. Le programme n'utilise que ce que tu as.",
  },
  {
    n: "03",
    title: "Trois cycles expliqués",
    body: "Adaptation, intensification, spécialisation — avec le pourquoi de chaque progression.",
  },
];

const steps = [
  { k: "01", title: "Questionnaire", body: "Profil, santé, allergies, cadre religieux, jours disponibles." },
  { k: "02", title: "Photos de la salle", body: "Matériel lu sur tes images, validé par toi." },
  { k: "03", title: "Compte et génération", body: "Ton programme 90 jours et ta nutrition, écrits ensemble." },
  { k: "04", title: "Espace client", body: "Séance guidée, minuteur, journal par série, calendrier, coach." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <Container className="flex flex-col gap-[clamp(56px,8vw,88px)] pb-16">
        {/* En-tête */}
        <div className="flex items-center justify-between gap-4 pt-6 safe-top">
          <Wordmark size={20} />
          <Link
            href="/connexion"
            className="text-[14px] font-semibold text-body-2 hover:text-ink"
          >
            J'ai déjà un compte
          </Link>
        </div>

        {/* Hero */}
        <section className="flex flex-col gap-[26px]">
          <MonoLabel className="tracking-[0.16em] text-brand text-[11px]">
            90 jours · sport + nutrition
          </MonoLabel>
          <h1 className="font-archivo font-extrabold text-[clamp(40px,9vw,84px)] leading-[0.95] tracking-[-0.04em] max-w-[15ch] text-balance text-ink">
            Ton corps change en 90 jours. Pas en théorie.
          </h1>
          <p className="max-w-[54ch] text-[clamp(16px,2.2vw,19px)] leading-[1.6] text-body-2">
            Tu réponds à un questionnaire sérieux, tu photographies ta salle, et
            tu reçois un programme d'entraînement périodisé et une nutrition qui
            suit — jour par jour, avec tes pathologies, tes allergies et tes
            contraintes alimentaires respectées.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/inscription" variant="primary" className="h-[54px] px-[30px] text-[16px]">
              Démarrer mon programme
            </ButtonLink>
            <ButtonLink href="/connexion" variant="outline" className="h-[54px] px-[30px] text-[16px]">
              J'ai déjà un compte
            </ButtonLink>
          </div>
          <div className="flex flex-wrap gap-x-[22px] gap-y-2">
            {["Questionnaire 7 sections", "PDF complet", "Coach IA pendant 90 jours"].map((t) => (
              <MonoLabel key={t} className="tracking-[0.1em] text-[11px] text-muted-2">
                {t}
              </MonoLabel>
            ))}
          </div>
        </section>

        {/* Piliers */}
        <section className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
          {pillars.map((p) => (
            <div
              key={p.n}
              className="bg-surface border border-line rounded-card p-[26px] flex flex-col gap-[11px]"
            >
              <div className="font-archivo font-extrabold text-[40px] leading-none tracking-[-0.03em] text-brand">
                {p.n}
              </div>
              <div className="font-archivo font-semibold text-[17px] text-ink">{p.title}</div>
              <div className="text-[14px] leading-[1.6] text-muted">{p.body}</div>
            </div>
          ))}
        </section>

        {/* Ce que tu reçois */}
        <section className="flex flex-col gap-[22px]">
          <h2 className="font-archivo font-bold text-[clamp(24px,4vw,32px)] leading-[1.1] tracking-[-0.02em] text-ink">
            Ce que tu reçois
          </h2>
          <div className="grid gap-x-6 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] border-t border-line-3">
            {steps.map((s) => (
              <div key={s.k} className="py-5 flex flex-col gap-2 border-b border-line-2">
                <MonoLabel className="text-brand text-[11px] tracking-[0.1em]">{s.k}</MonoLabel>
                <div className="font-archivo font-semibold text-[16px] text-ink">{s.title}</div>
                <div className="text-[14px] leading-[1.6] text-muted">{s.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Offre */}
        <section className="bg-ink text-paper rounded-card-lg p-[clamp(28px,5vw,48px)] flex flex-wrap justify-between items-end gap-8">
          <div className="flex flex-col gap-3 max-w-[46ch]">
            <MonoLabel className="tracking-[0.16em] text-[11px] text-[#9E9C95]">
              Programme complet
            </MonoLabel>
            <div className="font-archivo font-extrabold text-[clamp(40px,7vw,52px)] leading-none tracking-[-0.03em]">
              {PRICE_EUR} €
            </div>
            <div className="text-[15px] leading-[1.6] text-[#C6C4BD]">
              Paiement unique, sans abonnement. Programme d'entraînement et
              nutrition sur 90 jours, coach IA inclus pendant toute la durée, puis
              plan consultable 30 jours de plus. Export PDF complet.
            </div>
          </div>
          <ButtonLink href="/inscription" variant="primary" className="h-[52px] px-[30px] text-[16px]">
            Commencer
          </ButtonLink>
        </section>

        {/* Positionnement coach + avertissement médical */}
        <div className="flex flex-col gap-3 pb-6">
          <p className="text-[13px] text-muted">
            Programme conçu par un coach diplômé{" "}
            <span className="text-body">{COACH_CREDENTIAL}</span>. Accompagnement
            sportif et de bien-être, sans visée thérapeutique.
          </p>
          <p className="text-[12.5px] text-muted-2 leading-relaxed">
            FitMe90 ne remplace pas un avis médical. En cas de pathologie, de
            grossesse ou de blessure, valide le programme avec ton médecin avant
            de commencer.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 pt-2 text-[13px] text-muted-2">
            <Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
            <Link href="/cgv" className="hover:text-ink">CGV</Link>
          </nav>
        </div>
      </Container>
    </div>
  );
}
