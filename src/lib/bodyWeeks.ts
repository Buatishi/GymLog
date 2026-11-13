import { addDays, weekEnd, weekStart } from "./dates";
import type { BodyEntry } from "./types";

export interface BodyMeasureRow {
  name: string;
  count: number; // mediciones en la semana
  last: number | null; // última de la semana
  delta: number | null; // contra la última medición anterior a la semana
}

/** Peso corporal y medidas de una semana de lunes a domingo. */
export interface BodyWeekRow {
  start: string;
  weightCount: number;
  avgWeight: number | null;
  /** Contra el promedio de la última semana anterior que tuvo pesajes. */
  weightDelta: number | null;
  measures: BodyMeasureRow[];
}

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

function avgWeightOfWeek(body: BodyEntry[], start: string): { avg: number | null; count: number } {
  const end = weekEnd(start);
  const vals = body.filter((b) => b.date >= start && b.date <= end && b.weightKg !== null).map((b) => b.weightKg as number);
  return { avg: vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, count: vals.length };
}

/** Resumen de cada semana pedida (por ejemplo para ver si ya te pesaste y medís esta semana). */
export function bodyWeekRows(starts: string[], body: BodyEntry[], measureNames: string[]): BodyWeekRow[] {
  return starts.map((start) => {
    const end = weekEnd(start);
    const { avg, count } = avgWeightOfWeek(body, start);

    const earlierWeights = body.filter((b) => b.date < start && b.weightKg !== null).map((b) => b.date);
    let previousAvg: number | null = null;
    if (earlierWeights.length) previousAvg = avgWeightOfWeek(body, weekStart(earlierWeights.sort().at(-1) as string)).avg;

    const measures = measureNames.map((name): BodyMeasureRow => {
      const sorted = body.filter((b) => b.measures[name] !== undefined).sort((a, b) => a.date.localeCompare(b.date));
      const inWeek = sorted.filter((b) => b.date >= start && b.date <= end);
      const last = inWeek.length ? (inWeek.at(-1)?.measures[name] as number) : null;
      const before = sorted.filter((b) => b.date < start).at(-1);
      const previous = before ? (before.measures[name] as number) : null;
      return { name, count: inWeek.length, last, delta: last !== null && previous !== null ? round(last - previous) : null };
    });

    return { start, weightCount: count, avgWeight: avg, weightDelta: avg !== null && previousAvg !== null ? round(avg - previousAvg) : null, measures };
  });
}

/** La última medición cargada antes de `date` (para sugerir de dónde partir al cargar un valor nuevo). */
export function lastBefore(body: BodyEntry[], date: string, pick: (b: BodyEntry) => number | null | undefined): { date: string; value: number } | null {
  let best: { date: string; value: number } | null = null;
  for (const b of body) {
    if (b.date >= date) continue;
    const v = pick(b);
    if (v === null || v === undefined) continue;
    if (!best || b.date > best.date) best = { date: b.date, value: v };
  }
  return best;
}

/** Lunes de las semanas anteriores a `from` (más nueva primero), para armar el historial. */
export function previousWeekStarts(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(weekStart(from), -7 * i));
}
