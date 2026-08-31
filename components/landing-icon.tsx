// Icône ligne paramétrable par nom (chemins « d » séparés par "||").
// Utilisée par les nouvelles landings (revendeur, opportunité, plateforme).

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
  rocket: "M5 15c-1 1-1.5 4-1.5 4s3-.5 4-1.5a2.1 2.1 0 0 0-2.5-2.5z||M9 15l-3-3c1-4 4-8 9-9 1 5-3 8-6 9z||M14.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
  chart: "M4 19V5||M4 19h16||M8 16l3-4 3 2 4-6",
  layers: "M12 4l8 4-8 4-8-4z||M4 12l8 4 8-4||M4 16l8 4 8-4",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18||M3 12h18||M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9",
  tag: "M4 9V6a2 2 0 0 1 2-2h3l9 9-5 5-9-9z||M8.5 8.5h.01",
  infinity: "M6.5 9a3 3 0 1 0 0 6c2 0 3.5-3 5.5-3s3.5 3 5.5 3a3 3 0 1 0 0-6c-2 0-3.5 3-5.5 3S8.5 9 6.5 9z",
  sparkle: "M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5z",
};

export function LIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {(PATHS[name] ?? "").split("||").map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
