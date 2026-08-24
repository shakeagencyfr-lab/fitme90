// Logotype FitMe90 (README : Archivo 800, le « 90 » en accent).
export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span
      className="font-archivo font-extrabold tracking-[-0.02em] text-ink"
      style={{ fontSize: size }}
    >
      FitMe<span className="text-brand">90</span>
    </span>
  );
}
