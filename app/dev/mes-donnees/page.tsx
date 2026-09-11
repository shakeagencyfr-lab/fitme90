import { notFound } from "next/navigation";
import { MyDataView } from "@/components/my-data-view";
import { PERSONAL_TABLES } from "@/lib/gdpr";

// Bac à sable de l'écran « Mes données », sur le même principe que /dev/shell.
//
// Sans lui, cet écran ne se regarde qu'en se connectant réellement au compte
// d'une personne, ce qui est précisément ce que la page sert à éviter. Les
// chiffres sont fictifs, le rendu est celui de la vraie page.
export const dynamic = "force-dynamic";

const IL_Y_A = (jours: number) => new Date(Date.now() - jours * 86_400_000).toISOString();

// Quelques volumes crédibles sur les catégories les plus parlantes.
const VOLUMES: Record<string, number> = {
  profiles: 1,
  consents: 4,
  questionnaires: 1,
  equipment: 1,
  programs: 1,
  session_logs: 42,
  weights: 11,
  measurements: 3,
  food_log: 128,
  coach_messages: 87,
  bookings: 2,
};

export default function DevMesDonneesPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  return (
    <div className="px-4 py-6">
      <MyDataView
        unavailable={false}
        consents={[
          { kind: "cgv", text_version: "2026-09-11", granted_at: IL_Y_A(120), withdrawn_at: null },
          { kind: "confidentialite", text_version: "2026-09-11", granted_at: IL_Y_A(120), withdrawn_at: null },
          { kind: "sante", text_version: "2026-09-11", granted_at: IL_Y_A(119), withdrawn_at: null },
          { kind: "prospection", text_version: "2026-09-11", granted_at: IL_Y_A(119), withdrawn_at: IL_Y_A(12) },
        ]}
        holdings={PERSONAL_TABLES.map((entry) => ({ entry, rows: VOLUMES[entry.table] ?? 0 }))}
      />
    </div>
  );
}
