import { addDays, weekEnd, weekStart } from "./dates";
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
  max: number | null; // máximo de la semana, sin decir qué día
  previous: number | null; // máximo de la última semana anterior con dato
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

export interface WeekReport {
  start: string;
  end: string;
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

export function buildWeekReport(start: string, data: WeekData): WeekReport {
  const end = weekEnd(start);
  const weekLogs = data.logs.filter((l) => inRange(l.date, start, end));
  const weekSessions = data.sessions.filter((s) => s.done && inRange(s.date, start, end));

  // Días con actividad: entrenados o con algún peso cargado.
  const activeDayIds = new Set<string>([...weekSessions.map((s) => s.dayId), ...weekLogs.map((l) => l.dayId)]);

  const blocks: DayBlock[] = data.days
    .filter((d) => activeDayIds.has(d.id))
    .sort((a, b) => a.order - b.order)
    .map((day) => {
      const dayExercises = data.exercises
        .filter((e) => e.dayId === day.id)
        .filter((e) => !e.archived || weekLogs.some((l) => l.exerciseId === e.id))
        .sort((a, b) => a.order - b.order);
      const rows = dayExercises.map((exercise): ExerciseRow => {
        const mine = weekLogs.filter((l) => l.exerciseId === exercise.id);
        const max = mine.length ? Math.max(...mine.map((l) => l.weightKg)) : null;
        // Con la alternancia pierna/hombro hay semanas sin dato: se compara con la última que sí tuvo.
        const earlier = data.logs.filter((l) => l.exerciseId === exercise.id && l.date < start);
        let previous: number | null = null;
        if (earlier.length) {
          const lastDate = earlier.map((l) => l.date).sort().at(-1) as string;
          const from = weekStart(lastDate);
          const to = weekEnd(from);
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
  const previousAvgWeight = avgWeightOf(data.body, addDays(start, -7), addDays(start, -1));

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
    trainedDays: new Set(weekSessions.map((s) => s.dayId)).size,
    weights,
    avgWeight,
    previousAvgWeight,
    weightDelta: diff(avgWeight, previousAvgWeight),
    measures,
    blocks,
  };
}
