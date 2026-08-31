import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/admin";
import { computeAccess, accessLabel } from "@/lib/access";
import { aiCostForUsers, totalCost, formatUsd } from "@/lib/ai-cost";
import { listCoachVipThreads } from "@/lib/vip";
import { tenantCapacity, type TenantCapacity } from "@/lib/entitlements";
import { CoachOnboarding } from "@/components/coach-onboarding";
import { Card, MonoLabel } from "@/components/ui";

export const metadata = { title: "Clients, Admin FitMe90" };

type Prof = {
  id: string;
  email: string | null;
  name: string | null;
  paid: boolean;
  start_date: string | null;
  medical_hold: boolean;
  medical_ack_at: string | null;
  created_at: string;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "·";

export default async function AdminClientsPage() {
  // Cloisonnement par tenant : un coach ne voit QUE ses propres clients.
  const gate = await getAdminOrNull();
  const tenantId = gate?.profile?.tenant_id ?? null;
  const admin = createAdminClient();
  const [{ data: profiles }, { data: logs }] = await Promise.all([
    tenantId
      ? admin
          .from("profiles")
          .select("id, email, name, paid, start_date, medical_hold, medical_ack_at, created_at")
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

  // Coût IA (BYOK) par client + total ; non-lus VIP par client (icône de ligne).
  const [costByUser, vipThreads, cap] = await Promise.all([
    aiCostForUsers(rows.map((p) => p.id)),
    tenantId ? listCoachVipThreads(tenantId) : Promise.resolve([]),
    tenantId ? tenantCapacity(tenantId) : Promise.resolve(null),
  ]);
  const globalCost = totalCost(costByUser);
  const unreadByClient = new Map<string, number>();
  for (const t of vipThreads) if (t.unread > 0) unreadByClient.set(t.clientId, t.unread);

  return (
    <div className="flex flex-col gap-5">
      {tenantId ? <CoachOnboarding tenantId={tenantId} /> : null}

      <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
        Clients
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <Card><Stat label="Inscrits" value={rows.length} /></Card>
        <Card><Stat label="Ont payé" value={paidCount} /></Card>
        <Card><Stat label="Programme actif" value={activeCount} /></Card>
      </div>

      {cap ? <CapacityCard cap={cap} /> : null}

      {/* Coût IA (BYOK) : dépense estimée avec les clés Anthropic du coach. */}
      <Card className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-control bg-brand/10 text-brand">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
            </svg>
          </span>
          <MonoLabel>Coût de l&apos;IA</MonoLabel>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-archivo font-extrabold text-[34px] leading-none tracking-[-0.03em] text-ink">
            {formatUsd(globalCost)}
          </span>
          <span className="text-[13px] text-muted-2">sur vos propres clés</span>
        </div>
        <p className="text-[12.5px] leading-[1.6] text-muted-2">
          Estimation cumulée de la génération, du coach IA et des recettes avec tes clés Anthropic.
          Le détail par client est en face de chaque ligne.
        </p>
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-muted-2">
                {["Client", "Statut", "Phase", "Jour", "Séances", "Coût IA", "Début", "Inscrit"].map((h) => (
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
                            title="Message VIP non lu"
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center gap-0.5 rounded-full bg-brand px-1 font-mono text-[10px] font-bold leading-none text-white"
                          >
                            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4z" />
                            </svg>
                            {unreadByClient.get(p.id)}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[12px] text-muted-2">{p.email}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.medical_hold ? (
                      <Badge tone="alert">
                        {p.medical_ack_at ? "Santé, décharge signée" : "Santé à surveiller"}
                      </Badge>
                    ) : p.paid ? (
                      <Badge tone="ok">Payé</Badge>
                    ) : (
                      <Badge tone="muted">Non payé</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body">{accessLabel(access)}</td>
                  <td className="px-4 py-3 tabular-nums text-body">
                    {access.phase === "active" ? `${access.day}/90` : "·"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-body">{sessionCount.get(p.id) ?? 0}</td>
                  <td className="px-4 py-3 tabular-nums text-body">{formatUsd(costByUser.get(p.id) ?? 0)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{fmt(p.start_date)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{fmt(p.created_at)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">Aucun client pour l&apos;instant.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[12.5px] text-muted-2">
        Données clients (RGPD), usage strictement professionnel, réservé au coach.
      </p>
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

function CapacityCard({ cap }: { cap: TenantCapacity }) {
  if (cap.unlimited) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <MonoLabel>Capacité clients</MonoLabel>
          <span className="text-[14px] text-body">
            <span className="font-semibold text-ink">Illimité</span> · {cap.used} membre{cap.used > 1 ? "s" : ""}
          </span>
        </div>
        <span className="rounded-pill border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">
          Sans limite
        </span>
      </Card>
    );
  }
  const limit = cap.limit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((cap.used / limit) * 100)) : 100;
  const left = cap.remaining ?? 0;
  return (
    <Card className={`flex flex-col gap-2 ${cap.full ? "border-alert-line bg-alert" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <MonoLabel>Capacité clients</MonoLabel>
        <span
          className={`font-archivo font-extrabold text-[18px] leading-none tracking-[-0.02em] tabular-nums ${
            cap.full ? "text-alert-ink" : "text-ink"
          }`}
        >
          {cap.used} / {limit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-2">
        <div
          className={`h-full rounded-pill ${cap.full ? "bg-alert-ink" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-[12.5px] leading-[1.6] ${cap.full ? "text-alert-ink" : "text-muted-2"}`}>
        {cap.full ? (
          <>
            Tu as atteint la capacité de ton offre. Une place se libère en supprimant un compte
            client existant, ou{" "}
            <Link href="/admin/abonnement" className="font-semibold underline underline-offset-2">
              passe à l&apos;offre supérieure
            </Link>
            .
          </>
        ) : (
          `${left} place${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}. Une place se libère en supprimant un compte client.`
        )}
      </p>
    </Card>
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
