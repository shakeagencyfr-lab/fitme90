import { notFound } from "next/navigation";
import { CircuitRunner } from "@/components/circuit-runner";

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

export default function DevCircuitPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5 p-4">
      <h1 className="font-archivo font-extrabold text-[32px] leading-[1.05] tracking-[-0.03em] text-ink">Full body · poussée + quadriceps</h1>
      <CircuitRunner day={3} blocks={BLOCKS} targetSensation={2} canLog alreadyDone={false} />
    </div>
  );
}
