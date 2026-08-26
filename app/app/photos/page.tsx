import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { Card, MonoLabel, Button } from "@/components/ui";
import { PhotoUploader } from "@/components/photo-uploader";
import { giveConsent } from "./actions";

export const metadata = { title: "Photos, FitMe90" };

export default async function PhotosPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/photos");
  if (!ctx.access.planViewable) redirect("/app");

  const consented = !!ctx.profile?.photo_consent_at;
  const supabase = await createClient();

  const gallery: { url: string; date: string }[] = [];
  if (consented) {
    const { data: rows } = await supabase
      .from("photos")
      .select("storage_path, taken_at")
      .eq("user_id", ctx.userId)
      .order("taken_at", { ascending: false })
      .limit(24);
    for (const r of rows ?? []) {
      const { data } = await supabase.storage
        .from("body-photos")
        .createSignedUrl(r.storage_path as string, 3600);
      if (data?.signedUrl) {
        gallery.push({ url: data.signedUrl, date: r.taken_at as string });
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        Photos de progression
      </h1>

      {!consented ? (
        <Card className="flex flex-col gap-4">
          <MonoLabel>Consentement requis</MonoLabel>
          <p className="text-[14.5px] leading-[1.6] text-body">
            Tes photos corporelles sont des données sensibles. Elles sont stockées
            de façon privée (bucket chiffré, hébergement UE), visibles seulement par
            toi via des liens temporaires, et supprimées avec ton compte. Ton
            consentement est libre et révocable.
          </p>
          <form action={giveConsent}>
            <Button type="submit" className="h-11">
              J'accepte le stockage de mes photos corporelles
            </Button>
          </form>
        </Card>
      ) : (
        <>
          <PhotoUploader userId={ctx.userId} />
          {gallery.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((p, i) => (
                <figure key={i} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt="Photo de progression"
                    className="aspect-[3/4] w-full rounded-card border border-line object-cover"
                  />
                  <figcaption className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2">
                    {new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <Card><p className="text-[14px] text-muted-2">Aucune photo pour l'instant.</p></Card>
          )}
        </>
      )}
    </div>
  );
}
