import { addDays, daysBetween, weekEnd } from "./dates";
import type { BodyEntry, Exercise, RoutineDay, Session, WeightLog } from "./types";

export interface WeekData {
  days: RoutineDay[];
  exercises: Exercise[];
  sessions: Session[];
  logs: WeightLog[];
  body: BodyEntry[];
  measureNames: string[];
}

export interface ExerciseRow {
  exercise: Exercise;
  max: number | null; // máximo del período, sin decir qué día
  previous: number | null; // máximo del último período anterior con dato
  delta: number | null;
}

export interface DayBlock {
  day: RoutineDay;
  rows: ExerciseRow[];
}

export interface MeasureRow {
  name: string;
  value: number | null;
  previous: number | null;
  delta: number | null;
}

/** Resumen de un período cualquiera (una semana de lunes a domingo o un rango libre). */
export interface WeekReport {
  start: string;
  end: string;
  /** Cantidad de fechas distintas en las que se entrenó. */
  trainedDays: number;
  weights: { date: string; weightKg: number }[];
  avgWeight: number | null;
  previousAvgWeight: number | null;
  weightDelta: number | null;
  measures: MeasureRow[];
  blocks: DayBlock[];
}

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

const diff = (a: number | null, b: number | null) => (a !== null && b !== null ? round(a - b, 2) : null);

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function avgWeightOf(body: BodyEntry[], from: string, to: string): number | null {
  const vals = body.filter((b) => inRange(b.date, from, to) && b.weightKg !== null).map((b) => b.weightKg as number);
  return vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length, 2) : null;
}

/**
 * Resumen del período [start, end]. El "anterior" se mide con ventanas del mismo largo hacia atrás:
 * en una semana de lunes a domingo coincide con la semana anterior.
 */
export function buildRangeReport(start: string, end: string, data: WeekData): WeekReport {
  const length = daysBetween(start, end) + 1;
  const periodLogs = data.logs.filter((l) => inRange(l.date, start, end));
  const periodSessions = data.sessions.filter((s) => s.done && inRange(s.date, start, end));

  // Días con actividad: entrenados o con algún peso cargado.
  const activeDayIds = new Set<string>([...periodSessions.map((s) => s.dayId), ...periodLogs.map((l) => l.dayId)]);

  const blocks: DayBlock[] = data.days
    .filter((d) => activeDayIds.has(d.id))
    .sort((a, b) => a.order - b.order)
    .map((day) => {
      const dayExercises = data.exercises
        .filter((e) => e.dayId === day.id)
        .filter((e) => !e.archived || periodLogs.some((l) => l.exerciseId === e.id))
        .sort((a, b) => a.order - b.order);
      const rows = dayExercises.map((exercise): ExerciseRow => {
        const mine = periodLogs.filter((l) => l.exerciseId === exercise.id);
        const max = mine.length ? Math.max(...mine.map((l) => l.weightKg)) : null;
        // Con la alternancia pierna/hombro hay períodos sin dato: se compara con la última ventana que sí tuvo.
        const earlier = data.logs.filter((l) => l.exerciseId === exercise.id && l.date < start);
        let previous: number | null = null;
        if (earlier.length) {
          const lastDate = earlier.map((l) => l.date).sort().at(-1) as string;
          const k = Math.ceil(daysBetween(lastDate, start) / length);
          const from = addDays(start, -k * length);
          const to = addDays(start, -(k - 1) * length - 1);
          previous = Math.max(...earlier.filter((l) => inRange(l.date, from, to)).map((l) => l.weightKg));
        }
        return { exercise, max, previous, delta: diff(max, previous) };
      });
      return { day, rows };
    });

  const weights = data.body
    .filter((b) => inRange(b.date, start, end) && b.weightKg !== null)
    .map((b) => ({ date: b.date, weightKg: b.weightKg as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const avgWeight = avgWeightOf(data.body, start, end);
  const previousAvgWeight = avgWeightOf(data.body, addDays(start, -length), addDays(start, -1));

  const measures: MeasureRow[] = data.measureNames.map((name) => {
    const withValue = data.body.filter((b) => b.measures[name] !== undefined).sort((a, b) => a.date.localeCompare(b.date));
    const current = withValue.filter((b) => inRange(b.date, start, end)).at(-1);
    const before = withValue.filter((b) => b.date < start).at(-1);
    const value = current ? (current.measures[name] as number) : null;
    const previous = before ? (before.measures[name] as number) : null;
    return { name, value, previous, delta: diff(value, previous) };
  });

  return {
    start,
    end,
    trainedDays: new Set(periodSessions.map((s) => s.date)).size,
    weights,
    avgWeight,
    previousAvgWeight,
    weightDelta: diff(avgWeight, previousAvgWeight),
    measures,
    blocks,
  };
}

/** Semana de lunes a domingo que arranca en `start`. */
export function buildWeekReport(start: string, data: WeekData): WeekReport {
  return buildRangeReport(start, weekEnd(start), data);
}
