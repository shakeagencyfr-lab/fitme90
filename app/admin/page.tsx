import Link from "next/link";
import { tx } from "@/lib/i18n/request";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/admin";
import { tenantNode } from "@/lib/hierarchy";
import { computeAccess, accessLabel } from "@/lib/access";
import { aiUsageForUsers, formatUsd, type UserAiUsage } from "@/lib/ai-cost";
import { costViewOf } from "@/lib/cost-view";
import { listCoachVipThreads } from "@/lib/vip";
import { tenantCapacity } from "@/lib/entitlements";
import { CapacityCard } from "@/components/capacity-card";
import { CoachOnboarding } from "@/components/coach-onboarding";
import { InternalClientForm } from "@/components/internal-client-form";
import { listOffers } from "@/lib/offers";
import { Card, MonoLabel } from "@/components/ui";

export const metadata = { title: "Clients, Admin My Fitness App" };

type Prof = {
  id: string;
  email: string | null;
  name: string | null;
  paid: boolean;
  start_date: string | null;
  medical_hold: boolean;
  medical_ack_at: string | null;
  created_at: string;
  managed_by_coach: boolean;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "·";

export default async function AdminClientsPage() {
  // Cloisonnement par tenant : un coach ne voit QUE ses propres clients.
  const gate = await getAdminOrNull();
  const tenantId = gate?.profile?.tenant_id ?? null;
  // Un revendeur / la plateforme n'ont pas de clients directs : leur page
  // d'accueil est « Mon réseau » (coachs + revendeurs rattachés).
  if (tenantId) {
    const node = await tenantNode(tenantId);
    if (node?.kind === "reseller" || node?.kind === "platform") redirect("/admin/reseau");
  }
  const admin = createAdminClient();
  const [{ data: profiles }, { data: logs }] = await Promise.all([
    tenantId
      ? admin
          .from("profiles")
          .select("id, email, name, paid, start_date, medical_hold, medical_ack_at, created_at, managed_by_coach")
          .eq("tenant_id", tenantId)
          .eq("role", "client")
          .order("created_at", { ascending: false })
          .returns<Prof[]>()
      : Promise.resolve({ data: [] as Prof[] }),
    admin.from("session_logs").select("user_id").returns<{ user_id: string }[]>(),
  ]);

  const rows = profiles ?? [];
  const sessionCount = new Map<string, number>();
  for (const l of logs ?? []) sessionCount.set(l.user_id, (sessionCount.get(l.user_id) ?? 0) + 1);

  const withAccess = rows.map((p) => ({ p, access: computeAccess(p.paid, p.start_date) }));
  const paidCount = rows.filter((p) => p.paid).length;
  const activeCount = withAccess.filter((r) => r.access.phase === "active").length;

  // Conso IA par client + total, dans l'unité que ce coach a le droit de voir
  // (dollars sur sa clé, crédits s'il les achète, appels si l'IA est comprise) ;
  // non-lus VIP par client (icône de ligne).
  const [usageByUser, vipThreads, cap, offers, view] = await Promise.all([
    aiUsageForUsers(rows.map((p) => p.id)),
    tenantId ? listCoachVipThreads(tenantId) : Promise.resolve([]),
    tenantId ? tenantCapacity(tenantId) : Promise.resolve(null),
    tenantId ? listOffers(tenantId) : Promise.resolve([]),
    costViewOf(tenantId),
  ]);
  // Les plans masqués comptent ici : ce sont justement ceux qu'un coach crée
  // pour des clients inscrits à la main, sans passer par sa page de vente.
  const offerChoices = offers
    .filter((o) => o.is_active)
    .map((o) => ({ id: o.id, name: o.name, durationMonths: o.duration_months }));
  const total: UserAiUsage = { costUsd: 0, credits: 0, calls: 0 };
  for (const u of usageByUser.values()) {
    total.costUsd += u.costUsd;
    total.credits += u.credits;
    total.calls += u.calls;
  }
  const aiCell = (u: UserAiUsage | undefined) =>
    view === "usd" ? formatUsd(u?.costUsd ?? 0) : view === "credits" ? (u?.credits ?? 0).toLocaleString("fr-FR") : (u?.calls ?? 0).toLocaleString("fr-FR");
  const aiHeader = view === "usd" ? "Coût IA" : view === "credits" ? "Crédits IA" : "Appels IA";
  const unreadByClient = new Map<string, number>();
  for (const t of vipThreads) if (t.unread > 0) unreadByClient.set(t.clientId, t.unread);

  return (
    <div className="flex flex-col gap-5">
      {tenantId ? <CoachOnboarding tenantId={tenantId} /> : null}

      <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
        {tx("Clients")}</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card><Stat label={tx("Inscrits")} value={rows.length} /></Card>
        <Card><Stat label={tx("Ont payé")} value={paidCount} /></Card>
        <Card><Stat label={tx("Programme actif")} value={activeCount} /></Card>
      </div>

      {cap ? <CapacityCard cap={cap} /> : null}

      {tenantId ? <InternalClientForm offers={offerChoices} remaining={cap?.remaining ?? null} /> : null}

      {/* La conso IA, dans l'unité de ce coach. Un coach qui achète des crédits
          ne voit jamais de dollars : il y lirait la marge de son revendeur. */}
      <Card className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-control bg-brand/10 text-brand">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
            </svg>
          </span>
          <MonoLabel>{view === "usd" ? tx("Coût de l'IA") : view === "credits" ? tx("Crédits IA consommés") : tx("Appels à l'IA")}</MonoLabel>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-archivo font-extrabold text-[34px] leading-none tracking-[-0.03em] text-ink">
            {view === "usd" ? formatUsd(total.costUsd) : view === "credits" ? total.credits.toLocaleString("fr-FR") : total.calls.toLocaleString("fr-FR")}
          </span>
          <span className="text-[13px] text-muted-2">
            {view === "usd" ? tx("sur vos propres clés") : view === "credits" ? tx("crédits, depuis le début") : tx("appels, compris dans ton abonnement")}
          </span>
        </div>
        <p className="text-[12.5px] leading-[1.6] text-muted-2">
          {view === "usd"
            ? tx("Estimation cumulée de la génération, du coach IA et des recettes avec tes clés Anthropic. Le détail par client est en face de chaque ligne.")
            : view === "credits"
              ? tx("Crédits débités par la génération, le coach IA et les recettes de tes clients. Le détail par client est en face de chaque ligne.")
              : tx("L'IA de tes clients est comprise dans ton abonnement : rien ne t'est débité par action. Le nombre d'appels par client est en face de chaque ligne.")}
        </p>
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-muted-2">
                {["Client", "Statut", "Phase", "Jour", "Séances", aiHeader, "Début", "Inscrit"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.08em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withAccess.map(({ p, access }) => (
                <tr key={p.id} className="border-b border-line-2 last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clients/${p.id}`} className="group block">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-ink group-hover:text-brand group-hover:underline">
                          {p.name || "·"}
                        </span>
                        {unreadByClient.get(p.id) ? (
                          <span
                            title={tx("Message VIP non lu")}
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center gap-0.5 rounded-full bg-brand px-1 font-mono text-[10px] font-bold leading-none text-white"
                          >
                            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4z" />
                            </svg>
                            {unreadByClient.get(p.id)}
                          </span>
                        ) : null}
                      </div>
                      {/* Sans adresse, la ligne dirait « rien » là où il faut
                          lire « compte que je tiens moi-même ». */}
                      <div className="text-[12px] text-muted-2">
                        {p.email || tx("Compte interne, sans e-mail")}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.medical_hold ? (
                      <Badge tone="alert">
                        {p.medical_ack_at ? "Santé, décharge signée" : "Santé à surveiller"}
                      </Badge>
                    ) : p.paid ? (
                      <Badge tone="ok">{tx("Payé")}</Badge>
                    ) : (
                      <Badge tone="muted">{tx("Non payé")}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body">{accessLabel(access)}</td>
                  <td className="px-4 py-3 tabular-nums text-body">
                    {access.phase === "active" ? `${access.day}/90` : "·"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-body">{sessionCount.get(p.id) ?? 0}</td>
                  <td className="px-4 py-3 tabular-nums text-body">{aiCell(usageByUser.get(p.id))}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{fmt(p.start_date)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{fmt(p.created_at)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">{tx("Aucun client pour l'instant.")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[12.5px] text-muted-2">
        {tx("Données clients (RGPD), usage strictement professionnel, réservé au coach.")}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <MonoLabel>{label}</MonoLabel>
      <div className="font-archivo font-extrabold text-[26px] leading-none tracking-[-0.03em] text-ink">
        {value}
      </div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "ok" | "muted" | "alert" }) {
  const cls =
    tone === "ok"
      ? "bg-brand/10 text-brand border-brand/30"
      : tone === "alert"
        ? "bg-alert text-alert-ink border-alert-line"
        : "bg-surface-2 text-muted-2 border-line-4";
  return (
    <span className={`inline-block rounded-pill border px-2.5 py-0.5 text-[12px] font-medium ${cls}`}>
      {children}
    </span>
  );
}
