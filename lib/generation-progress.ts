// Progression affichée pendant l'écriture du programme. Pur, testable.
//
// LE PROBLÈME QU'ELLE RÈGLE. La barre avançait d'un cran toutes les deux
// secondes sur six étapes, plafonnées à 92 %. Elle atteignait donc 92 % en dix
// secondes, puis restait figée là pendant les deux à quatre minutes que prend
// réellement la génération en Opus. Le client en concluait, très logiquement,
// que ça avait planté, et rechargeait la page au pire moment.
//
// Le temps écoulé est la seule information honnête dont dispose le navigateur :
// il ne sait pas où en est le modèle. On l'utilise donc pour une progression
// qui ralentit sans jamais s'arrêter et n'atteint jamais 100 % toute seule.
// Seule l'arrivée du programme met la barre à 100 %.

/** Constante de temps : à 95 s, la barre est aux deux tiers environ. */
const TAU = 95;

/** Plafond avant la fin réelle. Une barre à 100 % qui attend encore ment. */
const PLAFOND = 99;

/**
 * Pourcentage affiché après `elapsed` secondes.
 *
 * Courbe asymptotique : ~29 % à 30 s, ~65 % à 1 min 40, ~86 % à 3 min,
 * ~94 % à 5 min. Elle bouge encore à la dixième minute, ce qui est le point.
 */
export function generationPct(elapsed: number, done = false): number {
  if (done) return 100;
  const t = Math.max(0, elapsed);
  return Math.min(PLAFOND, Math.round(PLAFOND * (1 - Math.exp(-t / TAU))));
}

/**
 * Index de l'étape en cours, du même temps écoulé. Environ 40 secondes par
 * étape : six étapes couvrent les quatre premières minutes, la dernière reste
 * allumée au-delà plutôt que de laisser la liste sans étape courante.
 */
export function generationStep(elapsed: number, total: number, done = false): number {
  if (total <= 0) return 0;
  if (done) return total - 1;
  return Math.min(total - 1, Math.max(0, Math.floor(elapsed / 40)));
}
