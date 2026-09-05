/**
 * Le nom qu'on affiche pour un client, et le repli quand il manque.
 *
 * Un client inscrit par lien de parrainage ou par un coach n'a pas encore
 * rempli le questionnaire, donc pas de prénom. La liste montrait alors un
 * point, qui se lisait comme un bug. La partie locale de l'e-mail dit au
 * moins de qui il s'agit, et le libellé final ne ment jamais.
 */
export function clientDisplayName(name: string | null | undefined, email: string | null | undefined, fallback = "Client"): string {
  const n = (name ?? "").trim();
  if (n) return n;
  const e = (email ?? "").trim();
  const at = e.indexOf("@");
  const local = at > 0 ? e.slice(0, at) : "";
  return local || fallback;
}
