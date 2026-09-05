// Contenu éditorial + icône partagés des templates de landing revendeur.


export const MARQUEE = [
  "Marque blanche", "Coach IA 24/7", "Programmes sur-mesure", "Nutrition auto", "Chat VIP",
  "Paiements Stripe", "Zéro code", "Revenus récurrents", "Ultra-scalable", "1er client offert",
];

export const FEATURES = [
  { icon: "chat", title: "Chat VIP premium", desc: "Garde un lien privilégié avec tes clients, sans y laisser tes soirées." },
  { icon: "card", title: "Paiements intégrés", desc: "Abonnements Stripe, tu fixes tes prix et tu encaisses directement." },
  { icon: "crm", title: "CRM & relances", desc: "Suivi, notifications, rétention automatisée. Tes clients restent, ton chiffre monte." },
  { icon: "bolt", title: "Zéro technique", desc: "Pas de code, pas de serveur, pas de maintenance. Tu vends, on gère la tech." },
  { icon: "shield", title: "Données sécurisées", desc: "Hébergement UE, chiffrement, conformité. La confiance intégrée." },
  { icon: "phone", title: "Web app installable", desc: "Tes clients ajoutent ta web app à leur écran d'accueil. Une vraie présence, à ta marque." },
];

export const SHOWCASE: { kind: "ai" | "program" | "nutrition"; tag: string; title: string; desc: string; points: string[] }[] = [
  {
    kind: "ai",
    tag: "Coach IA",
    title: "Une IA entraînée sur ta méthode, au travail 24/7",
    desc: "Elle répond à tes clients, adapte les séances, motive et relance. Comme un assistant qui ne dort jamais et ne demande pas de salaire.",
    points: ["Réponses instantanées, à ton ton", "Ajuste charges et volumes tout seul", "Relance les clients qui décrochent"],
  },
  {
    kind: "program",
    tag: "Programmes",
    title: "Ton programme complet, généré en un clic",
    desc: "Chaque client reçoit un plan personnalisé selon son objectif, son matériel et son niveau. Les cycles évoluent automatiquement.",
    points: ["Adapté au matériel réel (salle ou maison)", "Cycles progressifs, durée personnalisable", "Se régénère à la progression"],
  },
  {
    kind: "nutrition",
    tag: "Nutrition",
    title: "Nutrition, recettes et courses, 100 % automatiques",
    desc: "Macros calculées, recettes générées, liste de courses prête. Un accompagnement complet sans effort de ta part.",
    points: ["Macros par objectif", "Recettes et alternatives", "Liste de courses auto"],
  },
];

export const COMPARE_WITHOUT = [
  "Des dizaines d'heures à créer chaque programme",
  "Un développeur et des milliers d'euros pour une web app",
  "Un chiffre d'affaires plafonné par tes heures",
  "Des clients qui décrochent, sans relance",
  "Excel, PDF et messages éparpillés",
];
export const COMPARE_WITH = [
  "Programmes générés en un clic par l'IA",
  "Ta web app en ligne aujourd'hui, sans une ligne de code",
  "Une croissance scalable, revenus récurrents",
  "Relances et rétention automatisées",
  "Tout centralisé, à ta marque",
];

export const STEPS = [
  { n: "01", title: "Crée ton espace en 5 min", desc: "Nom, couleurs, logo. Ta web app est prête, en ligne, à ta marque." },
  { n: "02", title: "Invite tes clients", desc: "Un simple lien. Ils s'inscrivent, l'IA génère tout, tu gardes le contrôle." },
  { n: "03", title: "Encaisse et développe", desc: "Tes tarifs, tes abonnements, ta marge. Une croissance sans plafond." },
];

export const SECTORS = [
  { icon: "user", label: "Coachs indépendants" },
  { icon: "dumbbell", label: "Salles de sport" },
  { icon: "brand", label: "Studios & box" },
  { icon: "heart", label: "Préparateurs & kinés" },
  { icon: "phone", label: "Influenceurs fitness" },
];

export const FAQ = [
  { q: "Faut-il des compétences techniques ?", a: "Aucune. Pas de code, pas de serveur, pas de maintenance. Tu te concentres sur tes clients, on gère la technologie." },
  { q: "Combien ça coûte pour commencer ?", a: "Ton premier client est offert. Tu lances ton activité gratuitement et tu passes à une formule uniquement quand tu grandis." },
  { q: "Est-ce vraiment à ma marque ?", a: "Oui : ton logo, tes couleurs, ton nom. Tes clients vivent une expérience 100 % à ton image." },
  { q: "Puis-je fixer mes propres prix ?", a: "Totalement. Tu es libre de tes tarifs, tu vends tes abonnements et tu encaisses directement." },
  { q: "En quoi l'IA m'aide vraiment ?", a: "Elle crée les programmes, adapte la nutrition, répond aux clients et relance les inactifs. Tu démultiplies ton impact sans embaucher." },
  { q: "Combien me coûte un client en consommation IA ?", a: "Très peu. En BYOK, l'IA tourne sur ta propre clé : compte environ 1 à 2 € de consommation IA par client actif et par mois (génération du programme, coach IA au quotidien, recettes). Face à un abonnement client de plusieurs dizaines d'euros, la marge est énorme. Tu peux en plus plafonner l'usage IA par client depuis ton dashboard pour garder un coût totalement maîtrisé." },
  { q: "Mes données et celles de mes clients sont-elles protégées ?", a: "Oui : hébergement en Union Européenne, chiffrement et cloisonnement strict entre comptes." },
];

const PATHS: Record<string, string> = {
  brand: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z||M4 9h16||M8 4v5",
  ai: "M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z||M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z",
  chat: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v7a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5V15H5.5A1.5 1.5 0 0 1 4 13.5z",
  card: "M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5z||M4 10h16",
  crm: "M16 19a4 4 0 0 0-8 0||M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7||M20 19a3.5 3.5 0 0 0-4-3.4||M8 15.6A3.5 3.5 0 0 0 4 19",
  bolt: "M13 3 4 14h6l-1 7 9-11h-6l1-7z",
  shield: "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z||M9 12l2 2 4-4",
  phone: "M8 3.5h8a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5z||M10.5 18h3",
  check: "M20 6 9 17l-5-5",
  x: "M6 6l12 12M18 6 6 18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  scale: "M4 19V5||M4 19h16||M8 16V9||M12 16V6||M16 16v-4||M20 16V8",
  user: "M16 19a4 4 0 0 0-8 0||M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7",
  dumbbell: "M6.5 9.5v5||M17.5 9.5v5||M4 11v2||M20 11v2||M6.5 12h11",
  heart: "M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.5 12 20 12 20z",
  nutrition: "M12 8a4 4 0 0 0-4 4c0 3 2 7 4 7s4-4 4-7a4 4 0 0 0-4-4z||M12 8V4||M12 4c1.5 0 2.5-1 2.5-2",
};

export function Ic({ name, className }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {(PATHS[name] ?? "").split("||").map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
