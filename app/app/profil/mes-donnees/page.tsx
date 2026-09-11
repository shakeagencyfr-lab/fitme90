import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { readConsents } from "@/lib/consents";
import { countPersonalRows } from "@/lib/my-data";
import { MyDataView } from "@/components/my-data-view";

export const metadata = { title: "Mes données" };
export const dynamic = "force-dynamic";

// Tout le rendu est dans components/my-data-view.tsx : cette page ne fait que
// lire, et le bac à sable /dev/mes-donnees rend la même vue sans session.
export default async function MesDonneesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion");

  const [{ rows, unavailable }, holdings] = await Promise.all([
    readConsents(ctx.userId),
    countPersonalRows(ctx.userId),
  ]);

  return <MyDataView consents={rows} unavailable={unavailable} holdings={holdings} />;
}
