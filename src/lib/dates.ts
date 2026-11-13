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

/** Cantidad de días entre dos fechas (negativa si `to` es anterior). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to) - parse(from)) / DAY_MS);
}

/** 0 = lunes … 6 = domingo. */
export function weekdayIndex(iso: string): number {
  return (new Date(parse(iso)).getUTCDay() + 6) % 7;
}

const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "lunes 9 de noviembre" */
export function formatLong(iso: string): string {
  const [, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${WEEKDAYS_LONG[new Date(parse(iso)).getUTCDay()]} ${d} de ${MONTHS_LONG[m - 1]}`;
}

/** "lun", "mar"… */
export function weekdayShort(iso: string): string {
  return WEEKDAYS[new Date(parse(iso)).getUTCDay()] as string;
}

/** "9 nov – 15 nov" para cualquier rango. */
export function formatSpan(from: string, to: string): string {
  return `${formatShort(from)} – ${formatShort(to)}`;
}
