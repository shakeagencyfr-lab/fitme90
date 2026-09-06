import Link from "next/link";
import { fmtLocale, tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { listProspects, leadMagnetEnabled, prospectFollowupEnabled, prospectFollowupCopy } from "@/lib/prospects";
import { followupDefaultCopies } from "@/lib/prospect-followup";
import { tenantLocale } from "@/lib/i18n/server";
import { asLocale } from "@/lib/i18n";
import { FollowupEditor } from "@/components/followup-editor";
import { GOAL_LABEL, LEVEL_LABEL, EQUIP_LABEL, isGoal, isLevel, isEquipment } from "@/lib/lead-magnet";
import { SITE_URL } from "@/lib/config";
import { LeadMagnetToggle } from "@/components/lead-magnet-toggle";
import { updateProspectStatus, removeProspect } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Prospects" };
export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(fmtLocale(), { day: "2-digit", month: "short", year: "numeric" });

const STATUS_STYLE: Record<string, string> = {
  nouveau: "bg-brand/10 text-brand",
  "contacté": "border border-line-4 text-body-2",
  converti: "bg-[#3FBF6A]/15 text-[#2e8c4e]",
  "ignoré": "border border-line-4 text-muted-2",
};

export default async function AdminProspectsPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  if (!tenantId) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">{tx("Prospects")}</h1>
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      </div>
    );
  }

  const [prospects, enabled, followups, textes, langue, { data: t }] = await Promise.all([
    listProspects(tenantId),
    leadMagnetEnabled(tenantId),
    prospectFollowupEnabled(tenantId),
    prospectFollowupCopy(tenantId),
    tenantLocale(tenantId),
    createAdminClient().from("tenants").select("slug, name").eq("id", tenantId).maybeSingle<{ slug: string; name: string }>(),
  ]);
  const slug = t?.slug ?? null;
  const parDefaut = followupDefaultCopies(asLocale(langue));
  const link = slug ? `${SITE_URL || ""}/c/${slug}/decouverte` : null;
  const nouveaux = prospects.filter((p) => p.status === "nouveau").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">{tx("Prospects")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {tx("Active un mini-programme gratuit sur ta page : les personnes intéressées laissent leurs coordonnées, reçoivent une semaine découverte en PDF, et atterrissent ici comme prospects.")}</p>
      </div>

      {/* Réglage du lead magnet */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="font-archivo font-bold text-[16px] text-ink">{tx("Mini-programme gratuit (lead magnet)")}</div>
            <p className="text-[13px] text-muted">{tx("Affiché sur ta page publique quand il est activé.")}</p>
          </div>
          <LeadMagnetToggle enabled={enabled} />
        </div>
        {enabled ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-2 pt-4">
            <div className="flex max-w-[52ch] flex-col gap-0.5">
              <div className="font-archivo font-bold text-[15px] text-ink">{tx("Relancer automatiquement")}</div>
              <p className="text-[13px] leading-[1.6] text-muted">
                {tx("Trois e-mails espacés après le téléchargement : un conseil à J+3, un bilan de la semaine à J+8, une dernière proposition à J+17. Envoyés à ta marque, avec un lien de désabonnement. On s'arrête dès qu'un prospect devient client.")}</p>
            </div>
            <LeadMagnetToggle enabled={followups} name="prospect_followup_enabled" />
          </div>
        ) : null}
        {/* Les textes ne s'affichent QUE si la séquence est active : montrer
            trois éditeurs pour des messages qui ne partiront jamais donne
            l'impression d'un réglage sans effet. */}
        {enabled && followups ? (
          <FollowupEditor defaults={parDefaut} saved={textes} brand={t?.name ?? "Ta marque"} />
        ) : null}
        {enabled && link ? (
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{tx("Lien direct à partager")}</span>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-control border border-line-4 bg-surface-2 px-3 py-1.5 font-mono text-[12.5px] text-body">{link}</code>
              <Link href={`/c/${slug}/decouverte`} target="_blank" className="text-[13px] font-semibold text-brand hover:underline">{tx("Ouvrir ↗")}</Link>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Liste des prospects */}
      <div className="flex items-center justify-between">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Mes prospects")}</div>
        <span className="text-[12.5px] text-muted-2">{prospects.length} {tx("au total ·")} {nouveaux} {tx("nouveau")}{nouveaux > 1 ? "x" : ""}</span>
      </div>

      {prospects.length === 0 ? (
        <Alert tone="info">{tx("Aucun prospect pour l'instant. Active le mini-programme et partage ton lien.")}</Alert>
      ) : (
        <div className="flex flex-col gap-3">
          {prospects.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-archivo font-bold text-[16px] text-ink">{p.name}</span>
                    <span className={`rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${STATUS_STYLE[p.status] ?? STATUS_STYLE.nouveau}`}>{p.status}</span>
                  </div>
                  <a href={`mailto:${p.email}`} className="text-[13.5px] text-brand hover:underline">{p.email}</a>
                  <span className="text-[12.5px] text-muted">
                    {[p.goal && isGoal(p.goal) ? GOAL_LABEL[p.goal] : null,
                      p.level && isLevel(p.level) ? LEVEL_LABEL[p.level] : null,
                      p.days ? `${p.days} séances/sem` : null,
                      p.equipment && isEquipment(p.equipment) ? EQUIP_LABEL[p.equipment] : null,
                    ].filter(Boolean).join(" · ")}
                  </span>
                  <span className="text-[12px] text-muted-2">{tx("Reçu le")} {fmtDate(p.created_at)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line-2 pt-3">
                {(["contacté", "converti", "ignoré"] as const).filter((s) => s !== p.status).map((s) => (
                  <form key={s} action={updateProspectStatus}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value={s} />
                    <button type="submit" className="tap rounded-btn border border-line-4 px-3 py-1.5 text-[12.5px] font-semibold text-body hover:border-ink">
                      {tx("Marquer «")} {s} »
                    </button>
                  </form>
                ))}
                <form action={removeProspect} className="ml-auto">
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="tap rounded-btn border border-alert-line bg-alert px-3 py-1.5 text-[12.5px] font-semibold text-alert-ink hover:border-brand">
                    {tx("Supprimer")}</button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
