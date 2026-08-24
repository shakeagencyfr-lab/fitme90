"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { recordPhoto } from "@/app/app/photos/actions";
import { Button, Alert } from "@/components/ui";

export function PhotoUploader({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { blob } = await compressImage(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("body-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const res = await recordPhoto(path);
      if (res.error) throw new Error(res.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert>{error}</Alert> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
        id="photo-input"
      />
      <Button onClick={() => inputRef.current?.click()} loading={busy} className="self-start h-11">
        Ajouter une photo
      </Button>
    </div>
  );
}
