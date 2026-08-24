import "server-only";
import type { Plan } from "@/lib/program";
import { PRODUCT_NAME, COACH_CREDENTIAL } from "@/lib/config";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Construit le HTML imprimable du programme (utilisé par la route PDF). */
export function buildProgramHtml(plan: Plan, name?: string): string {
  const n = plan.nutrition;
  const cycles = plan.cycles
    .map(
      (c) =>
        `<div class="cyc"><div class="ck">${esc(c.label)} · ${esc(c.weeks)}</div><div class="cn">${esc(c.name)}</div><p>${esc(c.body)}</p></div>`,
    )
    .join("");
  const week = plan.weekPlan
    .map(
      (d) =>
        `<tr><td>${esc(d.day)}</td><td>${esc(d.rest ? "Repos" : d.name)}</td><td>${esc(d.dur)}</td></tr>`,
    )
    .join("");
  const meals = n.meals
    .map(
      (m) =>
        `<div class="meal"><div class="mh">${esc(m.time)} · ${esc(m.name)} <span>${esc(m.kcal)} kcal</span></div><table>${m.items
          .map((i) => `<tr><td>${esc(i.food)}</td><td>${esc(i.qty)}</td></tr>`)
          .join("")}</table></div>`,
    )
    .join("");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>
  * { box-sizing:border-box; font-family: Arial, Helvetica, sans-serif; color:#17191B; }
  body { margin:0; padding:28px 34px; }
  h1 { font-size:26pt; letter-spacing:-0.02em; margin:0 0 4px; }
  h2 { font-size:14pt; border-bottom:2px solid #17191B; padding-bottom:3px; margin:22px 0 10px; }
  .sub { color:#6D6B65; font-size:10pt; margin-bottom:6px; }
  table { width:100%; border-collapse:collapse; font-size:10pt; }
  td { padding:4px 6px; border-bottom:1px solid #E3E1DC; }
  .cyc { margin-bottom:8px; } .ck { color:#E0551F; font-size:9pt; text-transform:uppercase; letter-spacing:0.08em; }
  .cn { font-weight:700; font-size:12pt; }
  .meal { margin-bottom:5mm; } .mh { font-weight:600; font-size:11pt; margin-bottom:1mm; } .mh span { float:right; color:#E0551F; }
  .warn { background:#FFF4EE; border:1px solid #F6D6C4; color:#5A3427; padding:8px 10px; font-size:9.5pt; border-radius:6px; margin-top:14px; }
  .foot { margin-top:20px; color:#8A8880; font-size:8.5pt; }
</style></head><body>
  <h1>${esc(PRODUCT_NAME)} — Programme 90 jours</h1>
  <div class="sub">${name ? esc(name) + " · " : ""}Conçu par ${esc(COACH_CREDENTIAL)}</div>
  <p>${esc(plan.summary)}</p>
  <h2>Les trois cycles</h2>${cycles}
  <h2>Semaine type</h2><table><tr><td><b>Jour</b></td><td><b>Séance</b></td><td><b>Durée</b></td></tr>${week}</table>
  <h2>Nutrition — journée de référence</h2>
  <table>
    <tr><td>Calories (jour d'entraînement)</td><td>${esc(n.kcal)} kcal</td></tr>
    <tr><td>Protéines</td><td>${esc(n.protein)} g</td></tr>
    <tr><td>Glucides</td><td>${esc(n.carbs)} g</td></tr>
    <tr><td>Lipides</td><td>${esc(n.fat)} g</td></tr>
  </table>
  <p style="font-size:9.5pt;color:#6D6B65;">Les jours sans entraînement : environ 10 % de calories en moins, glucides réduits, protéines maintenues. Les allergènes déclarés sont exclus de toutes les propositions.</p>
  ${meals}
  ${plan.warning ? `<div class="warn">${esc(plan.warning)}</div>` : ""}
  <div class="warn">Accompagnement sportif et de bien-être, sans visée médicale. Ne remplace pas un avis médical : consulte un médecin en cas de pathologie, de grossesse ou de blessure.</div>
  <div class="foot">${esc(PRODUCT_NAME)} · Document personnel, ne pas diffuser.</div>
</body></html>`;
}
