"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addCoachNote, type NoteState } from "@/app/admin/actions";
import { Button, Alert } from "@/components/ui";

export function CoachNoteForm({ clientId }: { clientId: string }) {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(addCoachNote, {} as NoteState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="client_id" value={clientId} />
      <textarea
        name="body"
        rows={3}
        maxLength={4000}
        placeholder={tx("Note privée (visible de toi seul) : objectifs, remarques, points de suivi…")}
        className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
      />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" loading={pending} className="self-start h-10">
        {tx("Ajouter la note")}</Button>
    </form>
  );
}
