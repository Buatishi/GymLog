/** Fechas como "YYYY-MM-DD" en hora local. Toda la aritmética va en UTC para evitar saltos de horario. */
const DAY_MS = 86_400_000;

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

function parse(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function format(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function addDays(iso: string, n: number): string {
  return format(parse(iso) + n * DAY_MS);
}

/** Lunes de la semana a la que pertenece `iso` (la semana va de lunes a domingo). */
export function weekStart(iso: string): string {
  const dow = new Date(parse(iso)).getUTCDay(); // 0 = domingo
  return addDays(iso, -((dow + 6) % 7));
}

export function weekEnd(start: string): string {
  return addDays(start, 6);
}

export function weeksBetween(fromMonday: string, toMonday: string): number {
  return Math.round((parse(toMonday) - parse(fromMonday)) / (7 * DAY_MS));
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function formatShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatWithWeekday(iso: string): string {
  const dow = new Date(parse(iso)).getUTCDay();
  return `${WEEKDAYS[dow]} ${formatShort(iso)}`;
}

export function formatRange(start: string): string {
  return `${formatShort(start)} – ${formatShort(weekEnd(start))}`;
}
