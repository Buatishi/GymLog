import { addDays, weeksBetween, weekStart } from "./dates";
import type { RoutineDay, Variant } from "./types";

/** Variante activa de la semana de `date`: alterna A/B cada semana a partir del ancla. */
export function activeVariant(date: string, anchorMonday: string): Variant {
  const n = weeksBetween(weekStart(anchorMonday), weekStart(date));
  return Math.abs(n) % 2 === 0 ? "A" : "B";
}

/** Ancla nueva para que la variante activa de la semana de `date` sea `want`. */
export function anchorFor(date: string, want: Variant): string {
  const monday = weekStart(date);
  // Con el ancla en el lunes de esa semana la activa es A; para B se corre una semana.
  return want === "A" ? monday : addDays(monday, -7);
}

/** Días que se ofrecen en la semana de `date`: los fijos + la variante activa de cada slot alternado. */
export function daysForWeek(days: RoutineDay[], date: string, anchorMonday: string): RoutineDay[] {
  const v = activeVariant(date, anchorMonday);
  return days
    .filter((d) => !d.archived && (d.variant === null || d.variant === v))
    .sort((a, b) => a.order - b.order);
}

/** La otra variante del mismo slot, si existe. */
export function siblingOf(days: RoutineDay[], day: RoutineDay): RoutineDay | undefined {
  if (day.variant === null) return undefined;
  return days.find((d) => !d.archived && d.slot === day.slot && d.variant !== null && d.id !== day.id);
}
