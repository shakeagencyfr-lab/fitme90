// Compression d'image côté navigateur (JPEG, 760–900 px) avant upload.
// Divise le poids par ~10 (README étape 6). Utilisé par les photos de salle
// et les photos envoyées au coach.
export async function compressImage(
  file: File,
  maxPx = 880,
  quality = 0.82,
): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression échouée."))),
      "image/jpeg",
      quality,
    ),
  );
  return { blob, dataUrl };
}

/** Extrait la partie base64 d'un data URL (pour l'envoi aux routes IA). */
export function base64Of(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}
