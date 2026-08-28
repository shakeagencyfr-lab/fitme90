import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAccess, accessLabel } from "@/lib/access";
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
  const admin = createAdminClient();
  const [{ data: profiles }, { data: logs }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, name, paid, start_date, medical_hold, medical_ack_at, created_at")
      .order("created_at", { ascending: false })
      .returns<Prof[]>(),
    admin.from("session_logs").select("user_id").returns<{ user_id: string }[]>(),
  ]);

  const rows = profiles ?? [];
  const sessionCount = new Map<string, number>();
  for (const l of logs ?? []) sessionCount.set(l.user_id, (sessionCount.get(l.user_id) ?? 0) + 1);

  const withAccess = rows.map((p) => ({ p, access: computeAccess(p.paid, p.start_date) }));
  const paidCount = rows.filter((p) => p.paid).length;
  const activeCount = withAccess.filter((r) => r.access.phase === "active").length;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
        Clients
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <Card><Stat label="Inscrits" value={rows.length} /></Card>
        <Card><Stat label="Ont payé" value={paidCount} /></Card>
        <Card><Stat label="Programme actif" value={activeCount} /></Card>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-muted-2">
                {["Client", "Statut", "Phase", "Jour", "Séances", "Début", "Inscrit"].map((h) => (
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
                      <div className="font-semibold text-ink group-hover:text-brand group-hover:underline">
                        {p.name || "·"}
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
                  <td className="px-4 py-3 tabular-nums text-muted">{fmt(p.start_date)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{fmt(p.created_at)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">Aucun client pour l&apos;instant.</td>
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
