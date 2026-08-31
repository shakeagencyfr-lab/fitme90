"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setLeadMagnetEnabled, type LeadMagnetState } from "@/app/admin/actions";

export function LeadMagnetToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState(setLeadMagnetEnabled, {} as LeadMagnetState);
  const [on, setOn] = useState(enabled);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action}>
      {/* Le checkbox reflète l'état ; on soumet à chaque changement. */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name="lead_magnet_enabled"
          checked={on}
          onChange={(e) => { setOn(e.target.checked); e.currentTarget.form?.requestSubmit(); }}
          className="peer sr-only"
        />
        <span className="relative h-6 w-11 rounded-full bg-line-4 transition-colors peer-checked:bg-brand">
          <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
        </span>
        <span className="text-[14px] font-semibold text-ink">{on ? "Activé" : "Désactivé"}</span>
      </label>
    </form>
  );
}
