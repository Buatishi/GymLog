/** Número con coma decimal y sin ceros de más: 85,5 · 92 · 84,17 */
export function fmt(n: number | null, unit = ""): string {
  if (n === null) return "-";
  const s = String(Math.round(n * 100) / 100).replace(".", ",");
  return unit ? `${s} ${unit}` : s;
}

/** Diferencia con signo explícito (ASCII: la fuente base de los PDF no trae el menos tipográfico). */
export function fmtDelta(n: number | null, unit = ""): string {
  if (n === null) return "-";
  if (n === 0) return unit ? `0 ${unit}` : "0";
  return `${n > 0 ? "+" : "-"}${fmt(Math.abs(n), unit)}`;
}
