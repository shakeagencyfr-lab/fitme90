import { notFound } from "next/navigation";
import { CircuitRunner } from "@/components/circuit-runner";
import { DepannageButton } from "@/components/depannage-button";
import { RescueBanner } from "@/components/rescue-banner";
import { rescueSession } from "@/lib/rescue-circuit";
import type { Session } from "@/lib/program";

// Bac à sable du chrono de circuit, sur le même principe que /dev/materiel :
// une séance fictive, sans session ni base, pour regarder l'aperçu et le
// plein écran dans un vrai navigateur. Désactivé sauf si LANDING_PREVIEW=1.
export const dynamic = "force-dynamic";

const BLOCKS = [
  {
    title: "Bloc 1 · jambes",
    rounds: 3,
    work: 40,
    rest: 20,
    roundRest: 30,
    restAfter: 60,
    sensation: 2,
    exercises: [
      { name: "Squat au poids du corps", key: "squat-poids-du-corps", note: "talons au sol, descends sous la parallèle" },
      { name: "Fentes arrière", key: "fentes-arriere", note: "alterne les jambes, genou avant au-dessus de la cheville" },
      { name: "Pont fessier", key: "glute-bridge", note: "serre les fessiers en haut, 1 s de pause" },
      { name: "Squat sauté", key: "squat-saute", note: "réception souple, genoux dans l'axe" },
    ],
  },
  {
    title: "Bloc 2 · haut du corps",
    rounds: 3,
    work: 40,
    rest: 20,
    roundRest: 30,
    restAfter: 60,
    sensation: 2,
    exercises: [
      { name: "Pompes inclinées", key: "pompes-inclinees", note: "mains sur un meuble stable, corps gainé" },
      { name: "Superman", key: "superman", note: "lève bras et jambes 1 s, redescends lentement" },
      { name: "Pompes serrées", key: "pompes-serrees", note: "coudes le long du corps" },
    ],
  },
  {
    title: "Bloc 3 · tronc et cardio",
    rounds: 2,
    work: 30,
    rest: 15,
    roundRest: 30,
    restAfter: 0,
    sensation: 3,
    exercises: [
      { name: "Mountain climber", key: "mountain-climber", note: "bassin stable, genoux vers la poitrine" },
      { name: "Gainage planche", key: "gainage-planche", note: "coudes sous les épaules, fessiers serrés" },
      { name: "Jumping jack", key: "jumping-jack", note: "souple sur les appuis" },
    ],
  },
];

// Une séance de salle, pour voir ce que le dépannage en fait sans matériel.
const ex = (name: string, key: string) => ({ name, key, sets: 4, reps: "8-10", load: "", note: "", cardio: false, duration: "", zone: "" });
const SALLE = {
  cycleLabel: "Cycle 1 · Séance A",
  title: "Haut du corps",
  meta: "",
  restSec: 90,
  format: "sets" as const,
  warmup: [],
  exercises: [
    ex("Développé couché", "developpe-couche"),
    ex("Tirage vertical", "tirage-vertical"),
    ex("Développé militaire", "developpe-militaire"),
    ex("Presse à cuisses", "presse-jambes"),
    ex("Extension triceps poulie", "extension-triceps-poulie"),
    ex("Gainage planche", "gainage-planche"),
  ],
} as unknown as Session;

export default function DevCircuitPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  const rescue = rescueSession({ session: SALLE, kind: "aucun", level: "intermediaire", minutes: 45, cycleIndex: 0, locale: "fr" });
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5 p-4">
      <h1 className="font-archivo font-extrabold text-[32px] leading-[1.05] tracking-[-0.03em] text-ink">Full body · poussée + quadriceps</h1>
      <DepannageButton day={3} coachEnabled />
      <CircuitRunner day={3} blocks={BLOCKS} targetSensation={2} canLog alreadyDone={false} />

      <h2 className="mt-8 font-archivo font-extrabold text-[26px] leading-[1.05] tracking-[-0.03em] text-ink">Dépannage · aucun matériel</h2>
      <RescueBanner day={3} kind="aucun" dropped={rescue.dropped} playable={rescue.blocks.length > 0} canLog />
      <CircuitRunner day={3} blocks={rescue.blocks} targetSensation={2} canLog={false} alreadyDone={false} mode="finisher" />
    </div>
  );
}
